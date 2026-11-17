import * as THREE from 'three';
import { textured } from './surfaceMaps.js';

/**
 * Large autonomous BelAZ dump truck. Cab is sealed / unmanned look.
 * Length along +X, nose toward +X.
 */
export function createBelAZ() {
  const group = new THREE.Group();
  group.name = 'BelAZ';

  const yellow = std(0xe8b40a, 0.1, 0.48);
  const yellowDark = std(0xc49208, 0.1, 0.52);
  const black = std(0x1a1c1e, 0.22, 0.5);
  const chassis = std(0x2a2e32, 0.32, 0.46);
  const glass = std(0x152028, 0.6, 0.12, { transparent: true, opacity: 0.42 });
  const rubber = std(0x101010, 0.04, 0.86);
  const rim = std(0x3a4046, 0.42, 0.36);
  const coal = std(0x1c1a18, 0.04, 0.92);
  const light = std(0xfff0c0, 0.08, 0.28, { emissive: 0xffd878, emissiveIntensity: 0.55 });
  const sensor = std(0x58c8ff, 0.2, 0.25, { emissive: 0x2aa8ff, emissiveIntensity: 0.85 });

  box(group, chassis, 0.2, 1.05, 0, 11.2, 0.35, 4.4);
  box(group, black, 0.1, 0.72, 0, 10.6, 0.22, 3.2);

  // Cab (no human silhouette — dark glass + sensor bar)
  box(group, yellow, 4.55, 2.55, 0, 2.8, 2.6, 4.0);
  box(group, yellowDark, 4.55, 3.9, 0, 2.85, 0.18, 4.1);
  box(group, glass, 5.95, 2.85, 0, 0.08, 1.55, 3.4);
  box(group, glass, 4.55, 2.9, 2.05, 2.1, 1.2, 0.06);
  box(group, glass, 4.55, 2.9, -2.05, 2.1, 1.2, 0.06);
  box(group, black, 5.98, 1.7, 0, 0.12, 0.55, 2.2);
  box(group, light, 6.05, 1.55, 1.15, 0.1, 0.28, 0.55);
  box(group, light, 6.05, 1.55, -1.15, 0.1, 0.28, 0.55);
  box(group, sensor, 5.2, 4.05, 0, 1.4, 0.12, 0.35);
  box(group, sensor, 5.85, 3.35, 0, 0.18, 0.18, 0.18);

  // Dump body
  const bed = new THREE.Group();
  bed.name = 'DumpBed';
  box(bed, yellow, -1.6, 2.35, 0, 7.4, 2.8, 4.35);
  box(bed, yellowDark, -1.6, 3.85, 0, 7.5, 0.16, 4.45);
  box(bed, yellow, -5.2, 2.5, 0, 0.22, 2.5, 4.2);
  box(bed, coal, -1.55, 2.55, 0, 6.6, 2.1, 3.7);
  group.add(bed);
  group.userData.bed = bed;

  // Wheels — 6 axles look for mining truck mass
  const axles = [4.4, 2.6, 0.2, -1.8, -3.6, -5.0];
  for (const x of axles) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8), rim);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, 0.95, 0);
    group.add(axle);
    group.add(wheel(x, 0.95, 2.05, rubber, rim));
    group.add(wheel(x, 0.95, -2.05, rubber, rim));
  }

  // Autopilot roof mast
  box(group, black, 4.55, 4.45, 0, 0.12, 0.95, 0.12);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), sensor);
  dish.position.set(4.55, 5.05, 0);
  dish.scale.set(1, 0.55, 1);
  group.add(dish);

  group.userData.eyeLocal = new THREE.Vector3(4.2, 4.6, 0);
  return group;
}

function wheel(x, y, z, rubber, rim) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.72, 16), rubber);
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.76, 12), rim);
  hub.rotation.x = Math.PI / 2;
  g.add(tire, hub);
  g.position.set(x, y, z);
  return g;
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
