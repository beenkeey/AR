import * as THREE from 'three';

/**
 * Low-profile centerpiece only (no tall towers in the truck path).
 * Rim buildings live in CoalMineWorld.
 */
export function createCoalMineComplex() {
  const root = new THREE.Group();
  root.name = 'CoalMineComplex';

  const coal = mat(0x2a2622, 0.05, 0.92);
  const dirt = mat(0xc46a38, 0.05, 0.88);
  const rock = mat(0xb88955, 0.05, 0.9);
  const yellow = mat(0xf0c000, 0.15, 0.45);
  const metal = mat(0x8a949c, 0.5, 0.35);

  // Shallow center bowl — stays below BelAZ roads after scale
  const segs = 36;
  const tiers = [
    { y: 0.0, outer: 10, inner: 6 },
    { y: -1.8, outer: 6, inner: 3 },
    { y: -3.4, outer: 3, inner: 0 },
  ];
  for (let i = 0; i < tiers.length; i += 1) {
    const t = tiers[i];
    const nextY = tiers[i + 1]?.y ?? (t.y - 1.6);
    const h = Math.max(0.4, t.y - nextY);
    const m = i === tiers.length - 1 ? coal : i === 0 ? rock : dirt;
    if (t.inner < 0.05) {
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(t.outer, t.outer, 0.5, segs), m);
      disk.position.y = t.y - 0.2;
      root.add(disk);
    } else {
      const top = new THREE.Mesh(new THREE.RingGeometry(t.inner, t.outer, segs), m);
      top.rotation.x = -Math.PI / 2;
      top.position.y = t.y;
      root.add(top);
      const wall = new THREE.Mesh(
        new THREE.CylinderGeometry(t.inner, t.inner, h, segs, 1, true),
        m,
      );
      wall.position.y = t.y - h * 0.5;
      wall.material = m.clone();
      wall.material.side = THREE.DoubleSide;
      root.add(wall);
    }
  }

  // Small marker beacon (not a building BelAZ can hit)
  box(root, yellow, 0, 1.2, 0, 0.35, 2.4, 0.35);
  box(root, metal, 0, 2.5, 0, 0.8, 0.2, 0.8);

  for (const [x, z, s] of [[6, 4, 2.2], [-5, -3, 2.5], [3, -5, 1.8]]) {
    const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), coal);
    pile.position.set(x, s * 0.35, z);
    pile.scale.set(s, s * 0.5, s * 0.85);
    root.add(pile);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(12, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 }),
  );
  shadow.name = 'ContactShadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const stats = measureRig(root);
  root.userData.triangles = stats.triangles;
  root.userData.height = stats.height;
  root.userData.tick = () => {};
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
