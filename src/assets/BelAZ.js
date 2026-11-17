import * as THREE from 'three';

/**
 * Hard-surface BelAZ mining dump truck (reference: yellow hopper, cab canopy,
 * blue stairs/rails, dual rear tires). Nose toward local +X. Ground at y=0.
 */
export function createBelAZ() {
  const root = new THREE.Group();
  root.name = 'BelAZ';

  const yellow = mat(0xf5c400, 0.18, 0.48);
  const yellowDark = mat(0xd4a200, 0.2, 0.52);
  const blue = mat(0x1a4a9e, 0.25, 0.4);
  const blueDark = mat(0x0e2f6e, 0.3, 0.42);
  const chassis = mat(0x3a4048, 0.45, 0.4);
  const steel = mat(0x8a929a, 0.55, 0.35);
  const black = mat(0x1a1c1e, 0.2, 0.55);
  const rubber = mat(0x121416, 0.04, 0.88);
  const glass = mat(0x1a2832, 0.35, 0.15, { transparent: true, opacity: 0.55 });
  const coal = mat(0x2a2622, 0.05, 0.92);
  const lamp = mat(0xfff4d0, 0.05, 0.3, { emissive: 0xffe09a, emissiveIntensity: 0.7 });
  const red = mat(0xc4281c, 0.15, 0.45);

  // —— Chassis ——
  box(root, chassis, 0.2, 1.05, 0, 10.8, 0.45, 3.6);
  box(root, black, 0.2, 0.72, 0, 10.2, 0.22, 2.6);
  box(root, steel, 3.8, 1.35, 0, 2.2, 0.35, 3.8);

  // Front bumper / axle beam
  box(root, chassis, 5.4, 0.95, 0, 1.2, 0.5, 3.9);
  box(root, blueDark, 6.05, 1.55, 0, 0.18, 1.5, 3.5); // radiator face
  // Grill bars
  for (let i = -4; i <= 4; i += 1) {
    box(root, blue, 6.12, 1.55, i * 0.35, 0.06, 1.25, 0.12);
  }
  box(root, lamp, 6.15, 1.15, 1.15, 0.12, 0.35, 0.55);
  box(root, lamp, 6.15, 1.15, -1.15, 0.12, 0.35, 0.55);
  box(root, black, 6.1, 2.15, 0, 0.1, 0.25, 2.2);

  // —— Cab (left-biased like real BelAZ) ——
  box(root, yellow, 4.55, 2.55, -0.55, 2.4, 2.35, 2.2);
  box(root, yellowDark, 4.55, 3.8, -0.55, 2.5, 0.18, 2.3);
  box(root, glass, 5.78, 2.7, -0.55, 0.08, 1.35, 1.9);
  box(root, glass, 4.55, 2.75, 0.58, 1.8, 1.1, 0.08);
  box(root, glass, 4.55, 2.75, -1.68, 1.8, 1.1, 0.08);
  box(root, black, 5.85, 1.85, -0.55, 0.15, 0.4, 1.6);

  // Platform + blue stairs / rails (right of cab)
  box(root, yellowDark, 4.7, 2.05, 1.35, 2.6, 0.12, 1.1);
  // Stair steps
  for (let i = 0; i < 5; i += 1) {
    box(root, blue, 5.95 - i * 0.15, 0.55 + i * 0.35, 1.55, 0.55, 0.08, 0.7);
  }
  // Handrails
  box(root, blue, 5.5, 2.55, 1.85, 0.08, 1.6, 0.08);
  box(root, blue, 5.5, 2.55, 0.95, 0.08, 1.6, 0.08);
  box(root, blue, 5.5, 3.35, 1.4, 0.08, 0.08, 0.95);
  box(root, blue, 4.2, 2.9, 1.85, 1.8, 0.08, 0.08);
  box(root, red, 5.2, 2.35, 1.75, 0.25, 0.45, 0.25);

  // —— Dump body (angular hopper + canopy over cab) ——
  const bed = new THREE.Group();
  bed.name = 'DumpBed';
  // Main hopper sides
  box(bed, yellow, -1.1, 3.1, 0, 7.6, 3.4, 4.2);
  // Inner coal
  box(bed, coal, -1.1, 2.85, 0, 6.8, 2.6, 3.4);
  // Floor of hopper
  box(bed, yellowDark, -1.1, 1.55, 0, 7.4, 0.25, 4.0);
  // Rear panel
  box(bed, yellow, -5.05, 2.9, 0, 0.28, 3.0, 4.15);
  // Side ribs
  for (const z of [1.95, -1.95]) {
    box(bed, yellowDark, -1.1, 3.2, z, 7.2, 0.22, 0.18);
    box(bed, yellowDark, -1.1, 2.2, z, 7.2, 0.18, 0.14);
  }
  for (let i = 0; i < 5; i += 1) {
    box(bed, yellowDark, -3.8 + i * 1.4, 3.3, 0, 0.16, 2.8, 4.15);
  }
  // Canopy over cab (signature BelAZ look)
  box(bed, yellow, 4.0, 4.35, 0, 3.6, 0.28, 4.3);
  box(bed, yellowDark, 5.5, 3.9, 0, 0.35, 1.0, 4.1);
  // Front lip of hopper
  box(bed, yellow, 2.6, 4.0, 0, 0.35, 1.6, 4.25);
  root.add(bed);
  root.userData.bed = bed;

  // —— Wheels: 1 front axle + dual rear ——
  // Front
  addWheel(root, 4.55, 1.05, 2.05, rubber, yellow, steel);
  addWheel(root, 4.55, 1.05, -2.05, rubber, yellow, steel);
  // Rear dual
  for (const x of [-1.6, -3.5]) {
    addWheel(root, x, 1.15, 2.15, rubber, yellow, steel, 1.15);
    addWheel(root, x, 1.15, 1.35, rubber, yellow, steel, 1.15);
    addWheel(root, x, 1.15, -1.35, rubber, yellow, steel, 1.15);
    addWheel(root, x, 1.15, -2.15, rubber, yellow, steel, 1.15);
  }
  // Axles
  for (const x of [4.55, -1.6, -3.5]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 8), steel);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, x > 0 ? 1.05 : 1.15, 0);
    root.add(axle);
  }

  // Mirror / sensors
  box(root, black, 5.7, 3.2, 0.7, 0.15, 0.35, 0.2);
  box(root, black, 5.7, 3.2, -1.5, 0.15, 0.35, 0.2);

  root.userData.eyeLocal = new THREE.Vector3(4.4, 4.2, -0.4);
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return root;
}

function addWheel(parent, x, y, z, rubber, hubMat, steel, radius = 1.05) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.72, 18), rubber);
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, 0.78, 12), hubMat);
  hub.rotation.x = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, 0.82, 10), steel);
  cap.rotation.x = Math.PI / 2;
  g.add(tire, hub, cap);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
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
