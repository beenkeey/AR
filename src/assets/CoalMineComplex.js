import * as THREE from 'three';
import { createExcavator, tickExcavator } from './Excavator.js';

/**
 * Colorful pit infrastructure: crusher, conveyors, control tower. No people.
 */
export function createCoalMineComplex() {
  const root = new THREE.Group();
  root.name = 'CoalMineComplex';

  const dirt = mat(0xe08940, 0.04, 0.9);
  const coal = mat(0x2e2a28, 0.04, 0.92);
  const rock = mat(0xd4a574, 0.05, 0.88);
  const yellow = mat(0xffc400, 0.1, 0.45);
  const orange = mat(0xff6a1a, 0.1, 0.48);
  const teal = mat(0x1ec8b0, 0.2, 0.42);
  const metal = mat(0xa8b2ba, 0.5, 0.35);
  const dark = mat(0x3a424a, 0.35, 0.48);
  const concrete = mat(0xc8c2b8, 0.08, 0.82);
  const led = mat(0x48e0ff, 0.2, 0.3, { emissive: 0x28c8ff, emissiveIntensity: 1.1 });

  const pit = new THREE.Group();
  pit.name = 'InnerPit';
  const tiers = [
    { y: 0.2, r: 14, h: 0.6, c: rock },
    { y: -2.2, r: 10, h: 2.4, c: dirt },
    { y: -4.8, r: 6.5, h: 2.6, c: coal },
  ];
  for (const t of tiers) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(t.r, t.r + 0.8, t.h, 36, 1, true),
      t.c,
    );
    ring.position.y = t.y;
    pit.add(ring);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(t.r - 0.3, 32), t.c);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = t.y - t.h * 0.5 + 0.02;
    pit.add(floor);
  }
  root.add(pit);

  for (const [x, z, s] of [[9, -6, 3.2], [-8, -5, 3.6], [5, 8, 2.8]]) {
    const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), coal);
    pile.position.set(x, s * 0.32, z);
    pile.scale.set(s, s * 0.5, s * 0.85);
    root.add(pile);
  }

  const conv = new THREE.Group();
  conv.name = 'Conveyor';
  const belt = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 20, 4, 10), metal);
  belt.rotation.z = Math.PI / 2;
  conv.add(belt);
  const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 19.5, 4, 8), dark);
  top.rotation.z = Math.PI / 2;
  top.position.y = 0.25;
  conv.add(top);
  for (let i = -9; i <= 9; i += 3) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8), yellow);
    leg.position.set(i, -0.7, 0.55);
    conv.add(leg);
    const leg2 = leg.clone();
    leg2.position.z = -0.55;
    conv.add(leg2);
  }
  conv.position.set(4, 1.8, -10);
  conv.rotation.y = 0.4;
  conv.rotation.z = 0.12;
  root.add(conv);

  // Crusher — rounded tower
  const crusher = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 7.6, 16), concrete);
  crusher.position.set(10, 3.8, -12);
  root.add(crusher);
  const crusherRoof = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 10), orange);
  crusherRoof.position.set(10, 7.9, -12);
  crusherRoof.scale.set(1, 0.35, 1);
  root.add(crusherRoof);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 0.15), yellow);
  panel.position.set(10, 4.5, -9.15);
  root.add(panel);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.4, 10), teal);
  stack.position.set(10, 9.2, -12);
  root.add(stack);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), led);
  beacon.position.set(10, 10.6, -12);
  root.add(beacon);

  // Control tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 11, 14), concrete);
  tower.position.set(-11, 5.5, 8);
  root.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.SphereGeometry(2.3, 14, 10), teal);
  towerRoof.position.set(-11, 11.3, 8);
  towerRoof.scale.set(1, 0.4, 1);
  root.add(towerRoof);
  const glassBand = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.35, 8, 20), mat(0x6ec8ff, 0.15, 0.2, { transparent: true, opacity: 0.5 }));
  glassBand.position.set(-11, 9.2, 8);
  glassBand.rotation.x = Math.PI / 2;
  root.add(glassBand);
  for (const [dx, dz] of [[-1.0, 1.0], [1.0, 1.0], [-1.0, -1.0], [1.0, -1.0]]) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), led);
    dish.position.set(-11 + dx, 12.2, 8 + dz);
    dish.scale.set(1, 0.4, 1);
    root.add(dish);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 8), dark);
  mast.position.set(-11, 13.5, 8);
  root.add(mast);
  const topLed = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), led);
  topLed.position.set(-11, 15.1, 8);
  root.add(topLed);

  // One excavator on the complex bench only
  const excavators = [];
  const ex = createExcavator();
  ex.position.set(3, -2.2, -1);
  ex.rotation.y = 0.9;
  ex.scale.setScalar(0.9);
  root.add(ex);
  excavators.push(ex);
  root.userData.excavators = excavators;
  root.userData.tick = (time) => {
    for (const item of excavators) tickExcavator(item, time);
  };

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(16, 36),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
  );
  shadow.name = 'ContactShadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const stats = measureRig(root);
  root.userData.triangles = stats.triangles;
  root.userData.height = stats.height;
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return root;
}

export function measureRig(root) {
  let triangles = 0;
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const idx = n.geometry.index;
    const pos = n.geometry.attributes.position;
    triangles += idx ? idx.count / 3 : pos.count / 3;
  });
  const box3 = new THREE.Box3().setFromObject(root);
  const size = box3.getSize(new THREE.Vector3());
  return { triangles: Math.round(triangles), height: size.y };
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
