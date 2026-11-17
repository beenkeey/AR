import * as THREE from 'three';
import { textured } from './surfaceMaps.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1);

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

/** Legacy tank farm (kept for old branch assets). */
export function createFieldYard() {
  return createCoalYard();
}

/** Coal stockyard on the quarry rim (not outside the pit area). */
export function createCoalYard() {
  const root = new THREE.Group();
  root.name = 'CoalYard';
  // Rim positions relative to scene; pit center is shifted in CoalMineWorld
  root.add(createStockyard(-78, -18));
  root.add(createStockyard(72, -40));
  return root;
}

function createStockyard(x, z) {
  const g = new THREE.Group();
  g.name = 'CoalStockyard';
  g.position.set(x, 0, z);
  const shell = steel(0x6a7278, 0.4, 0.42, 'metal');
  const ring = steel(0x8e979e, 0.45, 0.38, 'metal');
  const berm = steel(0x5a4a38, 0.08, 0.92, 'rock');
  const coal = steel(0x1c1a18, 0.04, 0.94, 'rock');
  const yellow = steel(0xe8b40a, 0.1, 0.5, 'paint');
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
    cyl(g, coal, tx, 0.22, tz, 3.14, 0.44);
    cyl(g, ring, tx, h + 0.08, tz, 3.18, 0.16);
    cyl(g, ring, tx, h * 0.45, tz, 3.16, 0.1);
    cyl(g, yellow, tx + 3.35, 1.4, tz, 0.09, 2.8);
  });
  // Loose coal mounds
  for (const [tx, tz, s] of [[22, 4, 4], [2, 14, 3.2], [12, -4, 3.8]]) {
    const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), coal);
    pile.position.set(tx, s * 0.32, tz);
    pile.scale.set(s, s * 0.5, s * 0.85);
    g.add(pile);
  }
  return g;
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
