import * as THREE from 'three';
import { textured } from './surfaceMaps.js';
import { createExcavator, tickExcavator } from './Excavator.js';

/**
 * Infrastructure inside the open-pit quarry: crusher, conveyors, control tower.
 * No people. Scaled by ExhibitionScene to exhibition.hugeHeight.
 */
export function createCoalMineComplex() {
  const root = new THREE.Group();
  root.name = 'CoalMineComplex';

  const dirt = steel(0x5a4a38, 0.05, 0.92, 'rock');
  const coal = steel(0x1a1816, 0.04, 0.95, 'rock');
  const rock = steel(0x6a6258, 0.08, 0.88, 'rock');
  const yellow = steel(0xe8b40a, 0.1, 0.5, 'paint');
  const metal = steel(0x7a8288, 0.5, 0.4, 'metal');
  const dark = steel(0x2a2e32, 0.35, 0.48, 'metal');
  const concrete = steel(0x8a8680, 0.08, 0.85, 'rock');
  const led = new THREE.MeshStandardMaterial({
    color: 0x48e0ff,
    emissive: 0x28c8ff,
    emissiveIntensity: 1.0,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Compact inner pit benches (sits in the middle of the world quarry)
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
    ring.receiveShadow = true;
    pit.add(ring);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(t.r - 0.3, 32), t.c);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = t.y - t.h * 0.5 + 0.02;
    floor.receiveShadow = true;
    pit.add(floor);
  }
  root.add(pit);

  // Coal stockpiles inside
  for (const [x, z, s] of [[9, -6, 3.5], [-8, -5, 4], [5, 8, 3.2], [-4, 6, 2.8]]) {
    const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), coal);
    pile.position.set(x, s * 0.32, z);
    pile.scale.set(s, s * 0.5, s * 0.85);
    pile.castShadow = true;
    root.add(pile);
  }

  // Conveyor climbing out of the pit
  const conv = new THREE.Group();
  conv.name = 'Conveyor';
  box(conv, metal, 0, 0, 0, 22, 0.35, 1.35);
  box(conv, dark, 0, 0.28, 0, 21.5, 0.08, 1.05);
  for (let i = -9; i <= 9; i += 3) {
    box(conv, yellow, i, -0.55, 0.65, 0.16, 1.1, 0.16);
    box(conv, yellow, i, -0.55, -0.65, 0.16, 1.1, 0.16);
  }
  conv.position.set(4, 1.8, -10);
  conv.rotation.y = 0.4;
  conv.rotation.z = 0.12;
  root.add(conv);

  // Crusher / transfer on the upper bench
  box(root, concrete, 10, 3.8, -12, 5.5, 7.6, 5.5);
  box(root, dark, 10, 7.8, -12, 5.8, 0.3, 5.8);
  box(root, yellow, 10, 4.5, -9.2, 3.6, 3.0, 0.18);
  box(root, metal, 10, 9.0, -12, 1.1, 2.2, 1.1);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), led);
  beacon.position.set(10, 10.4, -12);
  root.add(beacon);

  // Autonomous control tower on rim of complex
  box(root, concrete, -11, 5.5, 8, 4.5, 11, 4.5);
  box(root, dark, -11, 11.2, 8, 4.8, 0.28, 4.8);
  box(root, yellow, -11, 9.2, 10.3, 3.2, 2.0, 0.14);
  for (const [dx, dz] of [[-1.1, 1.1], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1]]) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), led);
    dish.position.set(-11 + dx, 12.1, 8 + dz);
    dish.scale.set(1, 0.4, 1);
    root.add(dish);
  }
  box(root, dark, -11, 13.4, 8, 0.18, 2.8, 0.18);
  const topLed = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), led);
  topLed.position.set(-11, 15.0, 8);
  root.add(topLed);

  // Excavators working the complex benches
  const excavators = [];
  const exPoses = [
    { x: 3, y: -2.2, z: -1, yaw: 0.9, s: 0.95 },
    { x: -5, y: -4.8, z: 2, yaw: -1.2, s: 0.85 },
  ];
  for (const p of exPoses) {
    const ex = createExcavator();
    ex.position.set(p.x, p.y, p.z);
    ex.rotation.y = p.yaw;
    ex.scale.setScalar(p.s);
    root.add(ex);
    excavators.push(ex);
  }
  root.userData.excavators = excavators;
  root.userData.tick = (time) => {
    for (const ex of excavators) tickExcavator(ex, time);
  };

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(16, 36),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 }),
  );
  shadow.name = 'ContactShadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const stats = measureRig(root);
  root.userData.triangles = stats.triangles;
  root.userData.height = stats.height;
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

function box(parent, mat, x, y, z, sx, sy, sz, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function steel(color, metalness, roughness, kind = 'paint') {
  return textured(
    new THREE.MeshStandardMaterial({ color, metalness, roughness }),
    kind,
  );
}
