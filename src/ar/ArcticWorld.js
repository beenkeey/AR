import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createUTairHelicopter } from '../assets/UTairHelicopter.js';
import { createCrewBus } from '../assets/CrewBus.js';
import { createFieldYard, tickFieldYard } from '../assets/FieldYard.js';
import { createPolarBear } from '../assets/PolarBear.js';
import { textured } from '../assets/surfaceMaps.js';

const WEAK = CONFIG.performance.weak;
const FOG = 0xa9c7dc;
const _heliFwd = new THREE.Vector3();
const _heliLook = new THREE.Vector3();
const _heliTargetQ = new THREE.Quaternion();

/**
 * Arctic exhibition world around ExhibitionRoot. Never parents the rig.
 * Daytime field: pale sky, snow, distant peaks, UTair heli, crew bus.
 */
export class ArcticWorld {
  constructor(scene) {
    this.scene = scene;
    this.helis = [];
    this.bears = [];
    this._aurora = [];
    this._yard = null;
    this._time = 0;
    this._build();
  }

  _build() {
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 95, 340);

    this.scene.add(this._sky());
    this.scene.add(this._ground());
    this._addLandscape();
    this._addHelicopters();
    this._addBears();
    this._addBus();
    this._addRearField();
    this._yard = createFieldYard();
    this.scene.add(this._yard);
  }

  _sky() {
    const geo = new THREE.SphereGeometry(400, WEAK ? 20 : 32, WEAK ? 14 : 20);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
      },
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
          vec3 zenith = vec3(0.55, 0.74, 0.92);
          vec3 mid = vec3(0.72, 0.84, 0.94);
          vec3 horizon = vec3(0.86, 0.91, 0.95);
          vec3 haze = vec3(0.92, 0.94, 0.96);
          vec3 col = mix(horizon, mid, smoothstep(-0.08, 0.32, h));
          col = mix(col, zenith, smoothstep(0.22, 0.95, h));
          col = mix(col, haze, (1.0 - smoothstep(0.0, 0.28, abs(h))) * 0.45);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'ArcticSky';
    mesh.frustumCulled = false;
    this._aurora.push(mat);
    return mesh;
  }

  _ground() {
    const group = new THREE.Group();
    group.name = 'SnowField';

    const snow = textured(new THREE.MeshStandardMaterial({
      color: 0xeef5f8,
      roughness: 0.97,
      metalness: 0.02,
    }), 'snow');
    const packed = textured(new THREE.MeshStandardMaterial({
      color: 0xd5e0e8,
      roughness: 0.9,
      metalness: 0.04,
    }), 'snow');
    const ice = textured(new THREE.MeshStandardMaterial({
      color: 0xc5d5e0,
      roughness: 0.62,
      metalness: 0.08,
    }), 'snow');
    const berm = textured(new THREE.MeshStandardMaterial({
      color: 0xf4f8fb,
      roughness: 0.98,
      metalness: 0,
    }), 'snow');

    const ground = new THREE.Mesh(new THREE.CircleGeometry(280, WEAK ? 32 : 48), snow);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    const pad = new THREE.Mesh(new THREE.CircleGeometry(22, 28), packed);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.03, -CONFIG.exhibition.distance * 0.55);
    group.add(pad);

    const ring = new THREE.Mesh(new THREE.RingGeometry(42, 78, 36), ice);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    const tracks = [
      [0, 0.04, -6, 3.2, 0.05, 28, 0],
      [8.5, 0.04, -10, 2.2, 0.04, 18, 0.18],
      [-7.5, 0.04, -4, 2.0, 0.04, 16, -0.22],
      [0, 0.04, 8, 2.6, 0.04, 14, 0.08],
    ];
    for (const [x, y, z, sx, sy, sz, ry] of tracks) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), packed);
      t.position.set(x, y, z);
      t.scale.set(sx, sy, sz);
      t.rotation.y = ry;
      group.add(t);
    }

    const drifts = WEAK
      ? [
        [16, 0.45, -18, 11, 0.95, 7],
        [-18, 0.4, -12, 10, 0.85, 7],
        [14, 0.35, 16, 9, 0.7, 6],
        [-16, 0.4, 18, 12, 0.9, 8],
      ]
      : [
        [16, 0.45, -18, 11, 0.95, 7],
        [-18, 0.4, -12, 10, 0.85, 7],
        [22, 0.32, 8, 8, 0.65, 5],
        [14, 0.35, 18, 9, 0.7, 6],
        [-16, 0.4, 20, 12, 0.9, 8],
        [-24, 0.38, 2, 9, 0.75, 6],
        [6, 0.28, -28, 10, 0.55, 6],
        [-8, 0.3, 28, 11, 0.6, 7],
      ];
    const sph = new THREE.SphereGeometry(1, 8, 6);
    for (const [x, y, z, sx, sy, sz] of drifts) {
      const m = new THREE.Mesh(sph, berm);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      group.add(m);
    }

    if (!WEAK) {
      const crate = textured(new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.78, metalness: 0.08 }), 'paint');
      const steel = textured(new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: 0.55, metalness: 0.35 }), 'metal');
      const spots = [
        [12.5, 0.55, -16, 1.8, 1.1, 1.4],
        [14.4, 0.45, -16.2, 1.4, 0.9, 1.2],
        [-13.5, 0.5, 12, 1.6, 1.0, 1.3],
      ];
      for (const [x, y, z, sx, sy, sz] of spots) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crate);
        b.position.set(x, y, z);
        b.scale.set(sx, sy, sz);
        group.add(b);
      }
      const tray = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.08, 0.35), steel);
      tray.position.set(11, 0.22, -12);
      tray.rotation.y = 0.4;
      group.add(tray);
    }

    return group;
  }

  _addLandscape() {
    const group = new THREE.Group();
    group.name = 'Horizon';
    const rock = textured(new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0.02,
      fog: true,
      vertexColors: true,
    }), 'snow', { normalScale: 0.28 });

    addRange(group, 8, -215, 340, 78, 52, 0.04, rock);
    addRange(group, -95, -198, 170, 58, 40, 0.18, rock);
    addRange(group, 118, -192, 180, 56, 38, -0.16, rock);
    addRange(group, 0, 88, 210, 52, 24, Math.PI, rock);
    if (!WEAK) {
      addRange(group, -210, -20, 150, 52, 30, Math.PI * 0.48, rock);
      addRange(group, 215, -8, 150, 50, 28, -Math.PI * 0.5, rock);
      addRange(group, 10, 210, 260, 64, 36, Math.PI, rock);
    }
    this.scene.add(group);
  }

  _addAurora() {
    const sheets = WEAK
      ? [
        { color: 0x3d8f72, x: -6, y: 52, z: -18, rotY: 0.12, rotX: 0.18, sx: 1.35, sy: 1.1 },
        { color: 0x2e6e88, x: 10, y: 58, z: 8, rotY: -0.4, rotX: 0.28, sx: 1.05, sy: 1.0 },
      ]
      : [
        { color: 0x3d8f72, x: -8, y: 50, z: -22, rotY: 0.1, rotX: 0.16, sx: 1.4, sy: 1.15 },
        { color: 0x2f7a86, x: 14, y: 56, z: -8, rotY: -0.32, rotX: 0.22, sx: 1.15, sy: 1.05 },
        { color: 0x4a6a90, x: -16, y: 62, z: 12, rotY: 0.55, rotX: 0.3, sx: 0.95, sy: 0.9 },
        { color: 0x5a4e7a, x: 6, y: 68, z: -4, rotY: -0.08, rotX: 0.42, sx: 1.2, sy: 0.85 },
      ];
    const geo = new THREE.PlaneGeometry(110, 36, WEAK ? 8 : 16, 4);
    for (const s of sheets) {
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(s.color) },
        },
        vertexShader: `
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 p = position;
            p.z += sin(uv.x * 4.2 + uTime * 0.11) * 3.5;
            p.y += sin(uv.x * 2.1 + uTime * 0.07) * 1.4;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColor;
          void main() {
            float wave = sin(vUv.x * 5.5 + uTime * 0.13) * 0.5 + 0.5;
            float wave2 = sin(vUv.x * 2.2 - uTime * 0.08) * 0.5 + 0.5;
            float band = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.38, vUv.y);
            float curtain = pow(wave * 0.65 + wave2 * 0.35, 1.45) * band;
            float fade = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
            float a = curtain * fade * 0.28;
            vec3 col = mix(uColor, uColor * vec3(0.75, 0.85, 1.15), wave2);
            gl_FragColor = vec4(col, a);
          }
        `,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.set(s.rotX, s.rotY, 0);
      mesh.scale.set(s.sx, s.sy, 1);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this._aurora.push(mat);
    }
  }

  _addHelicopters() {
    const poses = [CONFIG.exhibition.heli, ...(CONFIG.exhibition.heliFar || [])];
    for (const pose of poses) {
      this._spawnHeli(pose);
    }
  }

  _spawnHeli(pose) {
    const heli = createUTairHelicopter();
    heli.scale.setScalar(pose.scale);
    this.scene.add(heli);
    const pts = pose.waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const flyer = {
      group: heli,
      rotor: heli.userData.rotor,
      tail: heli.userData.tail,
      points: pts,
      duration: pose.duration,
      _q: new THREE.Quaternion(),
      _prev: new THREE.Vector3(),
      _pos: new THREE.Vector3(),
      _next: new THREE.Vector3(),
      _aimed: false,
      _hasPrev: false,
    };
    this._setHeliPose(flyer, 0);
    this.helis.push(flyer);
  }

  _addBears() {
    const far = [
      { scale: 3.2, duration: 52, waypoints: [[-70, 0, -168], [-40, 0, -182], [-12, 0, -170], [-48, 0, -156]] },
      { scale: 2.9, duration: 64, waypoints: [[86, 0, -162], [108, 0, -148], [84, 0, -136], [64, 0, -154]] },
      { scale: 2.7, duration: 78, waypoints: [[-170, 0, -40], [-184, 0, -8], [-168, 0, 22], [-152, 0, -18]] },
      { scale: 3.0, duration: 58, waypoints: [[48, 0, 72], [68, 0, 88], [42, 0, 104], [22, 0, 82]] },
    ];
    const near = [
      { scale: 3.4, duration: 46, waypoints: [[-38, 0, -72], [-22, 0, -88], [-8, 0, -76], [-28, 0, -62]] },
      { scale: 3.1, duration: 54, waypoints: [[36, 0, -58], [52, 0, -74], [38, 0, -90], [18, 0, -68]] },
    ];
    const routes = WEAK ? [...near, far[0], far[1]] : [...near, ...far];
    for (const pose of routes) {
      const bear = createPolarBear();
      bear.scale.setScalar(pose.scale);
      this.scene.add(bear);
      const flyer = {
        group: bear,
        legs: bear.userData.legs || [],
        points: pose.waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
        duration: pose.duration,
        _pos: new THREE.Vector3(),
        _next: new THREE.Vector3(),
        _q: new THREE.Quaternion(),
        _aimed: false,
      };
      this.bears.push(flyer);
    }
  }

  _addBus() {
    const pose = CONFIG.exhibition.bus;
    const bus = createCrewBus();
    bus.position.set(pose.x, pose.y, pose.z);
    bus.rotation.y = pose.yaw;
    bus.scale.setScalar(pose.scale);
    this.scene.add(bus);
  }

  _addRearField() {
    const group = new THREE.Group();
    group.name = 'RearField';
    const snow = textured(new THREE.MeshStandardMaterial({
      color: 0xf4f8fb,
      roughness: 0.97,
      metalness: 0.02,
    }), 'snow');
    const packed = textured(new THREE.MeshStandardMaterial({
      color: 0xd8e2e8,
      roughness: 0.9,
      metalness: 0.04,
    }), 'snow');
    const yellow = textured(new THREE.MeshStandardMaterial({
      color: 0xe0b22a,
      roughness: 0.55,
      metalness: 0.08,
    }), 'paint');
    const grey = textured(new THREE.MeshStandardMaterial({
      color: 0x7a828a,
      roughness: 0.55,
      metalness: 0.28,
    }), 'metal');
    const dark = textured(new THREE.MeshStandardMaterial({
      color: 0x2a2e32,
      roughness: 0.5,
      metalness: 0.35,
    }), 'metal');

    const pad = new THREE.Mesh(new THREE.CircleGeometry(8.5, 28), packed);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(2, 0.04, 34);
    group.add(pad);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.2, 7.8, 28),
      new THREE.MeshBasicMaterial({ color: 0xf3c43a, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(2, 0.06, 34);
    group.add(ring);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 0.45), yellow);
    hBar.position.set(2, 0.07, 34);
    group.add(hBar);
    const hL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 2.6), yellow);
    hL.position.set(0.7, 0.07, 34);
    group.add(hL);
    const hR = hL.clone();
    hR.position.x = 3.3;
    group.add(hR);

    const mods = [
      [-10, 22, 0.35],
      [-6.5, 26, -0.2],
      [14, 24, 0.5],
    ];
    for (const [x, z, yaw] of mods) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 2.6), yellow);
      m.position.set(x, 1.35, z);
      m.rotation.y = yaw;
      group.add(m);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(6.55, 0.12, 2.7), dark);
      roof.position.set(x, 2.7, z);
      roof.rotation.y = yaw;
      group.add(roof);
    }

    for (const [x, z] of [[-12, 20], [16, 22], [0, 42]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6.2, 8), dark);
      pole.position.set(x, 3.1, z);
      group.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffe08a,
          emissive: 0xffc056,
          emissiveIntensity: 0.9,
          roughness: 0.4,
        }),
      );
      lamp.position.set(x, 6.2, z);
      group.add(lamp);
      const light = new THREE.PointLight(0xffd090, 1.4, 18, 1.8);
      light.position.set(x, 6.0, z);
      group.add(light);
    }

    for (const [x, z] of [[8, 28], [9.4, 28.4]]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.4, 12), grey);
      tank.position.set(x, 1.2, z);
      group.add(tank);
    }

    const berms = [
      [-18, 1.1, 18, 10, 2.0, 6],
      [20, 0.9, 20, 9, 1.7, 7],
      [4, 0.7, 48, 14, 1.4, 8],
      [-8, 0.8, 40, 11, 1.6, 6],
    ];
    const sph = new THREE.SphereGeometry(1, 8, 6);
    for (const [x, y, z, sx, sy, sz] of berms) {
      const d = new THREE.Mesh(sph, snow);
      d.position.set(x, y, z);
      d.scale.set(sx, sy, sz);
      group.add(d);
    }

    const bus2 = createCrewBus();
    bus2.position.set(-16, 0, 30);
    bus2.rotation.y = 1.15;
    bus2.scale.setScalar(1.35);
    group.add(bus2);

    this.scene.add(group);
  }

  _setHeliPose(heli, timeSec) {
    sampleClosedSpline(heli.points, timeSec / heli.duration, heli._pos);
    const wobble = timeSec;
    heli.group.position.set(
      heli._pos.x + Math.sin(wobble * 0.73) * 0.45,
      heli._pos.y + Math.sin(wobble * 0.91) * 0.7,
      heli._pos.z + Math.cos(wobble * 0.61) * 0.4,
    );
  }

  tick(now) {
    this._time = now * 0.001;
    for (const mat of this._aurora) {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = this._time;
    }
    for (const heli of this.helis) {
      this._setHeliPose(heli, this._time);
      const dt = 0.35 / heli.duration;
      sampleClosedSpline(heli.points, (this._time / heli.duration) + dt, heli._next);
      _heliFwd.subVectors(heli._next, heli._pos);
      heli._prev.copy(heli.group.position);
      heli._hasPrev = true;

      if (_heliFwd.lengthSq() > 1e-8) {
        _heliLook.copy(heli.group.position).add(_heliFwd);
        heli.group.lookAt(_heliLook);
        _heliTargetQ.copy(heli.group.quaternion);
        if (!heli._aimed) {
          heli._q.copy(_heliTargetQ);
          heli._aimed = true;
        } else {
          heli._q.slerp(_heliTargetQ, 0.1);
        }
        heli.group.quaternion.copy(heli._q);
      }

      if (heli.rotor) heli.rotor.rotation.y += 0.62;
      if (heli.tail) heli.tail.rotation.z += 1.15;
    }
    for (const bear of this.bears) {
      sampleClosedSpline(bear.points, this._time / bear.duration, bear._pos);
      bear.group.position.copy(bear._pos);
      bear.group.position.y = 0;
      sampleClosedSpline(bear.points, this._time / bear.duration + 0.02, bear._next);
      _heliFwd.subVectors(bear._next, bear._pos);
      _heliFwd.y = 0;
      if (_heliFwd.lengthSq() > 1e-6) {
        _heliLook.set(bear.group.position.x + _heliFwd.x, 0, bear.group.position.z + _heliFwd.z);
        bear.group.lookAt(_heliLook);
      }
      const gait = this._time * 6.2;
      bear.legs.forEach((leg, i) => {
        leg.rotation.z = Math.sin(gait + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.2) * 0.35;
      });
    }
    tickFieldYard(this._yard, this._time);
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

function hashNoise(x, z) {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function addRange(group, cx, cz, width, depth, peak, yaw, material) {
  const sw = WEAK ? 22 : 42;
  const sd = WEAK ? 10 : 18;
  const geo = new THREE.PlaneGeometry(width, depth, sw, sd);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rockC = new THREE.Color(0x9aa8b2);
  const midC = new THREE.Color(0xdbe4ea);
  const snowC = new THREE.Color(0xf7fafc);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / Math.max(width * 0.5, 1);
    const nz = z / Math.max(depth * 0.5, 1);
    const end = Math.cos(Math.min(1, Math.abs(nx)) * Math.PI * 0.5);
    const ridge = Math.exp(-nz * nz * 2.2);
    const n = hashNoise((x + cx) * 0.035, (z + cz) * 0.04);
    const n2 = hashNoise((x + cx) * 0.1, (z + cz) * 0.08);
    const n3 = hashNoise((x + cx) * 0.22, (z + cz) * 0.18);
    let h = peak * Math.max(0, end) * ridge * (0.38 + n * 0.62);
    h += (n2 - 0.5) * peak * 0.2 * ridge;
    h += Math.sin(nx * 6.4 + n * 5.0) * peak * 0.1 * ridge * end;
    h += n3 * peak * 0.05 * ridge;
    h = Math.max(0, h);
    pos.setY(i, h);
    const t = THREE.MathUtils.smoothstep(h / peak, 0.08, 0.38);
    tmp.copy(rockC).lerp(midC, t);
    tmp.lerp(snowC, THREE.MathUtils.smoothstep(h / peak, 0.16, 0.48) * (0.82 + n2 * 0.18));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(cx, 0, cz);
  mesh.rotation.y = yaw;
  mesh.receiveShadow = true;
  group.add(mesh);
}
