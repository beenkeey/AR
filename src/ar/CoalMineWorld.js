import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createBelAZ } from '../assets/BelAZ.js';
import { createMiningDrone } from '../assets/MiningDrone.js';
import { createExcavator, tickExcavator } from '../assets/Excavator.js';
import { createQuarryTerrain } from './QuarryTerrain.js';
import { buildHaulLoop } from './HaulRoad.js';
import { coalDigSites } from './CoalSeams.js';
import { surfaceTexture } from '../assets/finishMaps.js';

const WEAK = CONFIG.performance.weak;
const FOG = 0xa8c8e8;
const _fwd = new THREE.Vector3();
const _look = new THREE.Vector3();
const _targetQ = new THREE.Quaternion();
const _eyeWorld = new THREE.Vector3();

/**
 * Automated coal open-pit. BelAZ only on haul roads; buildings on the rim.
 */
export class CoalMineWorld {
  constructor(scene) {
    this.scene = scene;
    this.drones = [];
    this.trucks = [];
    this.excavators = [];
    this.followTruck = null;
    this._skyMats = [];
    this._time = 0;
    this._quarryOrigin = new THREE.Vector3(
      0,
      0,
      -CONFIG.exhibition.distance * 0.55,
    );
    this._build();
  }

  _build() {
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 110, 400);

    this.scene.add(this._sky());
    this.scene.add(this._rimPlateau());

    this.terrain = createQuarryTerrain({
      rimR: 78,
      segs: WEAK ? 56 : 128,
      rings: WEAK ? 48 : 80,
    });
    this.terrain.position.copy(this._quarryOrigin);
    this.scene.add(this.terrain);

