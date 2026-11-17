import * as THREE from 'three';

/**
 * BelAZ 75710-style mining dump truck (hard-surface).
 * Nose = local +X. Track/tire contact ≈ y=0.
 * Reference: yellow hopper + canopy, left-side cab, blue stairs/rails, dual rear.
 */
export function createBelAZ() {
  const root = new THREE.Group();
  root.name = 'BelAZ';

  const Y = mat(0xf0c000, 0.22, 0.46);
  const Yd = mat(0xd4a000, 0.24, 0.5);
  const Blu = mat(0x1a4fad, 0.28, 0.38);
  const BluD = mat(0x0d3278, 0.32, 0.4);
  const Ch = mat(0x3a4149, 0.48, 0.38);
  const St = mat(0x9aa3ab, 0.58, 0.32);
  const Blk = mat(0x17191b, 0.18, 0.55);
  const Rub = mat(0x0e1012, 0.04, 0.9);
  const Gl = mat(0x152028, 0.4, 0.12, { transparent: true, opacity: 0.55 });
  const Coal = mat(0x24201c, 0.05, 0.92);
  const Lamp = mat(0xfff1c8, 0.05, 0.28, { emissive: 0xffd88a, emissiveIntensity: 0.75 });
  const Red = mat(0xc42018, 0.15, 0.45);

  // —— Frame / belly ——
  box(root, Ch, 0.0, 1.15, 0, 11.2, 0.55, 3.5);
  box(root, Blk, 0.0, 0.78, 0, 10.6, 0.28, 2.4);
  box(root, St, -2.4, 1.55, 0, 4.8, 0.35, 3.7);

  // Front end / radiator
  box(root, Y, 5.15, 1.85, 0, 1.9, 2.1, 3.85);
  box(root, BluD, 6.12, 1.95, 0, 0.14, 1.85, 3.55);
  for (let i = -5; i <= 5; i += 1) {
    box(root, Blu, 6.2, 1.95, i * 0.3, 0.05, 1.55, 0.1);
  }
  box(root, Blk, 6.18, 2.75, 0, 0.1, 0.22, 2.4);
  box(root, Lamp, 6.22, 1.35, 1.25, 0.12, 0.42, 0.55);
  box(root, Lamp, 6.22, 1.35, -1.25, 0.12, 0.42, 0.55);
  box(root, Blk, 5.7, 0.95, 0, 0.9, 0.35, 3.9);

  // —— Cab (left / −Z) ——
  box(root, Y, 4.35, 3.05, -0.75, 2.55, 2.55, 2.15);
  box(root, Yd, 4.35, 4.4, -0.75, 2.65, 0.16, 2.25);
  box(root, Gl, 5.65, 3.25, -0.75, 0.08, 1.45, 1.85);
  box(root, Gl, 4.4, 3.3, 0.35, 1.9, 1.2, 0.07);
  box(root, Gl, 4.4, 3.3, -1.85, 1.9, 1.2, 0.07);
  box(root, Blk, 5.72, 2.25, -0.75, 0.12, 0.45, 1.5);

  // Deck + stairs on +Z side
  box(root, Yd, 4.5, 2.45, 1.45, 2.8, 0.14, 1.25);
  for (let i = 0; i < 6; i += 1) {
    box(root, Blu, 6.05 - i * 0.18, 0.45 + i * 0.35, 1.65, 0.7, 0.09, 0.85);
  }
  // Vertical rails
  box(root, Blu, 5.55, 3.15, 2.0, 0.07, 1.9, 0.07);
  box(root, Blu, 5.55, 3.15, 1.05, 0.07, 1.9, 0.07);
  box(root, Blu, 5.55, 4.1, 1.52, 0.07, 0.07, 1.0);
  box(root, Blu, 4.1, 3.45, 2.0, 2.2, 0.07, 0.07);
  box(root, Blu, 3.2, 3.45, 1.5, 0.07, 0.07, 1.05);
  // Diagonal front ladder rails
  box(root, Blu, 5.85, 1.6, 2.05, 0.07, 2.4, 0.07);
  box(root, Red, 5.15, 2.75, 1.9, 0.28, 0.5, 0.28);
  box(root, Red, 4.75, 2.75, 1.9, 0.28, 0.5, 0.28);

  // —— Dump hopper ——
  const bed = new THREE.Group();
  bed.name = 'DumpBed';
  // Outer shell
  box(bed, Y, -1.35, 3.55, 0, 8.0, 3.9, 4.35);
  // Beveled look via inset panels
  box(bed, Yd, -1.35, 5.45, 0, 7.9, 0.2, 4.25);
  box(bed, Coal, -1.35, 3.35, 0, 7.1, 2.9, 3.55);
  box(bed, Yd, -1.35, 1.7, 0, 7.8, 0.3, 4.1);
  box(bed, Y, -5.45, 3.4, 0, 0.35, 3.6, 4.3);
  // Ribs
  for (const z of [2.05, -2.05]) {
    box(bed, Yd, -1.35, 3.7, z, 7.6, 0.28, 0.2);
    box(bed, Yd, -1.35, 2.5, z, 7.6, 0.22, 0.16);
  }
  for (let i = 0; i < 6; i += 1) {
    box(bed, Yd, -4.2 + i * 1.35, 3.7, 0, 0.18, 3.2, 4.3);
  }
  // Canopy over cab (must not enclose follow camera)
  box(bed, Y, 3.55, 5.15, 0, 4.4, 0.32, 4.45);
  box(bed, Yd, 5.55, 4.55, 0, 0.4, 1.15, 4.25);
  box(bed, Y, 2.55, 4.65, 0, 0.4, 1.9, 4.4);
  root.add(bed);
  root.userData.bed = bed;

  // —— Wheels: front single + rear dual ——
  wheel(root, 4.65, 1.15, 2.15, Rub, Y, St, 1.15);
  wheel(root, 4.65, 1.15, -2.15, Rub, Y, St, 1.15);
  for (const x of [-1.35, -3.55]) {
    wheel(root, x, 1.25, 2.25, Rub, Y, St, 1.25);
    wheel(root, x, 1.25, 1.4, Rub, Y, St, 1.25);
    wheel(root, x, 1.25, -1.4, Rub, Y, St, 1.25);
    wheel(root, x, 1.25, -2.25, Rub, Y, St, 1.25);
  }
  for (const [x, y] of [[4.65, 1.15], [-1.35, 1.25], [-3.55, 1.25]]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.7, 8), St);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, y, 0);
    root.add(axle);
  }

  // Mirror stalks
  box(root, Blk, 5.55, 3.85, 0.55, 0.12, 0.45, 0.18);
  box(root, Blk, 5.55, 3.85, -1.65, 0.12, 0.45, 0.18);

  // Follow camera: outside on deck +Z, above rails — clear of canopy & hopper
  root.userData.eyeLocal = new THREE.Vector3(4.2, 5.6, 3.6);
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return root;
}

function wheel(parent, x, y, z, rubber, hub, steel, r) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.78, 20), rubber);
  tire.rotation.x = Math.PI / 2;
  // Tread rings
  const tread = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, 0.08, 6, 20), rubber);
  tread.rotation.y = Math.PI / 2;
  const hubM = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.82, 14), hub);
  hubM.rotation.x = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.86, 10), steel);
  cap.rotation.x = Math.PI / 2;
  g.add(tire, tread, hubM, cap);
  g.position.set(x, y, z);
  parent.add(g);
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
