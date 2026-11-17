import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createBelAZ } from '../assets/BelAZ.js';
import { createMiningDrone } from '../assets/MiningDrone.js';
import { createExcavator, tickExcavator } from '../assets/Excavator.js';
import { createCoalYard } from '../assets/FieldYard.js';

const WEAK = CONFIG.performance.weak;
const FOG = 0xb8d4f0;
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
    this.scene.fog = new THREE.Fog(FOG, 120, 420);

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
          vec3 zenith = vec3(0.35, 0.62, 0.92);
          vec3 mid = vec3(0.55, 0.78, 0.95);
          vec3 horizon = vec3(0.98, 0.82, 0.55);
          vec3 haze = vec3(1.0, 0.90, 0.72);
          vec3 col = mix(horizon, mid, smoothstep(-0.05, 0.28, h));
          col = mix(col, zenith, smoothstep(0.18, 0.92, h));
          col = mix(col, haze, (1.0 - smoothstep(0.0, 0.22, abs(h))) * 0.4);
          float dust = 0.02 * sin(uTime * 0.15 + n.x * 3.0);
          col += vec3(dust, dust * 0.6, dust * 0.25);
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
    const soil = new THREE.MeshStandardMaterial({
      color: 0xc48a4a,
      roughness: 0.92,
      metalness: 0.03,
    });
    // Outer plateau around the pit
    const ground = new THREE.Mesh(new THREE.RingGeometry(78, 280, WEAK ? 40 : 64), soil);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -CONFIG.exhibition.distance * 0.35);
    ground.receiveShadow = true;
    group.add(ground);
    return group;
  }

  /**
   * Solid open-pit: each terrace is a closed slab + face so sky never shows between rings.
   */
  _quarryBowl() {
    const group = new THREE.Group();
    group.name = 'QuarryBowl';
    const cx = 0;
    const cz = -CONFIG.exhibition.distance * 0.55;
    group.position.set(cx, 0, cz);

    const rock = mat(0xc9955c, 0.04, 0.9);
    const dirt = mat(0xd47a38, 0.04, 0.88);
    const clay = mat(0xb85a32, 0.04, 0.9);
    const coal = mat(0x2a2624, 0.05, 0.92);
    const road = mat(0x4a5360, 0.08, 0.82);
    const yellow = mat(0xf5c400, 0.12, 0.45);
    const green = mat(0x2faf55, 0.1, 0.5);
    const segs = WEAK ? 40 : 64;

    // outer, inner, deckY, faceMat, deckMat
    const levels = [
      { outer: 74, inner: 60, y: 0.0, face: rock, deck: rock },
      { outer: 60, inner: 48, y: -5.5, face: dirt, deck: dirt },
      { outer: 48, inner: 36, y: -11.0, face: clay, deck: clay },
      { outer: 36, inner: 24, y: -16.5, face: dirt, deck: dirt },
      { outer: 24, inner: 14, y: -21.5, face: coal, deck: coal },
      { outer: 14, inner: 0, y: -26.0, face: coal, deck: coal },
    ];

    for (let i = 0; i < levels.length; i += 1) {
      const lv = levels[i];
      const nextY = levels[i + 1]?.y ?? (lv.y - 4);
      const wallH = Math.max(0.5, lv.y - nextY);

      // Solid deck: thick ring (or disk at bottom) — no radial gaps
      if (lv.inner <= 0.01) {
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(lv.outer, lv.outer, 0.9, segs), lv.deck);
        disk.position.y = lv.y - 0.35;
        disk.receiveShadow = true;
        disk.castShadow = true;
        group.add(disk);
      } else {
        // Top surface
        const top = new THREE.Mesh(
          new THREE.RingGeometry(lv.inner, lv.outer, segs),
          lv.deck,
        );
        top.rotation.x = -Math.PI / 2;
        top.position.y = lv.y;
        top.receiveShadow = true;
        group.add(top);
        // Underside (closes the slab)
        const bot = new THREE.Mesh(
          new THREE.RingGeometry(lv.inner, lv.outer, segs),
          lv.deck,
        );
        bot.rotation.x = Math.PI / 2;
        bot.position.y = lv.y - 0.85;
        group.add(bot);
        // Outer rim face of the slab
        const outerWall = new THREE.Mesh(
          new THREE.CylinderGeometry(lv.outer, lv.outer, 0.85, segs, 1, true),
          lv.deck,
        );
        outerWall.position.y = lv.y - 0.425;
        outerWall.material = lv.deck.clone();
        outerWall.material.side = THREE.DoubleSide;
        group.add(outerWall);
        // Inner rim face of the slab (meets the drop wall)
        const innerLip = new THREE.Mesh(
          new THREE.CylinderGeometry(lv.inner, lv.inner, 0.85, segs, 1, true),
          lv.deck,
        );
        innerLip.position.y = lv.y - 0.425;
        innerLip.material = lv.deck.clone();
        innerLip.material.side = THREE.DoubleSide;
        group.add(innerLip);
      }

      // Drop face to next terrace — solid closed frustum shell with DoubleSide
      if (i < levels.length - 1) {
        const next = levels[i + 1];
        const face = new THREE.Mesh(
          new THREE.CylinderGeometry(next.outer, lv.inner, wallH, segs, 1, true),
          lv.face,
        );
        face.position.y = lv.y - wallH * 0.5;
        face.material = lv.face.clone();
        face.material.side = THREE.DoubleSide;
        face.receiveShadow = true;
        face.castShadow = true;
        group.add(face);
        // Extra thickness ring so grazing angles never show sky
        const filler = new THREE.Mesh(
          new THREE.CylinderGeometry(lv.inner + 0.35, next.outer + 0.35, wallH, segs, 1, true),
          lv.face,
        );
        filler.position.y = lv.y - wallH * 0.5;
        filler.material = lv.face.clone();
        filler.material.side = THREE.BackSide;
        group.add(filler);
      }
    }

    // Flat haul roads on decks (not floating tori)
    const roadLevels = [
      { r: 67, y: 0.06, w: 5.5 },
      { r: 54, y: -5.44, w: 5.0 },
      { r: 42, y: -10.94, w: 4.8 },
      { r: 30, y: -16.44, w: 4.5 },
      { r: 19, y: -21.44, w: 4.0 },
    ];
    for (const rv of roadLevels) {
      const strip = new THREE.Mesh(
        new THREE.RingGeometry(rv.r - rv.w * 0.5, rv.r + rv.w * 0.5, segs),
        road,
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.y = rv.y;
      strip.receiveShadow = true;
      group.add(strip);
      // Center line
      const line = new THREE.Mesh(
        new THREE.RingGeometry(rv.r - 0.12, rv.r + 0.12, segs),
        yellow,
      );
      line.rotation.x = -Math.PI / 2;
      line.position.y = rv.y + 0.02;
      group.add(line);
    }
    // Ramp slabs between decks
    for (let i = 0; i < roadLevels.length - 1; i += 1) {
      const a = i * 1.4 + 0.3;
      const r0 = roadLevels[i].r;
      const r1 = roadLevels[i + 1].r;
      const y0 = roadLevels[i].y;
      const y1 = roadLevels[i + 1].y;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.4, 16), road);
      ramp.position.set(Math.cos(a) * ((r0 + r1) * 0.5), (y0 + y1) * 0.5, Math.sin(a) * ((r0 + r1) * 0.5));
      ramp.lookAt(Math.cos(a) * r1, y1, Math.sin(a) * r1);
      ramp.rotateX(-Math.atan2(y0 - y1, Math.abs(r0 - r1)) * 0.5);
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      group.add(ramp);
    }

    // Rim berm
    const berm = new THREE.Mesh(new THREE.TorusGeometry(74.5, 0.9, 8, segs), green);
    berm.rotation.x = Math.PI / 2;
    berm.position.y = 0.5;
    group.add(berm);
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), yellow);
      post.position.set(Math.cos(a) * 75.2, 1.15, Math.sin(a) * 75.2);
      group.add(post);
    }

    // Coal piles on decks
    for (const [ang, rad, y, s] of [
      [0.5, 42, -11.0, 4.5],
      [2.2, 40, -11.0, 3.8],
      [3.9, 30, -16.5, 4.2],
      [5.3, 28, -16.5, 3.4],
    ]) {
      const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), coal);
      pile.position.set(Math.cos(ang) * rad, y + s * 0.32, Math.sin(ang) * rad);
      pile.scale.set(s, s * 0.5, s * 0.85);
      pile.castShadow = true;
      group.add(pile);
    }

    // Light masts
    for (const [ang, rad, y] of [
      [0.3, 54, -5.5],
      [2.0, 53, -5.5],
      [3.6, 52, -5.5],
      [5.1, 53, -5.5],
    ]) {
      const mast = new THREE.Mesh(new THREE.BoxGeometry(0.25, 9, 0.25), road);
      mast.position.set(Math.cos(ang) * rad, y + 4.5, Math.sin(ang) * rad);
      group.add(mast);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.35, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0xffe08a,
          emissive: 0xffc056,
          emissiveIntensity: 1.0,
          roughness: 0.4,
        }),
      );
      lamp.position.set(Math.cos(ang) * rad, y + 9.2, Math.sin(ang) * rad);
      group.add(lamp);
      const pl = new THREE.PointLight(0xffd090, 1.4, 30, 1.8);
      pl.position.copy(lamp.position);
      group.add(pl);
    }

    this._quarryOrigin = new THREE.Vector3(cx, 0, cz);
    this._benchYs = levels.map((l) => l.y);
    return group;
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
    // Tracks sit on deck y (model origin at track bottom)
    const poses = [
      { x: 42, y: -11.0, z: 6, yaw: 1.4, s: 1.5 },
      { x: -20, y: -16.5, z: -18, yaw: 2.1, s: 1.3 },
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
        // BelAZ nose is +X; lookAt aims +Z → yaw −90° so the cab leads.
        truck.group.rotateY(-Math.PI / 2);
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

function mat(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
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
