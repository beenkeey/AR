import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createBelAZ } from '../assets/BelAZ.js';
import { createMiningDrone } from '../assets/MiningDrone.js';
import { createExcavator, tickExcavator } from '../assets/Excavator.js';
import { createCoalYard } from '../assets/FieldYard.js';
import { textured } from '../assets/surfaceMaps.js';

const WEAK = CONFIG.performance.weak;
const FOG = 0x8a7a68;
const _fwd = new THREE.Vector3();
const _look = new THREE.Vector3();
const _targetQ = new THREE.Quaternion();
const _eyeWorld = new THREE.Vector3();

/**
 * Large open-pit quarry (карьер). BelAZ, drones and excavators stay inside the bowl.
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
    this._build();
  }

  _build() {
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 90, 360);

    this.scene.add(this._sky());
    this.scene.add(this._rimPlateau());
    this.scene.add(this._quarryBowl());
    this._addBelAZs();
    this._addDrones();
    this._addBenchExcavators();
    // Stockyard on the quarry rim only
    const yard = createCoalYard();
    yard.position.set(0, 0, 0);
    this.scene.add(yard);
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
          vec3 zenith = vec3(0.40, 0.50, 0.60);
          vec3 mid = vec3(0.60, 0.56, 0.46);
          vec3 horizon = vec3(0.74, 0.66, 0.52);
          vec3 haze = vec3(0.80, 0.72, 0.58);
          vec3 col = mix(horizon, mid, smoothstep(-0.05, 0.28, h));
          col = mix(col, zenith, smoothstep(0.18, 0.92, h));
          col = mix(col, haze, (1.0 - smoothstep(0.0, 0.22, abs(h))) * 0.55);
          float dust = 0.035 * sin(uTime * 0.15 + n.x * 3.0);
          col += vec3(dust, dust * 0.7, dust * 0.4);
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
    const soil = textured(new THREE.MeshStandardMaterial({
      color: 0x6a5844,
      roughness: 0.96,
      metalness: 0.03,
    }), 'rock');
    // Outer plateau around the pit
    const ground = new THREE.Mesh(new THREE.RingGeometry(78, 280, WEAK ? 40 : 64), soil);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -CONFIG.exhibition.distance * 0.35);
    ground.receiveShadow = true;
    group.add(ground);
    return group;
  }

  /**
   * Multi-bench open pit centered in front of the viewer.
   * Rim ~75 m radius, bottom ~22 m deep — everything else lives on these benches.
   */
  _quarryBowl() {
    const group = new THREE.Group();
    group.name = 'QuarryBowl';
    // Shift pit so the viewer stands near the rim looking in
    const cx = 0;
    const cz = -CONFIG.exhibition.distance * 0.55;
    group.position.set(cx, 0, cz);

    const rock = textured(new THREE.MeshStandardMaterial({
      color: 0x6a5e50,
      roughness: 0.92,
      metalness: 0.05,
    }), 'rock');
    const dirt = textured(new THREE.MeshStandardMaterial({
      color: 0x5a4a38,
      roughness: 0.94,
      metalness: 0.04,
    }), 'rock');
    const coal = textured(new THREE.MeshStandardMaterial({
      color: 0x1a1816,
      roughness: 0.95,
      metalness: 0.04,
    }), 'rock');
    const road = textured(new THREE.MeshStandardMaterial({
      color: 0x3a342c,
      roughness: 0.88,
      metalness: 0.06,
    }), 'rock');
    const yellow = textured(new THREE.MeshStandardMaterial({
      color: 0xe8b40a,
      roughness: 0.5,
      metalness: 0.1,
    }), 'paint');

    // Terraces: [radius, floorY, wallH, material]
    const benches = [
      { r: 72, y: -0.2, h: 1.2, mat: rock },
      { r: 58, y: -5.5, h: 5.2, mat: dirt },
      { r: 46, y: -11.0, h: 5.4, mat: dirt },
      { r: 34, y: -16.5, h: 5.4, mat: dirt },
      { r: 22, y: -21.5, h: 5.0, mat: coal },
      { r: 12, y: -25.5, h: 4.0, mat: coal },
    ];

    for (let i = 0; i < benches.length; i += 1) {
      const b = benches[i];
      const nextR = benches[i + 1]?.r ?? 4;
      // Floor annulus / disk
      const floor = new THREE.Mesh(
        i < benches.length - 1
          ? new THREE.RingGeometry(nextR + 0.4, b.r - 0.3, WEAK ? 36 : 56)
          : new THREE.CircleGeometry(b.r - 0.2, WEAK ? 28 : 40),
        b.mat,
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = b.y;
      floor.receiveShadow = true;
      group.add(floor);

      // Vertical / slightly tapered wall to next level
      if (i < benches.length - 1) {
        const wall = new THREE.Mesh(
          new THREE.CylinderGeometry(nextR + 0.6, b.r - 0.5, b.h, WEAK ? 36 : 56, 1, true),
          b.mat,
        );
        wall.position.y = b.y - b.h * 0.5;
        wall.receiveShadow = true;
        wall.castShadow = true;
        group.add(wall);
      }
    }

    // Bottom coal seam
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(11, 32), coal);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -25.7;
    group.add(bottom);

    // Spiral haul road ribbons on benches
    this._addSpiralRoads(group, road);

    // Rim safety berm + markers
    const berm = new THREE.Mesh(
      new THREE.TorusGeometry(73, 1.1, 8, WEAK ? 40 : 64),
      rock,
    );
    berm.rotation.x = Math.PI / 2;
    berm.position.y = 0.6;
    group.add(berm);

    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), yellow);
      post.position.set(Math.cos(a) * 74, 1.2, Math.sin(a) * 74);
      group.add(post);
    }

    // Coal piles on mid benches
    for (const [ang, rad, y, s] of [
      [0.4, 40, -11.2, 5],
      [2.1, 38, -11.2, 4.2],
      [3.8, 28, -16.7, 4.8],
      [5.2, 26, -16.7, 3.6],
      [1.2, 18, -21.7, 3.2],
    ]) {
      const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), coal);
      pile.position.set(Math.cos(ang) * rad, y + s * 0.28, Math.sin(ang) * rad);
      pile.scale.set(s, s * 0.48, s * 0.85);
      pile.castShadow = true;
      group.add(pile);
    }

    // Lighting masts on upper benches (inside pit)
    for (const [ang, rad, y] of [
      [0.2, 55, -5.5],
      [1.8, 54, -5.5],
      [3.4, 52, -5.5],
      [5.0, 53, -5.5],
      [0.9, 42, -11],
      [4.2, 40, -11],
    ]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), road);
      mast.position.set(Math.cos(ang) * rad, y + 4.5, Math.sin(ang) * rad);
      group.add(mast);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffe08a,
          emissive: 0xffc056,
          emissiveIntensity: 1.0,
          roughness: 0.4,
        }),
      );
      lamp.position.set(Math.cos(ang) * rad, y + 9.2, Math.sin(ang) * rad);
      group.add(lamp);
      const pl = new THREE.PointLight(0xffd090, 1.5, 32, 1.8);
      pl.position.copy(lamp.position);
      group.add(pl);
    }

    this._quarryOrigin = new THREE.Vector3(cx, 0, cz);
    return group;
  }

  _addSpiralRoads(group, roadMat) {
    const levels = [
      { r: 64, y: -0.05 },
      { r: 52, y: -5.35 },
      { r: 40, y: -10.85 },
      { r: 28, y: -16.35 },
      { r: 17, y: -21.35 },
    ];
    for (const lv of levels) {
      const ribbon = new THREE.Mesh(
        new THREE.TorusGeometry(lv.r, 2.4, 6, WEAK ? 40 : 64),
        roadMat,
      );
      ribbon.rotation.x = Math.PI / 2;
      ribbon.position.y = lv.y;
      ribbon.receiveShadow = true;
      group.add(ribbon);
    }
    // Ramp connectors between benches
    for (let i = 0; i < levels.length - 1; i += 1) {
      const a = i * 1.35;
      const r0 = levels[i].r;
      const r1 = levels[i + 1].r;
      const y0 = levels[i].y;
      const y1 = levels[i + 1].y;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 14), roadMat);
      const mx = Math.cos(a) * ((r0 + r1) * 0.5);
      const mz = Math.sin(a) * ((r0 + r1) * 0.5);
      ramp.position.set(mx, (y0 + y1) * 0.5, mz);
      ramp.lookAt(Math.cos(a) * r1, y1, Math.sin(a) * r1);
      ramp.rotateX(-Math.atan2(y0 - y1, r0 - r1) * 0.35);
      group.add(ramp);
    }
  }

  _quarryLocalToWorld(x, y, z, out) {
    const o = this._quarryOrigin || new THREE.Vector3(0, 0, -CONFIG.exhibition.distance * 0.55);
    out.set(o.x + x, y, o.z + z);
    return out;
  }

  _addBelAZs() {
    const routes = CONFIG.exhibition.belazRoutes || [];
    const tmp = new THREE.Vector3();
    routes.forEach((route, i) => {
      const truck = createBelAZ();
      truck.scale.setScalar(route.scale || 1.2);
      this.scene.add(truck);
      const pts = route.waypoints.map((p) => {
        this._quarryLocalToWorld(p[0], p[1], p[2], tmp);
        return tmp.clone();
      });
      const mover = {
        group: truck,
        points: pts,
        duration: route.duration || 40,
        _pos: new THREE.Vector3(),
        _next: new THREE.Vector3(),
        _q: new THREE.Quaternion(),
        _aimed: false,
      };
      this._setPathPose(mover, 0);
      this.trucks.push(mover);
      if (i === 0) this.followTruck = mover;
    });
  }

  _addDrones() {
    const poses = CONFIG.exhibition.drones || [];
    const tmp = new THREE.Vector3();
    for (const pose of poses) {
      const drone = createMiningDrone();
      drone.scale.setScalar(pose.scale || 2.5);
      this.scene.add(drone);
      const pts = pose.waypoints.map((p) => {
        this._quarryLocalToWorld(p[0], p[1], p[2], tmp);
        return tmp.clone();
      });
      const flyer = {
        group: drone,
        rotors: drone.userData.rotors || [],
        points: pts,
        duration: pose.duration || 50,
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
    const o = this._quarryOrigin || new THREE.Vector3(0, 0, -CONFIG.exhibition.distance * 0.55);
    const poses = [
      { x: 38, y: -11.0, z: 8, yaw: 1.4, s: 1.7 },
      { x: -32, y: -11.0, z: -14, yaw: -0.8, s: 1.55 },
      { x: 18, y: -16.5, z: -22, yaw: 2.3, s: 1.45 },
      { x: -10, y: -21.5, z: 12, yaw: 0.5, s: 1.35 },
      { x: 8, y: -25.5, z: -4, yaw: -1.6, s: 1.25 },
    ];
    for (const p of poses) {
      const ex = createExcavator();
      ex.position.set(o.x + p.x, p.y, o.z + p.z);
      ex.rotation.y = p.yaw;
      ex.scale.setScalar(p.s);
      this.scene.add(ex);
      this.excavators.push(ex);
    }
  }

  _setPathPose(item, timeSec) {
    sampleClosedSpline(item.points, timeSec / item.duration, item._pos);
    const wobble = timeSec;
    const yAmp = item.rotors ? 0.45 : 0.04;
    item.group.position.set(
      item._pos.x + Math.sin(wobble * 0.6) * (item.rotors ? 0.3 : 0.015),
      item._pos.y + Math.sin(wobble * 0.85) * yAmp,
      item._pos.z + Math.cos(wobble * 0.5) * (item.rotors ? 0.25 : 0.015),
    );
  }

  getFollowEye(out = _eyeWorld) {
    const truck = this.followTruck?.group;
    if (!truck) return null;
    truck.updateMatrixWorld(true);
    const local = truck.userData.eyeLocal || new THREE.Vector3(4, 4.5, 0);
    out.copy(local);
    truck.localToWorld(out);
    return out;
  }

  tick(now) {
    this._time = now * 0.001;
    for (const mat of this._skyMats) {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = this._time;
    }

    for (const truck of this.trucks) {
      this._setPathPose(truck, this._time);
      const dt = 0.4 / truck.duration;
      sampleClosedSpline(truck.points, (this._time / truck.duration) + dt, truck._next);
      _fwd.subVectors(truck._next, truck._pos);
      if (_fwd.lengthSq() > 1e-8) {
        _look.copy(truck.group.position).add(_fwd);
        truck.group.lookAt(_look);
        truck.group.rotateY(Math.PI / 2);
        _targetQ.copy(truck.group.quaternion);
        if (!truck._aimed) {
          truck._q.copy(_targetQ);
          truck._aimed = true;
        } else {
          truck._q.slerp(_targetQ, 0.08);
        }
        truck.group.quaternion.copy(truck._q);
      }
    }

    for (const drone of this.drones) {
      this._setPathPose(drone, this._time);
      const dt = 0.35 / drone.duration;
      sampleClosedSpline(drone.points, (this._time / drone.duration) + dt, drone._next);
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
      for (const blade of drone.rotors) {
        blade.rotation.y += 0.85;
      }
    }

    for (const ex of this.excavators) {
      tickExcavator(ex, this._time);
    }
  }
}

function sampleClosedSpline(points, u, out) {
  const n = points.length;
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
