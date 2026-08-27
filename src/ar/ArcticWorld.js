import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createUTairHelicopter } from '../assets/UTairHelicopter.js';
import { createCrewBus } from '../assets/CrewBus.js';

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
    this._aurora = [];
    this._time = 0;
    this._build();
  }

  _build() {
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 70, 240);

    this.scene.add(this._sky());
    this.scene.add(this._ground());
    this._addLandscape();
    this._addHelicopter();
    this._addBus();
  }

  _sky() {
    const geo = new THREE.SphereGeometry(260, WEAK ? 20 : 32, WEAK ? 14 : 20);
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

    const snow = new THREE.MeshStandardMaterial({
      color: 0xeef5f8,
      roughness: 0.97,
      metalness: 0.02,
    });
    const packed = new THREE.MeshStandardMaterial({
      color: 0xd5e0e8,
      roughness: 0.9,
      metalness: 0.04,
    });
    const ice = new THREE.MeshStandardMaterial({
      color: 0xc5d5e0,
      roughness: 0.62,
      metalness: 0.08,
    });
    const berm = new THREE.MeshStandardMaterial({
      color: 0xf4f8fb,
      roughness: 0.98,
      metalness: 0,
    });

    const ground = new THREE.Mesh(new THREE.CircleGeometry(190, WEAK ? 32 : 48), snow);
    ground.rotation.x = -Math.PI / 2;
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
      const crate = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.78, metalness: 0.08 });
      const steel = new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: 0.55, metalness: 0.35 });
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
    const rock = new THREE.MeshStandardMaterial({
      color: 0x7a8a96,
      roughness: 0.94,
      metalness: 0.03,
      flatShading: true,
      fog: true,
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
    });
    const snow = new THREE.MeshStandardMaterial({
      color: 0xf3f7fa,
      roughness: 0.97,
      metalness: 0.01,
      flatShading: true,
      fog: true,
      side: THREE.FrontSide,
      depthWrite: true,
      depthTest: true,
    });

    const clusters = [
      { x: -12, z: -128, peaks: [[0, 26, 18], [-16, 18, 13], [14, 20, 12]] },
      { x: 58, z: -112, peaks: [[0, 20, 14], [12, 14, 10], [-11, 16, 11]] },
      { x: -78, z: -96, peaks: [[0, 18, 13], [10, 12, 9]] },
      { x: 102, z: -62, peaks: [[0, 16, 11], [-9, 11, 8]] },
      { x: -108, z: 38, peaks: [[0, 17, 12], [11, 12, 8]] },
      { x: 118, z: 22, peaks: [[0, 15, 11], [-8, 11, 8]] },
      { x: -36, z: 124, peaks: [[0, 19, 13], [14, 13, 9]] },
      { x: 48, z: 118, peaks: [[0, 16, 12]] },
    ];
    const count = WEAK ? 5 : clusters.length;
    for (let i = 0; i < count; i += 1) {
      const c = clusters[i];
      for (let p = 0; p < c.peaks.length; p += 1) {
        const [dx, h, r] = c.peaks[p];
        addPeak(group, c.x + dx, c.z + p * 6, h, r, rock, snow);
      }
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

  _addHelicopter() {
    const pose = CONFIG.exhibition.heli;
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

  _addBus() {
    const pose = CONFIG.exhibition.bus;
    const bus = createCrewBus();
    bus.position.set(pose.x, pose.y, pose.z);
    bus.rotation.y = pose.yaw;
    bus.scale.setScalar(pose.scale);
    this.scene.add(bus);
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
      if (heli.tail) heli.tail.rotation.x += 0.95;
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

function addPeak(group, x, z, height, radius, rock, snow) {
  const sides = WEAK ? 8 : 12;
  const body = new THREE.Mesh(new THREE.ConeGeometry(radius, height, sides, 1), rock);
  body.position.set(x, height * 0.5, z);
  body.rotation.y = x * 0.02 + z * 0.01;
  group.add(body);
  const capH = height * 0.28;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.38, capH, sides, 1), snow);
  cap.position.set(x, height - capH * 0.42, z);
  cap.rotation.y = body.rotation.y + 0.15;
  group.add(cap);
}
