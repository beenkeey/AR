import * as THREE from 'three';
import { textured } from './surfaceMaps.js';

/**
 * Large open-pit excavator. Autonomous cabin, animated boom + bucket.
 */
export function createExcavator() {
  const root = new THREE.Group();
  root.name = 'Excavator';

  const yellow = std(0xe8b40a, 0.1, 0.48);
  const yellowDark = std(0xc49208, 0.12, 0.52);
  const black = std(0x1a1c1e, 0.28, 0.48);
  const metal = std(0x6a7278, 0.55, 0.38);
  const glass = std(0x152028, 0.55, 0.14, { transparent: true, opacity: 0.4 });
  const sensor = std(0x58c8ff, 0.2, 0.25, { emissive: 0x2aa8ff, emissiveIntensity: 0.8 });
  const track = std(0x222628, 0.15, 0.72);

  // Tracks
  box(root, track, 0, 0.55, 1.85, 6.8, 1.1, 1.35);
  box(root, track, 0, 0.55, -1.85, 6.8, 1.1, 1.35);
  box(root, black, 0, 0.95, 0, 5.6, 0.45, 3.2);
  for (const z of [1.85, -1.85]) {
    for (const x of [-2.4, -0.8, 0.8, 2.4]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.2, 10), metal);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(x, 0.42, z);
      root.add(roller);
    }
  }

  // Slewing house
  const house = new THREE.Group();
  house.name = 'ExcavatorHouse';
  house.position.set(0.4, 1.35, 0);
  root.add(house);

  box(house, yellow, -0.6, 1.2, 0, 4.4, 2.2, 3.4);
  box(house, yellowDark, -0.6, 2.4, 0, 4.5, 0.18, 3.5);
  box(house, glass, 1.55, 1.55, 0, 0.08, 1.4, 2.6);
  box(house, glass, -0.4, 1.6, 1.75, 2.4, 1.1, 0.06);
  box(house, glass, -0.4, 1.6, -1.75, 2.4, 1.1, 0.06);
  box(house, sensor, 1.2, 2.55, 0, 0.9, 0.12, 0.28);
  box(house, black, -2.4, 1.4, 0, 1.2, 1.6, 2.8);
  box(house, yellow, -2.5, 2.55, 0, 1.0, 0.35, 2.2);

  // Boom pivot
  const boomRoot = new THREE.Group();
  boomRoot.name = 'BoomRoot';
  boomRoot.position.set(1.6, 1.6, 0);
  house.add(boomRoot);

  const boom = new THREE.Group();
  boom.name = 'Boom';
  boomRoot.add(boom);
  box(boom, yellow, 2.4, 0.15, 0, 5.2, 0.55, 0.55);
  box(boom, metal, 2.4, 0.55, 0, 4.8, 0.18, 0.18);

  const stickRoot = new THREE.Group();
  stickRoot.position.set(4.9, 0.15, 0);
  boom.add(stickRoot);
  const stick = new THREE.Group();
  stick.name = 'Stick';
  stickRoot.add(stick);
  box(stick, yellow, 2.0, -0.1, 0, 4.2, 0.42, 0.42);

  const bucketRoot = new THREE.Group();
  bucketRoot.position.set(4.05, -0.1, 0);
  stick.add(bucketRoot);
  const bucket = new THREE.Group();
  bucket.name = 'Bucket';
  bucketRoot.add(bucket);
  box(bucket, metal, 0.55, -0.35, 0, 1.35, 1.1, 1.5);
  box(bucket, black, 1.15, -0.55, 0, 0.25, 0.7, 1.45);
  for (const z of [-0.55, 0, 0.55]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.22), metal);
    tooth.position.set(1.35, -0.95, z);
    bucket.add(tooth);
  }

  root.userData.house = house;
  root.userData.boom = boom;
  root.userData.stick = stick;
  root.userData.bucket = bucket;
  root.userData.phase = Math.random() * Math.PI * 2;

  return root;
}

export function tickExcavator(ex, time) {
  const phase = (ex.userData.phase || 0) + time;
  const house = ex.userData.house;
  const boom = ex.userData.boom;
  const stick = ex.userData.stick;
  const bucket = ex.userData.bucket;
  if (house) house.rotation.y = Math.sin(phase * 0.18) * 0.55;
  if (boom) boom.rotation.z = -0.35 + Math.sin(phase * 0.55) * 0.28;
  if (stick) stick.rotation.z = 0.55 + Math.sin(phase * 0.55 + 0.8) * 0.35;
  if (bucket) bucket.rotation.z = 0.2 + Math.sin(phase * 0.55 + 1.4) * 0.45;
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function std(color, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  if (!extra.transparent && !extra.emissive) {
    textured(material, metalness > 0.22 ? 'metal' : 'paint');
  }
  return material;
}
