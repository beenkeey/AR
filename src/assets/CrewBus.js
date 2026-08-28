import * as THREE from 'three';
import { textured } from './surfaceMaps.js';

/**
 * Yellow KamAZ crew bus (вахтовка): cab + rectangular кунг, not a capsule.
 * Length along +X, cab toward +X.
 */
export function createCrewBus() {
  const group = new THREE.Group();
  group.name = 'CrewBus';

  const yellow = std(0xf3c300, 0.08, 0.5);
  const yellowDark = std(0xd4a400, 0.08, 0.55);
  const black = std(0x1a1c1e, 0.2, 0.52);
  const chassisMat = std(0x2a2e32, 0.3, 0.48);
  const glass = std(0x1a2830, 0.55, 0.14, { transparent: true, opacity: 0.5 });
  const rubber = std(0x121212, 0.04, 0.84);
  const rim = std(0x3a3e42, 0.4, 0.38);
  const orange = std(0xe45c10, 0.06, 0.5);
  const red = std(0xc4281c, 0.08, 0.48);
  const white = std(0xf0f0ec, 0.04, 0.45);
  const lightFront = std(0xfff2c4, 0.1, 0.25, { emissive: 0xffe08a, emissiveIntensity: 0.5 });
  const lightRear = std(0xff2a18, 0.08, 0.35, { emissive: 0xff1808, emissiveIntensity: 0.55 });
  const frame = std(0x111214, 0.14, 0.5);

  box(group, chassisMat, 0.15, 0.78, 0, 8.7, 0.22, 2.15);
  box(group, black, 0.2, 0.5, 0, 8.3, 0.16, 1.55);

  box(group, yellow, 3.55, 1.95, 0, 2.35, 2.2, 2.42);
  box(group, yellowDark, 3.55, 3.08, 0, 2.32, 0.12, 2.48);
  box(group, black, 3.55, 3.18, 0, 2.2, 0.08, 2.52);
  box(group, yellow, 4.55, 1.15, 0, 0.42, 0.55, 2.2);
  box(group, black, 4.72, 0.78, 0, 0.28, 0.38, 2.28);

  box(group, glass, 4.74, 2.28, 0, 0.06, 1.02, 2.05);
  box(group, frame, 4.76, 2.28, 0, 0.03, 1.12, 0.06);
  box(group, glass, 3.7, 2.22, 1.24, 1.05, 0.72, 0.05);
  box(group, glass, 3.7, 2.22, -1.24, 1.05, 0.72, 0.05);
  box(group, frame, 3.7, 2.22, 1.27, 1.12, 0.82, 0.03);
  box(group, frame, 3.7, 2.22, -1.27, 1.12, 0.82, 0.03);

  box(group, black, 4.74, 1.48, 0, 0.08, 0.5, 1.15);
  box(group, lightFront, 4.78, 1.08, 0.72, 0.1, 0.22, 0.38);
  box(group, lightFront, 4.78, 1.08, -0.72, 0.1, 0.22, 0.38);
  box(group, black, 4.32, 0.55, 1.18, 0.7, 0.08, 0.3);
  box(group, black, 4.32, 0.55, -1.18, 0.7, 0.08, 0.3);

  box(group, black, 2.32, 1.55, 0, 0.28, 0.32, 1.9);

  box(group, yellow, -0.95, 2.18, 0, 6.2, 2.5, 2.5);
  box(group, yellowDark, -0.95, 3.46, 0, 6.28, 0.12, 2.56);
  const roofL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.15, 8), yellowDark);
  roofL.rotation.z = Math.PI / 2;
  roofL.position.set(-0.95, 3.46, 1.24);
  group.add(roofL);
  const roofR = roofL.clone();
  roofR.position.z = -1.24;
  group.add(roofR);
  box(group, yellow, -4.08, 2.18, 0, 0.14, 2.46, 2.42);
  box(group, black, -4.12, 0.88, 0, 0.22, 0.36, 2.15);

  box(group, orange, -1.85, 1.48, 1.27, 2.6, 0.52, 0.05);
  box(group, red, -2.2, 1.22, 1.275, 1.8, 0.26, 0.05);
  box(group, orange, -1.85, 1.48, -1.27, 2.6, 0.52, 0.05);
  box(group, red, -2.2, 1.22, -1.275, 1.8, 0.26, 0.05);

  box(group, yellowDark, 0.4, 1.85, 1.28, 0.7, 1.58, 0.06);
  box(group, frame, 0.4, 1.85, 1.31, 0.76, 1.64, 0.02);
  box(group, glass, 0.4, 2.38, 1.32, 0.42, 0.4, 0.03);

  addWindows(group, glass, frame, 1.27);
  addWindows(group, glass, frame, -1.27);

  box(group, frame, -4.16, 2.55, 0, 0.05, 0.82, 1.5);
  box(group, glass, -4.18, 2.55, 0, 0.04, 0.7, 1.32);
  box(group, lightRear, -4.2, 1.18, 0.7, 0.06, 0.22, 0.3);
  box(group, lightRear, -4.2, 1.18, -0.7, 0.06, 0.22, 0.3);
  box(group, white, -4.2, 1.42, 0.7, 0.06, 0.08, 0.3);
  box(group, white, -4.2, 1.42, -0.7, 0.06, 0.08, 0.3);

  addMirror(group, black, glass, 4.52, 2.38, 1.38, 1);
  addMirror(group, black, glass, 4.52, 2.38, -1.38, -1);

  box(group, black, 3.35, 0.92, 1.18, 1.15, 0.16, 0.42);
  box(group, black, 3.35, 0.92, -1.18, 1.15, 0.16, 0.42);
  box(group, black, -0.85, 0.92, 1.18, 1.2, 0.16, 0.42);
  box(group, black, -0.85, 0.92, -1.18, 1.2, 0.16, 0.42);
  box(group, black, -2.35, 0.92, 1.18, 1.2, 0.16, 0.42);
  box(group, black, -2.35, 0.92, -1.18, 1.2, 0.16, 0.42);

  const axles = [3.35, -0.85, -2.35];
  for (const x of axles) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.25, 8), rim);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, 0.58, 0);
    group.add(axle);
    group.add(wheel(x, 0.58, 1.12, rubber, rim));
    group.add(wheel(x, 0.58, -1.12, rubber, rim));
  }

  const brand = makeBrandDecal();
  const brandMat = new THREE.MeshBasicMaterial({ map: brand, transparent: true });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.4), brandMat);
  label.position.set(-0.55, 2.78, 1.28);
  group.add(label);
  const labelR = label.clone();
  labelR.position.z = -1.28;
  labelR.rotation.y = Math.PI;
  group.add(labelR);

  return group;
}

function addWindows(group, glass, frame, z) {
  const xs = [1.5, 0.4, -0.7, -1.8, -2.9];
  for (const x of xs) {
    box(group, frame, x, 2.58, z, 0.95, 0.72, 0.04);
    box(group, glass, x, 2.58, z + Math.sign(z) * 0.016, 0.82, 0.58, 0.03);
  }
}

function addMirror(group, black, glass, x, y, z, side) {
  box(group, black, x, y, z, 0.08, 0.08, 0.38);
  box(group, black, x + 0.1, y - 0.04, z + side * 0.28, 0.08, 0.26, 0.2);
  box(group, glass, x + 0.15, y - 0.04, z + side * 0.28, 0.03, 0.2, 0.14);
}

function wheel(x, y, z, rubber, rim) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.38, 16), rubber);
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12), rim);
  hub.rotation.x = Math.PI / 2;
  g.add(tire, hub);
  g.position.set(x, y, z);
  return g;
}

function box(group, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function makeBrandDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = '#111111';
  ctx.font = '700 58px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('РОСНЕФТЬ', 256, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function std(color, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  if (!extra.transparent && !extra.emissive) {
    textured(material, metalness > 0.22 ? 'metal' : 'paint');
  }
  return material;
}
