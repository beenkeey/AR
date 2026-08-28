import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textured } from './surfaceMaps.js';

const WEAK = CONFIG.performance.weak;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, WEAK ? 10 : 16, 1);

function steel(color, metalness, roughness, kind = 'paint') {
  return textured(
    new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
    }),
    kind,
  );
}

function markShadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function box(parent, mat, x, y, z, sx, sy, sz, ry = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.y = ry;
  markShadow(m);
  parent.add(m);
  return m;
}

function cyl(parent, mat, x, y, z, r, h, rx = 0, rz = 0) {
  const m = new THREE.Mesh(CYL, mat);
  m.position.set(x, y, z);
  m.scale.set(r * 2, h, r * 2);
  m.rotation.x = rx;
  m.rotation.z = rz;
  markShadow(m);
  parent.add(m);
  return m;
}

/** Flare stack with animated flame, tank farm, pumpjacks. */
export function createFieldYard() {
  const root = new THREE.Group();
  root.name = 'FieldYard';
  root.add(createFlareStack(42, -88));
  root.add(createTankFarm(-36, -48));
  root.add(createPumpjack(-18, -58, 0.55));
  root.add(createPipeRack(-8, -18));
  return root;
}

function createFlareStack(x, z) {
  const g = new THREE.Group();
  g.name = 'FlareStack';
  g.position.set(x, 0, z);
  const rust = steel(0x6a5344, 0.42, 0.55, 'rust');
  const dark = steel(0x2c3036, 0.5, 0.4, 'metal');
  const lattice = steel(0x8a6a4a, 0.35, 0.48, 'rust');
  const H = 36;
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();

  function strut(ax, ay, az, bx, by, bz, r, mat) {
    _a.set(ax, ay, az);
    _b.set(bx, by, bz);
    const len = _a.distanceTo(_b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
    m.position.lerpVectors(_a, _b, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.sub(_a).normalize());
    markShadow(m);
    g.add(m);
    return m;
  }

  cyl(g, dark, 0, 0.4, 0, 3.2, 0.8);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of corners) {
    strut(sx * 2.1, 0.2, sz * 2.1, sx * 0.55, H, sz * 0.55, 0.09, lattice);
  }
  const rings = 8;
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const y = 1.4 + t * (H - 2.2);
    const w = THREE.MathUtils.lerp(2.05, 0.58, t);
    for (let c = 0; c < 4; c += 1) {
      const a = corners[c];
      const b = corners[(c + 1) % 4];
      strut(a[0] * w, y, a[1] * w, b[0] * w, y, b[1] * w, 0.045, lattice);
    }
    if (i < rings - 1) {
      const y2 = 1.4 + ((i + 1) / (rings - 1)) * (H - 2.2);
      const w2 = THREE.MathUtils.lerp(2.05, 0.58, (i + 1) / (rings - 1));
      for (let c = 0; c < 4; c += 1) {
        const a = corners[c];
        const b = corners[(c + 1) % 4];
        strut(a[0] * w, y, a[1] * w, b[0] * w2, y2, b[1] * w2, 0.035, rust);
      }
    }
  }
  cyl(g, rust, 0, H * 0.5, 0, 0.28, H);
  cyl(g, dark, 0, H + 0.35, 0, 0.55, 0.7);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.9, 10), dark);
  tip.position.y = H + 0.95;
  markShadow(tip);
  g.add(tip);

  const flameMats = [];
  const layers = [
    { r: 0.55, h: 7.2, y: H + 4.6, seed: 0.0 },
    { r: 0.95, h: 9.5, y: H + 5.4, seed: 1.7 },
    { r: 1.35, h: 11.8, y: H + 6.2, seed: 3.1 },
  ];
  for (const layer of layers) {
    const mat = makeFlameMaterial(layer.seed);
    flameMats.push(mat);
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(layer.r, layer.h, WEAK ? 8 : 14, 1, true),
      mat,
    );
    mesh.position.y = layer.y;
    mesh.renderOrder = 4;
    g.add(mesh);
  }
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 4.2, 8, 1, true),
    makeFlameMaterial(8.0, true),
  );
  core.position.y = H + 3.1;
  g.add(core);
  flameMats.push(core.material);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff6a18,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.y = H + 2.4;
  glow.name = 'FlareGlow';
  g.add(glow);
  const light = new THREE.PointLight(0xff5a14, 4.2, 70, 1.5);
  light.position.set(0, H + 3.2, 0);
  g.add(light);
  g.userData.flameMats = flameMats;
  g.userData.glow = glow;
  g.userData.light = light;
  g.userData.core = core;
  return g;
}

