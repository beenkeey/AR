import * as THREE from 'three';
import { createExcavator, tickExcavator } from './Excavator.js';

/**
 * Angular pit infrastructure — crusher, conveyor, control tower. No people.
 */
export function createCoalMineComplex() {
  const root = new THREE.Group();
  root.name = 'CoalMineComplex';

  const dirt = mat(0xd47a38, 0.04, 0.9);
  const coal = mat(0x2a2624, 0.04, 0.92);
  const rock = mat(0xc9955c, 0.05, 0.88);
  const yellow = mat(0xf5c400, 0.12, 0.45);
  const orange = mat(0xe86a12, 0.12, 0.48);
  const teal = mat(0x1a8a9e, 0.25, 0.42);
  const metal = mat(0x8a949c, 0.5, 0.35);
  const dark = mat(0x2a3036, 0.35, 0.48);
  const concrete = mat(0xb8b2a8, 0.08, 0.82);
  const led = mat(0x48e0ff, 0.2, 0.3, { emissive: 0x28c8ff, emissiveIntensity: 1.0 });

  // Inner benches — solid closed rings
  const tiers = [
    { y: 0.0, outer: 14, inner: 10, mat: rock },
    { y: -2.4, outer: 10, inner: 6.2, mat: dirt },
    { y: -5.0, outer: 6.2, inner: 0, mat: coal },
  ];
  const segs = 36;
  for (let i = 0; i < tiers.length; i += 1) {
    const t = tiers[i];
    const nextY = tiers[i + 1]?.y ?? (t.y - 2.5);
    const h = t.y - nextY;
    if (t.inner <= 0.01) {
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(t.outer, t.outer, 0.7, segs), t.mat);
      disk.position.y = t.y - 0.25;
      root.add(disk);
    } else {
      const top = new THREE.Mesh(new THREE.RingGeometry(t.inner, t.outer, segs), t.mat);
      top.rotation.x = -Math.PI / 2;
      top.position.y = t.y;
      root.add(top);
      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(t.inner, t.inner, h, segs, 1, true),
        t.mat,
      );
      wall.position.y = t.y - h * 0.5;
      wall.material = t.mat.clone();
      wall.material.side = THREE.DoubleSide;
      root.add(wall);
    }
  }

  for (const [x, z, s] of [[9, -6, 3.0], [-7, -4, 3.4], [5, 7, 2.6]]) {
    const pile = new THREE.Mesh(new THREE.BoxGeometry(s * 1.6, s * 0.9, s * 1.4), coal);
    pile.position.set(x, s * 0.4, z);
    root.add(pile);
  }

  // Conveyor — box truss
  const conv = new THREE.Group();
  box(conv, metal, 0, 0, 0, 22, 0.4, 1.4);
  box(conv, dark, 0, 0.3, 0, 21.5, 0.1, 1.1);
  for (let i = -9; i <= 9; i += 3) {
    box(conv, yellow, i, -0.7, 0.6, 0.18, 1.3, 0.18);
    box(conv, yellow, i, -0.7, -0.6, 0.18, 1.3, 0.18);
  }
  conv.position.set(4, 2.0, -10);
  conv.rotation.y = 0.4;
  conv.rotation.z = 0.1;
  root.add(conv);

  // Crusher building
  box(root, concrete, 10, 3.8, -12, 5.6, 7.6, 5.6);
  box(root, orange, 10, 7.8, -12, 5.9, 0.35, 5.9);
  box(root, yellow, 10, 4.6, -9.15, 3.8, 3.0, 0.2);
  box(root, teal, 10, 9.2, -12, 1.2, 2.4, 1.2);
  box(root, led, 10, 10.6, -12, 0.5, 0.5, 0.5);

  // Control tower
  box(root, concrete, -11, 5.5, 8, 4.6, 11, 4.6);
  box(root, teal, -11, 11.2, 8, 4.9, 0.35, 4.9);
  box(root, yellow, -11, 9.2, 10.35, 3.4, 2.1, 0.15);
  box(root, dark, -11, 13.6, 8, 0.2, 3.0, 0.2);
  box(root, led, -11, 15.2, 8, 0.4, 0.4, 0.4);
  for (const [dx, dz] of [[-1.2, 1.2], [1.2, 1.2], [-1.2, -1.2], [1.2, -1.2]]) {
    box(root, led, -11 + dx, 12.0, 8 + dz, 0.7, 0.2, 0.7);
  }

  // One excavator on upper bench
  const excavators = [];
  const ex = createExcavator();
  ex.position.set(4, -2.4, 1);
  ex.rotation.y = 0.85;
  ex.scale.setScalar(0.85);
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

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
