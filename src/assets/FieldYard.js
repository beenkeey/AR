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

/** Tank farm beside the rig. */
export function createFieldYard() {
  const root = new THREE.Group();
  root.name = 'FieldYard';
  root.add(createTankFarm(-36, -48));
  return root;
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
