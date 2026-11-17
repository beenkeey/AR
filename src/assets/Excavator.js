import * as THREE from 'three';

/**
 * Open-pit excavator — yellow/orange, rounded cabin, animated boom.
 */
export function createExcavator() {
  const root = new THREE.Group();
  root.name = 'Excavator';

  const yellow = mat(0xffc400, 0.12, 0.45);
  const orange = mat(0xff6a1a, 0.1, 0.48);
  const black = mat(0x1e2226, 0.28, 0.5);
  const metal = mat(0x9aa3aa, 0.55, 0.35);
  const glass = mat(0x6ec8ff, 0.15, 0.14, { transparent: true, opacity: 0.42 });
  const track = mat(0x2a2e32, 0.2, 0.7);
  const sensor = mat(0x3ad0ff, 0.15, 0.25, { emissive: 0x1ab8ff, emissiveIntensity: 0.9 });

  // Tracks
  for (const z of [1.7, -1.7]) {
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 5.2, 4, 10), track);
    shoe.rotation.z = Math.PI / 2;
    shoe.position.set(0, 0.55, z);
    root.add(shoe);
  }
  const belly = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.4, 2.8), black);
  belly.position.set(0, 0.95, 0);
  root.add(belly);

  const house = new THREE.Group();
  house.name = 'ExcavatorHouse';
  house.position.set(0.3, 1.35, 0);
  root.add(house);

  const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 1.6, 5, 12), yellow);
  cabin.rotation.z = Math.PI / 2;
  cabin.position.set(-0.4, 1.35, 0);
  cabin.scale.set(1, 1.05, 1.15);
  house.add(cabin);
  const roof = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), orange);
  roof.position.set(-0.4, 2.45, 0);
  roof.scale.set(1.05, 0.35, 1.1);
  house.add(roof);
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), glass);
  win.position.set(1.15, 1.55, 0);
  win.scale.set(0.45, 0.85, 1.05);
  house.add(win);
  const counter = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), yellow);
  counter.position.set(-2.3, 1.2, 0);
  counter.scale.set(0.9, 0.85, 1.05);
  house.add(counter);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), sensor);
  dish.position.set(0.6, 2.7, 0);
  dish.scale.set(1, 0.4, 1);
  house.add(dish);

  const boomRoot = new THREE.Group();
  boomRoot.position.set(1.5, 1.7, 0);
  house.add(boomRoot);
  const boom = new THREE.Group();
  boom.name = 'Boom';
  boomRoot.add(boom);
  const boomArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 4.6, 4, 8), yellow);
  boomArm.rotation.z = Math.PI / 2;
  boomArm.position.set(2.3, 0.1, 0);
  boom.add(boomArm);

  const stickRoot = new THREE.Group();
  stickRoot.position.set(4.7, 0.1, 0);
  boom.add(stickRoot);
  const stick = new THREE.Group();
  stick.name = 'Stick';
  stickRoot.add(stick);
  const stickArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 3.6, 4, 8), orange);
  stickArm.rotation.z = Math.PI / 2;
  stickArm.position.set(1.85, -0.05, 0);
  stick.add(stickArm);

  const bucketRoot = new THREE.Group();
  bucketRoot.position.set(3.75, -0.05, 0);
  stick.add(bucketRoot);
  const bucket = new THREE.Group();
  bucket.name = 'Bucket';
  bucketRoot.add(bucket);
  const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), metal);
  scoop.position.set(0.45, -0.35, 0);
  scoop.scale.set(1.15, 0.85, 1.25);
  bucket.add(scoop);
  for (const z of [-0.45, 0, 0.45]) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), metal);
    tooth.rotation.z = Math.PI / 2;
    tooth.position.set(1.15, -0.55, z);
    bucket.add(tooth);
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
  const house = ex.userData.house;
  const boom = ex.userData.boom;
  const stick = ex.userData.stick;
  const bucket = ex.userData.bucket;
  if (house) house.rotation.y = Math.sin(phase * 0.18) * 0.45;
  if (boom) boom.rotation.z = -0.32 + Math.sin(phase * 0.55) * 0.25;
  if (stick) stick.rotation.z = 0.5 + Math.sin(phase * 0.55 + 0.8) * 0.32;
  if (bucket) bucket.rotation.z = 0.15 + Math.sin(phase * 0.55 + 1.4) * 0.4;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