    this._addRimInfrastructure();
    this._addBelAZs();
    this._addDrones();
    this._addBenchExcavators();
  }

  _sky() {
    const geo = new THREE.SphereGeometry(420, WEAK ? 20 : 32, WEAK ? 14 : 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform float uTime;
        void main() {
          vec3 n = normalize(vDir);
          float h = n.y;
          vec3 zenith = vec3(0.32, 0.58, 0.88);
          vec3 mid = vec3(0.55, 0.76, 0.94);
          vec3 horizon = vec3(0.96, 0.84, 0.62);
          vec3 col = mix(horizon, mid, smoothstep(-0.04, 0.3, h));
          col = mix(col, zenith, smoothstep(0.2, 0.95, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'CoalSky';
    mesh.frustumCulled = false;
    this._skyMats.push(mat);
    return mesh;
  }

  _rimPlateau() {
    const group = new THREE.Group();
    group.name = 'QuarryRim';
    const dirt = surfaceTexture('dirt');
    if (dirt) dirt.repeat.set(32, 32);
    const soil = new THREE.MeshStandardMaterial({
      color: dirt ? 0xffffff : 0xb88955,
      map: dirt,
      roughness: 0.96,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(new THREE.RingGeometry(78, 260, WEAK ? 40 : 64), soil);
    ground.rotation.x = -Math.PI / 2;
    ground.position.copy(this._quarryOrigin);
    ground.position.y = 0.01;
    ground.receiveShadow = true;
    group.add(ground);
    return group;
  }

  /** Base cluster on +X rim plateau only (r ≥ 95), clear of haul roads. */
  _addRimInfrastructure() {
    const group = new THREE.Group();
    group.name = 'RimInfrastructure';
    group.position.copy(this._quarryOrigin);

    const concrete = mat(0xb4aea4, 0.08, 0.8);
    const yellow = mat(0xf0c000, 0.15, 0.45);
    const teal = mat(0x1a7a8c, 0.25, 0.4);
    const dark = mat(0x2a3038, 0.35, 0.45);
    const orange = mat(0xe86a12, 0.15, 0.48);
    const coal = mat(0x2a2622, 0.05, 0.92);
    const metal = mat(0x8a949c, 0.5, 0.35);

    // Pad under the whole base
    box(group, concrete, 108, 0.12, 6, 42, 0.24, 36);

    // Crusher block — grounded (center Y = half height)
    box(group, concrete, 100, 4.5, -4, 9, 9, 9);
    box(group, orange, 100, 9.2, -4, 9.4, 0.4, 9.4);
    box(group, yellow, 100, 5.5, 0.7, 5.5, 3.5, 0.25);
    box(group, teal, 100, 10.8, -4, 1.8, 2.8, 1.8);

    // Control tower next to crusher (same side, not opposite rim)
    box(group, concrete, 112, 6, 14, 7, 12, 7);
    box(group, teal, 112, 12.3, 14, 7.4, 0.4, 7.4);
    box(group, yellow, 112, 9.5, 17.6, 4.5, 2.5, 0.2);
    box(group, dark, 112, 14.2, 14, 0.28, 3.2, 0.28);

    // Short conveyor on the pad (does not reach haul roads)
    const conv = new THREE.Group();
    box(conv, metal, 0, 0, 0, 16, 0.4, 1.4);
    box(conv, dark, 0, 0.28, 0, 15.5, 0.1, 1.05);
    for (let i = -6; i <= 6; i += 3) {
      box(conv, yellow, i, -0.7, 0.65, 0.18, 1.3, 0.18);
      box(conv, yellow, i, -0.7, -0.65, 0.18, 1.3, 0.18);
    }
    conv.position.set(104, 2.4, 4);
    conv.rotation.y = 0.35;
    group.add(conv);

    // Angular coal heaps (not spheres)
    for (const [x, z, sx, sy, sz] of [
      [118, -8, 8, 3.2, 6],
      [122, 4, 6, 2.6, 5],
      [116, 22, 7, 3.0, 5.5],
    ]) {
      box(group, coal, x, sy * 0.5, z, sx, sy, sz);
      box(group, coal, x + 1.5, sy * 0.35, z - 1.2, sx * 0.6, sy * 0.7, sz * 0.7);
    }

    // Silos on the same side
    for (const [x, z] of [[124, 12], [128, 20]]) {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 8, 14), metal);
      silo.position.set(x, 4.0, z);
      group.add(silo);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.35, 14), orange);
      cap.position.set(x, 8.2, z);
      group.add(cap);
    }

    // Light masts around the base cluster
    for (const [x, z] of [[96, 28], [120, 30], [96, -22], [124, -16]]) {
      box(group, dark, x, 5.5, z, 0.28, 11, 0.28);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.35, 0.85),
        new THREE.MeshStandardMaterial({
          color: 0xffe08a,
          emissive: 0xffc056,
          emissiveIntensity: 1.05,
          roughness: 0.4,
        }),
      );
      lamp.position.set(x, 11.2, z);
      group.add(lamp);
      const pl = new THREE.PointLight(0xffd090, 1.4, 38, 1.8);
      pl.position.set(x, 10.8, z);
      group.add(pl);
    }

    // Safety berm around pit rim
    const berm = new THREE.Mesh(
      new THREE.TorusGeometry(79.5, 0.7, 8, WEAK ? 40 : 64),
      mat(0x2faf55, 0.1, 0.5),
    );
    berm.rotation.x = Math.PI / 2;
    berm.position.y = 0.4;
    group.add(berm);

    group.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });
    this.scene.add(group);
  }

  _addBelAZs() {
    const routes = CONFIG.exhibition.belazRoutes || [];
    routes.forEach((route, i) => {
      const scale = route.scale || 1.15;
      const frames = this._loadCycleFrames(scale);
      const truck = createBelAZ();
      truck.scale.setScalar(scale);
      this.scene.add(truck);
      const mover = {
        group: truck,
        frames,
        duration: route.duration || 120,
        phase: route.phase ?? i / Math.max(routes.length, 1),
        _pos: new THREE.Vector3(),
        _next: new THREE.Vector3(),
        _q: new THREE.Quaternion(),
        _aimed: false,
        _load: 0,
      };
      this._setTruckJob(mover, 0);
      this.trucks.push(mover);
      if (i === 0) this.followTruck = mover;
    });
  }

  _addDrones() {
    for (const pose of CONFIG.exhibition.drones || []) {
      const drone = createMiningDrone(pose.kind || 'quad');
      drone.scale.setScalar(pose.scale || 1);
      this.scene.add(drone);
      const pts = pose.waypoints.map((p) => {
        const v = new THREE.Vector3();
        this._quarryLocalToWorld(p[0], p[1], p[2], v);
        return v;
      });
      const flyer = {
        group: drone,
        rotors: drone.userData.rotors || [],
        points: pts,
        duration: pose.duration || 50,
        phase: pose.phase || 0,
        _pos: new THREE.Vector3(),
        _next: new THREE.Vector3(),
        _q: new THREE.Quaternion(),
        _aimed: false,
      };
      this._setPathPose(flyer, 0);
      this.drones.push(flyer);
    }
  }

  _addBenchExcavators() {
    const o = this._quarryOrigin;
    for (const site of coalDigSites()) {
      const ex = createExcavator();
      ex.userData.phase = site.phase;
      const x = Math.cos(site.ang) * site.standR;
      const z = Math.sin(site.ang) * site.standR;
      ex.position.set(o.x + x, site.deckY, o.z + z);
      // rotation.y sends local +X to (cos θ, 0, -sin θ); outward is (cos ang, 0, sin ang)
      ex.rotation.y = -site.ang;
      ex.scale.setScalar(site.scale);
      this.scene.add(ex);
      this.excavators.push(ex);
    }
  }

  _quarryLocalToWorld(x, y, z, out) {
    out.set(this._quarryOrigin.x + x, y, this._quarryOrigin.z + z);
    return out;
  }

  _setPathPose(item, timeSec) {
    const u = timeSec / item.duration + (item.phase || 0);
    sampleClosedSpline(item.points, u, item._pos);
    item.group.position.copy(item._pos);
    if (item.rotors) {
      item.group.position.y += Math.sin(timeSec * 0.9) * 0.35;
    }
  }

  /**
   * Ride-along eye: local truck eye, then push outward along +Z (deck side)
   * so canopy/hopper never fill the frame.
   */
  getFollowEye(out = _eyeWorld) {
    const truck = this.followTruck?.group;
    if (!truck) return null;
    truck.updateMatrixWorld(true);
    const local = truck.userData.eyeLocal || new THREE.Vector3(4.2, 5.6, 3.6);
    out.copy(local);
    truck.localToWorld(out);
    // Extra lift so horizon clears hopper lip
    out.y += 0.6;
    return out;
  }

  tick(now) {
    this._time = now * 0.001;
    for (const mat of this._skyMats) {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = this._time;
    }

    for (const truck of this.trucks) {
      this._setTruckJob(truck, this._time);
      _fwd.subVectors(truck._next, truck._pos);
      _fwd.y = 0;
      if (_fwd.lengthSq() > 0.04) {
        _look.copy(truck.group.position).add(_fwd);
        truck.group.lookAt(_look);
        truck.group.rotateY(-Math.PI / 2);
        _targetQ.copy(truck.group.quaternion);
        if (!truck._aimed) {
          truck._q.copy(_targetQ);
          truck._aimed = true;
        } else {
          truck._q.slerp(_targetQ, 0.07);
        }
        truck.group.quaternion.copy(truck._q);
      }
    }

    for (const drone of this.drones) {
      this._setPathPose(drone, this._time);
      const dt = 0.3 / drone.duration;
      sampleClosedSpline(
        drone.points,
        this._time / drone.duration + (drone.phase || 0) + dt,
        drone._next,
      );
      _fwd.subVectors(drone._next, drone._pos);
      if (_fwd.lengthSq() > 1e-8) {
        _look.copy(drone.group.position).add(_fwd);
        drone.group.lookAt(_look);
        _targetQ.copy(drone.group.quaternion);
        if (!drone._aimed) {
          drone._q.copy(_targetQ);
          drone._aimed = true;
        } else {
          drone._q.slerp(_targetQ, 0.1);
        }
        drone.group.quaternion.copy(drone._q);
      }
      for (const blade of drone.rotors) blade.rotation.y += 0.9;
    }

    let loadPoint = null;
    for (const truck of this.trucks) {
      if (truck._load > 0.5) {
        loadPoint = truck.group.localToWorld(new THREE.Vector3(-2.2, 4.2, 0));
        break;
      }
    }
    this.excavators.forEach((ex, i) => {
      tickExcavator(ex, this._time, i === 0 ? loadPoint : null);
    });
  }

  /**
   * Shared lap: pull up beside the lower shovel, climb the existing spiral,
   * tip the bed at the rim coal pile, come back down.
   */
  _loadCycleFrames(scale) {
    const loop = buildHaulLoop();
    const site = coalDigSites()[0];
    const ang = site.ang;
    const tx = -Math.sin(ang);
    const tz = Math.cos(ang);
    // Rear lip of the hopper sits just inside the shovel's reach.
    // The body stays clear of the tracks; bigger trucks stand further out.
    const side = 4.55 + 4.9 * scale;
    const park = new THREE.Vector3(
      Math.cos(ang) * site.standR + tx * side,
      site.deckY + 0.05,
      Math.sin(ang) * site.standR + tz * side,
    );
    let join = 0;
    let best = Infinity;
    loop.forEach((p, i) => {
      const d = (p.x - park.x) ** 2 + (p.z - park.z) ** 2;
      if (d < best && p.y < -8) {
        best = d;
        join = i;
      }
    });
    let rim = 0;
    let score = -Infinity;
    loop.forEach((p, i) => {
      const sc = p.x + p.y * 3;
      if (p.y > -1 && sc > score) {
        score = sc;
        rim = i;
      }
    });

    const frames = [];
    const add = (x, y, z, bed, coal, load, copies, aim) => {
      const p = new THREE.Vector3();
      this._quarryLocalToWorld(x, y, z, p);
      let aimWorld = null;
      if (aim) {
        aimWorld = new THREE.Vector3();
        this._quarryLocalToWorld(aim[0], y, aim[1], aimWorld);
      }
      for (let n = 0; n < copies; n += 1) {
        frames.push({
          p: p.clone(),
          bed,
          coal,
          load,
          aim: aimWorld ? aimWorld.clone() : null,
        });
      }
    };
    const addRoad = (p, bed, coal, load, copies = 1) => {
      add(p.x, p.y + 0.05, p.z, bed, coal, load, copies, null);
    };

    const nose = [park.x + tx * 18, park.z + tz * 18];
    addRoad(loop[join], 0, 0, 0, 2);
    add(park.x, park.y, park.z, 0, 0, 0, 2, nose);
    add(park.x, park.y, park.z, 0, 0.2, 1, 4, nose);
    add(park.x, park.y, park.z, 0, 1, 1, 8, nose);
    add(park.x, park.y, park.z, 0, 1, 0, 2, nose);
    addRoad(loop[join], 0, 1, 0, 2);

    const count = loop.length;
    let span = (rim - join + count) % count;
    for (let k = 1; k <= 30; k += 1) {
      addRoad(loop[(join + Math.round((span * k) / 30)) % count], 0, 1, 0, 1);
    }

    add(86, 0.05, -10, 0, 1, 0, 2, null);
    add(108, 0.05, -16, 0, 1, 0, 2, null);
    add(108, 0.05, -16, 0.5, 0.15, 0, 8, [92, -28]);
    add(108, 0.05, -16, 0, 0, 0, 2, [92, -28]);
    add(86, 0.05, -10, 0, 0, 0, 2, null);
    addRoad(loop[rim], 0, 0, 0, 2);

    span = (join - rim + count) % count;
    for (let k = 1; k <= 30; k += 1) {
      addRoad(loop[(rim + Math.round((span * k) / 30)) % count], 0, 0, 0, 1);
    }
    return frames;
  }

  _setTruckJob(item, timeSec) {
    const frames = item.frames;
    const n = frames.length;
    const u = ((timeSec / item.duration + (item.phase || 0)) % 1 + 1) % 1;
    const scaled = u * n;
    const i = Math.floor(scaled) % n;
    const f = scaled - Math.floor(scaled);
    const a = frames[i];
    const b = frames[(i + 1) % n];
    item._pos.lerpVectors(a.p, b.p, f);
    item.group.position.copy(item._pos);
    const hopper = item.group.userData.bed;
    if (hopper) hopper.rotation.z = a.bed + (b.bed - a.bed) * f;
    const fill = item.group.userData.bedCoal;
    if (fill) fill.scale.y = Math.max(0.05, a.coal + (b.coal - a.coal) * f);
    item._load = Math.max(a.load, b.load);
    if (a.aim) {
      item._next.copy(a.aim);
      return;
    }
    let found = null;
    for (let k = 1; k <= 8; k += 1) {
      const q = frames[(i + k) % n].p;
      if (q.distanceToSquared(a.p) > 1) {
        found = q;
        break;
      }
    }
    item._next.copy(found || b.p);
  }
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function sampleClosedSpline(points, u, out) {
  const n = points.length;
  if (n === 0) {
    out.set(0, 0, 0);
    return out;
  }
  const t = ((u % 1) + 1) % 1;
  const scaled = t * n;
  const i = Math.floor(scaled) % n;
  const local = scaled - Math.floor(scaled);
  const p0 = points[(i - 1 + n) % n];
  const p1 = points[i];
  const p2 = points[(i + 1) % n];
  const p3 = points[(i + 2) % n];
  catmullRom(p0, p1, p2, p3, local, out);
  return out;
}

function catmullRom(p0, p1, p2, p3, t, out) {
  const t2 = t * t;
  const t3 = t2 * t;
  out.set(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
  return out;
}
