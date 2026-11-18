import * as THREE from 'three';
import { applyFinish } from './finishMaps.js';

/**
 * Hard-surface mining excavator. Track bottoms sit on y=0.
 */
export function createExcavator() {
  const root = new THREE.Group();
  root.name = 'Excavator';

  const yellow = mat(0xe4ae00, 0.05, 0.58);
  const yellowDark = mat(0xc49200, 0.05, 0.64);
  const orange = mat(0xd46512, 0.08, 0.55);
  const black = mat(0x1a1c1e, 0.08, 0.6);
  const steel = mat(0x8a929a, 0.62, 0.38);
  const glass = mat(0x1a2832, 0.3, 0.1, { transparent: true, opacity: 0.5 });
  const track = mat(0x24282c, 0.08, 0.86);

  // —— Tracks (bottom at y=0) ——
  for (const z of [1.65, -1.65]) {
    box(root, track, 0, 0.55, z, 6.4, 1.1, 1.15);
    for (const x of [-2.2, -0.75, 0.75, 2.2]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.05, 10), black);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, 0.42, z);
      root.add(roller);
    }
  }
  box(root, black, 0, 1.05, 0, 5.2, 0.35, 2.6);

  // —— House ——
  const house = new THREE.Group();
  house.name = 'ExcavatorHouse';
  house.position.set(0.25, 1.25, 0);
  root.add(house);

  box(house, yellow, -0.5, 1.35, 0, 4.6, 2.4, 3.2);
  box(house, yellowDark, -0.5, 2.65, 0, 4.75, 0.2, 3.35);
  box(house, glass, 1.75, 1.55, 0, 0.1, 1.5, 2.6);
  box(house, glass, -0.3, 1.6, 1.65, 2.6, 1.15, 0.08);
  box(house, glass, -0.3, 1.6, -1.65, 2.6, 1.15, 0.08);
  box(house, black, -2.5, 1.3, 0, 1.4, 1.8, 2.8);
  box(house, orange, -2.55, 2.5, 0, 1.2, 0.35, 2.4);
  box(house, black, 1.2, 2.85, 0, 0.9, 0.2, 0.35);

  // —— Boom (short enough to bite the bench it stands on) ——
  const boomRoot = new THREE.Group();
  boomRoot.position.set(1.55, 1.85, 0);
  house.add(boomRoot);
  const boom = new THREE.Group();
  boom.name = 'Boom';
  boomRoot.add(boom);
  box(boom, yellow, 1.08, 0.12, 0, 2.16, 0.58, 0.58);
  box(boom, steel, 1.08, 0.44, 0, 1.9, 0.14, 0.14);

  const stickRoot = new THREE.Group();
  stickRoot.position.set(2.15, 0.1, 0);
  boom.add(stickRoot);
  const stick = new THREE.Group();
  stick.name = 'Stick';
  stickRoot.add(stick);
  box(stick, yellowDark, 0.85, -0.08, 0, 1.7, 0.44, 0.44);

  const bucketRoot = new THREE.Group();
  bucketRoot.position.set(1.55, -0.08, 0);
  stick.add(bucketRoot);
  const bucket = new THREE.Group();
  bucket.name = 'Bucket';
  bucketRoot.add(bucket);
  box(bucket, steel, 0.5, -0.35, 0, 1.25, 1.05, 1.45);
  box(bucket, black, 1.1, -0.5, 0, 0.28, 0.7, 1.4);
  for (const z of [-0.48, 0, 0.48]) {
    box(bucket, steel, 1.28, -0.82, z, 0.36, 0.22, 0.22);
  }
  // Broken coal in the bucket — blocks, not spheres
  const lump = mat(0x1c1916, 0.04, 0.94);
  box(bucket, lump, 0.35, -0.05, 0.15, 0.55, 0.32, 0.42);
  box(bucket, lump, 0.55, 0.02, -0.28, 0.38, 0.28, 0.36);
  box(bucket, lump, 0.15, -0.02, -0.05, 0.32, 0.22, 0.3);

  root.userData.house = house;
  root.userData.boom = boom;
  root.userData.stick = stick;
  root.userData.bucket = bucket;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return root;
}

function smooth(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * One dig cycle: lower into the seam, curl, lift, return.
 * t ≈ 0.40 is teeth in the face.
 */
export function tickExcavator(ex, time, loadPoint = null) {
  if (loadPoint && ex.userData.house) {
    const local = ex.worldToLocal(loadPoint.clone());
    ex.userData.house.rotation.y = Math.atan2(-local.z, local.x);
    if (ex.userData.boom) ex.userData.boom.rotation.z = -0.25;
    if (ex.userData.stick) ex.userData.stick.rotation.z = 0.32;
    if (ex.userData.bucket) ex.userData.bucket.rotation.z = -0.6;
    return;
  }
  const t = ((time * 0.16 + (ex.userData.phase || 0)) % 1 + 1) % 1;
  const keys = [
    { t: 0.0, b: -0.22, s: 0.12, k: 0.65 },
    { t: 0.42, b: -0.62, s: 0.38, k: 0.88 },
    { t: 0.58, b: -0.48, s: 0.42, k: -0.15 },
    { t: 0.78, b: 0.06, s: 0.08, k: -0.35 },
    { t: 1.0, b: -0.22, s: 0.12, k: 0.65 },
  ];
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1].t) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.t - a.t || 1;
  const u = smooth(0, 1, (t - a.t) / span);
  const mix = (p, q) => p + (q - p) * u;
  if (ex.userData.house) ex.userData.house.rotation.y = Math.sin(t * Math.PI * 2) * 0.03;
  if (ex.userData.boom) ex.userData.boom.rotation.z = mix(a.b, b.b);
  if (ex.userData.stick) ex.userData.stick.rotation.z = mix(a.s, b.s);
  if (ex.userData.bucket) ex.userData.bucket.rotation.z = mix(a.k, b.k);
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const kind = roughness >= 0.82 ? 'rubber' : metalness >= 0.4 ? 'plate' : 'enamel';
  return applyFinish(material, kind);
}