function makeFlameMaterial(seed, inner = false) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uInner: { value: inner ? 1 : 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uSeed;
      void main() {
        vUv = uv;
        vec3 p = position;
        float k = uv.y;
        p.x += sin(uTime * 13.0 + uSeed + uv.y * 9.0) * 0.12 * k;
        p.z += cos(uTime * 11.0 + uSeed * 1.7 + uv.y * 7.0) * 0.12 * k;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uSeed;
      uniform float uInner;
      void main() {
        float h = vUv.y;
        float flick = 0.82 + 0.18 * sin(uTime * 21.0 + uSeed + h * 12.0);
        vec3 blue = vec3(0.18, 0.42, 1.0);
        vec3 white = vec3(1.0, 0.97, 0.88);
        vec3 orange = vec3(1.0, 0.38, 0.06);
        vec3 red = vec3(0.82, 0.08, 0.02);
        vec3 col = mix(blue, white, smoothstep(0.0, 0.14, h));
        col = mix(col, orange, smoothstep(0.12, 0.42, h));
        col = mix(col, red, smoothstep(0.4, 0.9, h));
        if (uInner > 0.5) {
          col = mix(blue * 1.2, white, smoothstep(0.0, 0.45, h));
        }
        float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float a = pow(max(edge, 0.0), 1.15) * (1.0 - smoothstep(0.52, 1.0, h)) * flick;
        if (uInner > 0.5) a *= 0.85;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
}

function createTankFarm(x, z) {
  const g = new THREE.Group();
  g.name = 'TankFarm';
  g.position.set(x, 0, z);
  const shell = steel(0xb7c0c6, 0.38, 0.42, 'metal');
  const ring = steel(0x8e979e, 0.45, 0.38, 'metal');
  const berm = steel(0xd9e2e8, 0.08, 0.92, 'snow');
  const rust = steel(0x6d5344, 0.28, 0.62, 'rust');
  box(g, berm, 8, 0.18, 5, 28, 0.36, 18);
  const spots = [
    [0, 0],
    [9, 0],
    [18, 0],
    [4.5, 9],
    [13.5, 9],
  ];
  spots.forEach(([tx, tz], i) => {
    const h = 5.2 + (i % 3) * 0.55;
    cyl(g, shell, tx, h * 0.5, tz, 3.1, h);
    cyl(g, rust, tx, 0.22, tz, 3.14, 0.44);
    cyl(g, ring, tx, h + 0.08, tz, 3.18, 0.16);
    cyl(g, ring, tx, h * 0.45, tz, 3.16, 0.1);
    cyl(g, ring, tx + 3.35, 1.4, tz, 0.09, 2.8);
  });
  return g;
}

function createPumpjack(x, z, yaw) {
  const g = new THREE.Group();
  g.name = 'Pumpjack';
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const paint = steel(0xc9a227, 0.22, 0.48, 'paint');
  const dark = steel(0x2a2e32, 0.55, 0.38, 'metal');
  const segs = WEAK ? 8 : 12;

  cyl(g, dark, 0, 0.22, 0, 1.35, 0.44);
  box(g, dark, 0, 0.18, 0, 3.6, 0.22, 1.7);
  cyl(g, paint, -0.15, 2.15, 0, 0.28, 3.5);
  cyl(g, paint, 0.95, 1.15, 0, 0.22, 0.55, 0, Math.PI / 2);
  const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, segs), dark);
  gear.rotation.x = Math.PI / 2;
  gear.position.set(0.95, 1.15, 0.42);
  markShadow(gear);
  g.add(gear);

  const beam = new THREE.Group();
  beam.name = 'HorseHead';
  beam.position.set(-0.15, 3.95, 0);
  const walking = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 5.1, 3, segs), paint);
  walking.rotation.z = Math.PI / 2;
  beam.add(walking);
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 8, 14, Math.PI * 1.15), paint);
  head.rotation.y = Math.PI / 2;
  head.position.set(2.55, -0.15, 0);
  beam.add(head);
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.38, segs, 8), dark);
  weight.position.set(-2.45, 0.05, 0);
  weight.scale.set(1.15, 0.85, 0.7);
  beam.add(weight);
  g.add(beam);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), dark);
  rod.position.set(-2.45, 1.2, 0);
  rod.name = 'PolishRod';
  markShadow(rod);
  g.add(rod);
  cyl(g, dark, -2.45, 0.12, 0, 0.28, 0.24);

  g.userData.beam = beam;
  g.userData.rod = rod;
  g.userData.phase = 0.4;
  return g;
}

function createPipeRack(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pipe = steel(0x7a868f, 0.55, 0.32, 'metal');
  const post = steel(0x4d555c, 0.4, 0.5, 'metal');
  for (let i = 0; i < 8; i += 1) {
    cyl(g, post, i * 4.2, 1.1, 0, 0.11, 2.2);
  }
  cyl(g, pipe, 14.5, 2.15, -0.25, 0.16, 30, 0, Math.PI / 2);
  cyl(g, pipe, 14.5, 2.15, 0.28, 0.14, 30, 0, Math.PI / 2);
  cyl(g, pipe, 14.5, 2.55, 0, 0.12, 30, 0, Math.PI / 2);
  return g;
}

export function tickFieldYard(root, time) {
  if (!root) return;
  const flare = root.getObjectByName('FlareStack');
  if (flare) {
    for (const mat of flare.userData.flameMats || []) {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
    }
    if (flare.userData.core) {
      const pulse = 0.9 + Math.sin(time * 10.5) * 0.1;
      flare.userData.core.scale.set(0.9 + Math.sin(time * 8) * 0.12, pulse, 0.9 + Math.cos(time * 7) * 0.1);
    }
    if (flare.userData.glow) {
      flare.userData.glow.scale.setScalar(0.95 + Math.sin(time * 13) * 0.12);
    }
    if (flare.userData.light) {
      flare.userData.light.intensity = 3.6 + Math.sin(time * 12) * 0.7;
    }
  }
  root.traverse((node) => {
    if (node.name !== 'Pumpjack' || !node.userData.beam) return;
    const a = Math.sin(time * 1.35 + node.userData.phase) * 0.38;
    node.userData.beam.rotation.z = a;
    if (node.userData.rod) {
      node.userData.rod.position.y = 1.2 + Math.sin(time * 1.35 + node.userData.phase) * 0.55;
    }
  });
}

export function createViewpointPad(id, label) {
  const g = new THREE.Group();
  g.name = 'ViewpointPad';
  g.userData.viewpointId = id;
  g.userData.label = label;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.28, 20),
    new THREE.MeshStandardMaterial({
      color: 0xf0c43a,
      emissive: 0xc99612,
      emissiveIntensity: 0.28,
      roughness: 0.55,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  markShadow(ring, false, true);
  g.add(ring);
  g.traverse((n) => {
    if (n.isMesh) n.userData.viewpointId = id;
  });
  return g;
}
