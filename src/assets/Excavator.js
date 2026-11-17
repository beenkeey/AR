import * as THREE from 'three';

/**
 * Hard-surface mining excavator. Track bottoms sit on y=0.
 */
export function createExcavator() {
  const root = new THREE.Group();
  root.name = 'Excavator';

  const yellow = mat(0xf5c400, 0.18, 0.48);
  const yellowDark = mat(0xd4a200, 0.2, 0.5);
  const orange = mat(0xe86a12, 0.15, 0.5);
  const black = mat(0x1a1c1e, 0.25, 0.5);
  const steel = mat(0x8a929a, 0.55, 0.35);
  const glass = mat(0x1a2832, 0.3, 0.15, { transparent: true, opacity: 0.5 });
  const track = mat(0x2a2e32, 0.2, 0.72);

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

  // —— Boom ——
  const boomRoot = new THREE.Group();
  boomRoot.position.set(1.7, 1.7, 0);
  house.add(boomRoot);
  const boom = new THREE.Group();
  boom.name = 'Boom';
  boomRoot.add(boom);
  box(boom, yellow, 2.5, 0.2, 0, 5.2, 0.65, 0.65);
  box(boom, steel, 2.5, 0.6, 0, 4.6, 0.18, 0.18);

  const stickRoot = new THREE.Group();
  stickRoot.position.set(5.0, 0.2, 0);
  boom.add(stickRoot);
  const stick = new THREE.Group();
  stick.name = 'Stick';
  stickRoot.add(stick);
  box(stick, yellowDark, 2.0, -0.15, 0, 4.2, 0.5, 0.5);

  const bucketRoot = new THREE.Group();
  bucketRoot.position.set(4.1, -0.15, 0);
  stick.add(bucketRoot);
  const bucket = new THREE.Group();
  bucket.name = 'Bucket';
  bucketRoot.add(bucket);
  box(bucket, steel, 0.55, -0.4, 0, 1.4, 1.2, 1.55);
  box(bucket, black, 1.2, -0.55, 0, 0.3, 0.75, 1.5);
  for (const z of [-0.5, 0, 0.5]) {
    box(bucket, steel, 1.4, -0.95, z, 0.4, 0.25, 0.25);
  }

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

export function tickExcavator(ex, time) {
  const phase = (ex.userData.phase || 0) + time;
  if (ex.userData.house) ex.userData.house.rotation.y = Math.sin(phase * 0.15) * 0.4;
  if (ex.userData.boom) ex.userData.boom.rotation.z = -0.28 + Math.sin(phase * 0.5) * 0.22;
  if (ex.userData.stick) ex.userData.stick.rotation.z = 0.45 + Math.sin(phase * 0.5 + 0.7) * 0.28;
  if (ex.userData.bucket) ex.userData.bucket.rotation.z = 0.12 + Math.sin(phase * 0.5 + 1.3) * 0.35;
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
