import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Reconstructs the physical desk model from the photo set
 * `фото модели вышки` (6 model shots + 3 live-site shots).
 *
 * Confirmed from photos (not the old cylindrical stack):
 * - 4-sided tapering RED mast with horizontal panel ribs
 * - gabled red roof + dark hatch
 * - YELLOW service block under/against the mast + side column
 * - wide GREY modular PSP halls, windows, yellow stairs/rails
 * - 4 dark-blue equipment boxes on a railed deck
 *
 * Local units = metres. Y-up, minY = 0 (skids on ground).
 * Red mast span is ~14.6 m; ExhibitionScene.placeStatic scales the
 * full bbox (base + mast) to CONFIG.exhibition.hugeHeight.
 */

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1);
const MAST_Y0 = 7.55;
const MAST_Y1 = 22.15;

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const WEAK = CONFIG.performance.weak;

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: extra.side ?? THREE.FrontSide,
    ...extra,
  });
}

function mesh(geo, material, parent) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = false;
  m.receiveShadow = false;
  parent.add(m);
  return m;
}

function boxAt(parent, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const m = mesh(BOX, material, parent);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function cylAt(parent, material, x, y, z, radius, height, rx = 0, ry = 0, rz = 0) {
  const m = mesh(CYL, material, parent);
  m.position.set(x, y, z);
  m.scale.set(radius * 2, height, radius * 2);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

/** Axis-aligned square frustum (face-to-face widths), no stair-step boxes. */
function squareFrustum(parent, material, x, y, z, wBottom, wTop, height) {
  const geo = new THREE.CylinderGeometry(
    wTop / Math.SQRT2,
    wBottom / Math.SQRT2,
    height,
    4,
    1,
  );
  geo.rotateY(Math.PI / 4);
  const m = mesh(geo, material, parent);
  m.position.set(x, y, z);
  return m;
}

function group(name, parent) {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

class BoxBatch {
  constructor(material, capacity) {
    this.mesh = new THREE.InstancedMesh(BOX, material, capacity);
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
  }

  box(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    if (this.mesh.count >= this.mesh.instanceMatrix.array.length / 16) return;
    _dummy.position.set(x, y, z);
    _dummy.scale.set(sx, sy, sz);
    _dummy.rotation.set(rx, ry, rz);
    _dummy.quaternion.setFromEuler(_dummy.rotation);
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(this.mesh.count, _dummy.matrix);
    this.mesh.count += 1;
  }

  beam(ax, ay, az, bx, by, bz, thickness) {
    if (this.mesh.count >= this.mesh.instanceMatrix.array.length / 16) return;
    _dir.set(bx - ax, by - ay, bz - az);
    const len = _dir.length();
    if (len < 1e-4) return;
    _dummy.position.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
    _dummy.scale.set(thickness, len, thickness);
    _dummy.quaternion.setFromUnitVectors(_up, _dir.clone().multiplyScalar(1 / len));
    _dummy.updateMatrix();
    this.mesh.setMatrixAt(this.mesh.count, _dummy.matrix);
    this.mesh.count += 1;
  }

  attach(parent) {
    this.mesh.instanceMatrix.needsUpdate = true;
    parent.add(this.mesh);
  }
}

function countTriangles(root) {
  let n = 0;
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    const geom = obj.geometry;
    const indexed = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3;
    n += obj.isInstancedMesh ? indexed * obj.count : indexed;
  });
  return Math.round(n);
}

export function createArcticDrillingRig() {
  const root = new THREE.Group();
  root.name = 'ArcticDrillingRig';

  const red = mat(0x9a3530, 0.24, 0.68);
  const redDark = mat(0x7a2a26, 0.28, 0.72);
  const redRib = mat(0x8a302c, 0.22, 0.7);
  const yellow = mat(0xd4ae2e, 0.16, 0.6);
  const yellowDark = mat(0xb08c22, 0.18, 0.64);
  const grey = mat(0x8d939a, 0.12, 0.78);
  const greyDark = mat(0x6e747c, 0.18, 0.74);
  const greyPanel = mat(0x818790, 0.1, 0.82);
  const navy = mat(0x1c2a3c, 0.22, 0.58);
  const black = mat(0x1a1c1e, 0.3, 0.55);
  const glass = mat(0x243038, 0.58, 0.28);
  const steel = mat(0x5c6268, 0.4, 0.5);

  const mast = group('RedMast', root);
  const yellowG = group('YellowBlock', root);
  const base = group('GreyPsp', root);
  const access = group('YellowAccess', root);

  const yBox = new BoxBatch(yellow, WEAK ? 900 : 1400);
  const yDark = new BoxBatch(yellowDark, 180);
  const ribBox = new BoxBatch(redRib, WEAK ? 120 : 200);
  const navyBox = new BoxBatch(navy, 24);

  const TX = 2.35;
  const TZ = 0.55;

  buildGreyBase(base, grey, greyDark, greyPanel, yellow, glass, steel, yBox, TX, TZ);
  buildYellowHub(yellowG, yellow, yellowDark, black, yBox, yDark, TX, TZ);
  buildRedMast(mast, red, redDark, black, ribBox, TX, TZ);
  buildMastAccess(yBox, yDark, TX, TZ);
  buildEquipmentDeck(base, grey, greyDark, navy, navyBox, yBox, TX, TZ);

  yBox.attach(access);
  yDark.attach(access);
  ribBox.attach(mast);
  navyBox.attach(base);

  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  const minYBefore = _box.min.y;
  root.position.y -= minYBefore;
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  const minYAfter = _box.min.y;
  _box.getSize(_size);

  root.userData.triangles = countTriangles(root);
  root.userData.height = _size.y;
  root.userData.width = _size.x;
  root.userData.length = _size.z;
  root.userData.minYBefore = minYBefore;
  root.userData.minYAfter = minYAfter;
  root.userData.rigKind = 'PSP MAST PHOTO';
  return root;
}

function buildGreyBase(parent, grey, greyDark, greyPanel, yellow, glass, steel, yBox, tx, tz) {
  const skidH = 0.38;
  boxAt(parent, steel, 1.2, skidH * 0.5, -1.4, 12.6, skidH, 9.4);
  boxAt(parent, steel, -2.8, skidH * 0.5, -2.6, 6.4, skidH, 0.42);
  boxAt(parent, steel, 5.6, skidH * 0.5, 1.8, 0.42, skidH, 5.2);

  const hallH = 3.55;
  const hallY = skidH + hallH * 0.5;
  boxAt(parent, grey, 0.4, hallY, -2.55, 10.8, hallH, 6.2);
  boxAt(parent, greyDark, 0.4, skidH + hallH + 0.12, -2.55, 11.1, 0.24, 6.5);
  boxAt(parent, greyPanel, 0.4, skidH + hallH + 0.28, -2.55, 10.4, 0.16, 5.9);
  boxAt(parent, greyDark, 0.4, skidH + hallH + 0.42, -2.55, 5.4, 0.22, 0.35, 0, 0, 0.12);
  boxAt(parent, greyDark, 0.4, skidH + hallH + 0.42, -2.55, 0.35, 0.22, 3.4, 0, 0, -0.12);

  const wingH = 2.45;
  boxAt(parent, grey, -3.1, skidH + wingH * 0.5, 1.85, 6.4, wingH, 4.6);
  boxAt(parent, greyDark, -3.1, skidH + wingH + 0.1, 1.85, 6.6, 0.2, 4.8);

  boxAt(parent, grey, 4.9, skidH + 1.15, -4.35, 4.2, 2.3, 2.6);
  boxAt(parent, greyDark, 4.9, skidH + 2.4, -4.35, 4.35, 0.18, 2.75);

  boxAt(parent, grey, 1.6, skidH + 0.22, 4.15, 7.4, 0.44, 1.15);
  boxAt(parent, grey, 6.35, skidH + 0.18, 0.2, 1.05, 0.36, 6.8);

  const winY = skidH + hallH - 0.55;
  for (let i = 0; i < 8; i += 1) {
    const wx = -3.6 + i * 1.15;
    boxAt(parent, glass, wx, winY, 0.58, 0.42, 0.38, 0.08);
    boxAt(parent, glass, wx, winY, -5.68, 0.42, 0.38, 0.08);
  }
  for (let i = 0; i < 4; i += 1) {
    boxAt(parent, glass, -6.28, skidH + 1.55, 0.4 + i * 0.85, 0.08, 0.34, 0.38);
  }

  for (let i = -4; i <= 4; i += 1) {
    boxAt(parent, greyDark, 0.4 + i * 1.05, hallY, 0.58, 0.08, hallH * 0.9, 0.06);
  }

  addRailRect(yBox, -4.6, 5.4, skidH + hallH, -5.5, 0.4, 1.05, 0.055, 9);
  addRailRect(yBox, -5.8, -0.2, skidH + wingH, 0.0, 3.9, 1.0, 0.05, 6);
  addStairs(yBox, 5.55, 0, 1.65, skidH + 1.55, 7, 1);
  addStairs(yBox, -5.15, 0, 2.7, skidH + wingH, 6, -1);

  yBox.box(-5.4, skidH + 1.35, 3.55, 1.35, 0.08, 1.2);
  addRailRect(yBox, -6.05, -4.75, skidH + 1.35, 3.0, 4.15, 0.9, 0.045, 4);

  boxAt(parent, greyDark, -1.1, skidH + hallH + 0.85, -1.4, 1.7, 1.35, 1.15);
  boxAt(parent, greyDark, 2.8, skidH + hallH + 0.7, -3.9, 1.4, 1.1, 1.0);
}

function buildYellowHub(parent, yellow, yellowDark, black, yBox, yDark, tx, tz) {
  const y0 = 3.93;
  const h = 4.15;
  boxAt(parent, yellow, tx + 0.85, y0 + h * 0.5, tz, 4.55, h, 3.55);
  boxAt(parent, yellowDark, tx + 0.85, y0 + 0.12, tz, 4.7, 0.24, 3.7);
  boxAt(parent, yellowDark, tx + 0.85, y0 + h - 0.1, tz, 4.62, 0.2, 3.62);
  for (const z of [-1.45, 0, 1.45]) {
    boxAt(parent, yellowDark, tx + 0.85, y0 + h * 0.5, tz + z, 4.62, 0.12, 0.1);
  }
  for (let i = 0; i < 4; i += 1) {
    boxAt(parent, yellowDark, tx - 0.95 + i * 1.15, y0 + h * 0.5, tz + 1.8, 0.1, h * 0.88, 0.08);
  }

  boxAt(parent, yellow, tx + 2.55, y0 + 1.55, tz + 1.95, 1.7, 2.35, 1.15);
  boxAt(parent, yellow, tx + 2.35, y0 + 2.85, tz - 1.85, 1.85, 1.55, 1.05);

  const colH = 4.55;
  const colY0 = y0 + h - 0.15;
  boxAt(parent, yellow, tx + 2.15, colY0 + colH * 0.42, tz - 0.05, 1.55, colH * 0.84, 1.35);
  boxAt(parent, yellow, tx + 2.15, colY0 + colH * 0.78, tz - 0.05, 1.55, 0.95, 1.35, 0.55, 0, 0);
  boxAt(parent, yellowDark, tx + 2.15, colY0 + colH - 0.05, tz - 0.05, 1.2, 0.18, 1.05, 0.55, 0, 0);

  yBox.box(tx + 2.15, colY0 + colH + 0.12, tz - 0.05, 1.7, 0.08, 1.5);
  addRailRect(yBox, tx + 1.4, tx + 2.9, colY0 + colH + 0.12, tz - 0.75, tz + 0.7, 0.95, 0.05, 4);

  addStairs(yBox, tx + 2.7, y0, tz + 1.85, y0 + 2.2, 6, -1);

  boxAt(parent, black, tx + 2.7, y0 + h + 0.55, tz + 1.15, 0.85, 0.95, 0.7);
  boxAt(parent, black, tx + 1.55, y0 + h + 0.48, tz - 1.35, 0.7, 0.8, 0.65);
}

function buildRedMast(parent, red, redDark, black, ribBox, tx, tz) {
  const y0 = MAST_Y0;
  const y1 = MAST_Y1;
  const w0 = 2.85;
  const w1 = 1.52;
  const mastMat = red.clone();
  mastMat.flatShading = true;
  squareFrustum(parent, mastMat, tx, (y0 + y1) * 0.5, tz, w0, w1, y1 - y0);

  const ribs = WEAK ? 20 : 32;
  for (let i = 0; i < ribs; i += 1) {
    const t = (i + 0.5) / ribs;
    const y = THREE.MathUtils.lerp(y0 + 0.2, y1 - 0.15, t);
    const w = THREE.MathUtils.lerp(w0, w1, t) + 0.06;
    ribBox.box(tx, y, tz, w, 0.07, w);
  }

  const flares = [0.22, 0.48, 0.72];
  for (const t of flares) {
    const y = THREE.MathUtils.lerp(y0, y1, t);
    const w = THREE.MathUtils.lerp(w0, w1, t) + 0.18;
    boxAt(parent, redDark, tx, y, tz, w, 0.16, w);
  }

  const roofY = y1 + 0.08;
  const tw = w1 + 0.12;
  boxAt(parent, redDark, tx, roofY, tz, tw + 0.2, 0.12, tw + 0.2);
  boxAt(parent, red, tx, roofY + 0.38, tz, tw * 0.55, 0.08, tw + 0.15, 0.48, 0, 0);
  boxAt(parent, red, tx, roofY + 0.38, tz, tw * 0.55, 0.08, tw + 0.15, -0.48, 0, 0);
  boxAt(parent, redDark, tx, roofY + 0.62, tz, 0.22, 0.18, tw + 0.18);
  boxAt(parent, black, tx + tw * 0.48, y1 - 0.35, tz, 0.08, 0.42, 0.55);

  boxAt(parent, red, tx, y0 - 0.35, tz, w0 + 0.35, 0.7, w0 + 0.35);
  boxAt(parent, redDark, tx, y0 - 0.02, tz, w0 + 0.55, 0.18, w0 + 0.55);
}

function buildMastAccess(yBox, yDark, tx, tz) {
  const y0 = MAST_Y0;
  const y1 = MAST_Y1;
  const landings = [0.28, 0.55, 0.82];
  const lx = tx + 1.15;
  const lz = tz + 1.05;

  yBox.beam(lx, y0 + 0.2, lz, lx, y1 - 0.15, lz, 0.07);
  yBox.beam(lx + 0.42, y0 + 0.2, lz, lx + 0.42, y1 - 0.15, lz, 0.07);
  const rungs = WEAK ? 14 : 20;
  for (let i = 0; i < rungs; i += 1) {
    const y = THREE.MathUtils.lerp(y0 + 0.25, y1 - 0.2, i / (rungs - 1));
    yBox.box(lx + 0.21, y, lz, 0.5, 0.045, 0.05);
  }

  for (const t of landings) {
    const y = THREE.MathUtils.lerp(y0, y1, t);
    const w = THREE.MathUtils.lerp(2.85, 1.52, t);
    yBox.box(tx, y, tz + w * 0.52 + 0.15, w * 0.85, 0.07, 0.85);
    yBox.box(tx + w * 0.48, y, tz, 0.7, 0.07, w * 0.7);
    addRailRect(yBox, tx - w * 0.35, tx + w * 0.42, y, tz + w * 0.35, tz + w * 0.52 + 0.5, 0.92, 0.045, 4);
  }

  yBox.box(tx, y1 + 0.05, tz, 1.7, 0.07, 1.7);
  addRailRect(yBox, tx - 0.8, tx + 0.8, y1 + 0.05, tz - 0.8, tz + 0.8, 0.9, 0.045, 5);
}

function buildEquipmentDeck(parent, grey, greyDark, navy, navyBox, yBox, tx, tz) {
  const y = 1.58;
  boxAt(parent, grey, tx + 3.15, y, tz + 1.55, 4.4, 0.22, 3.7);
  boxAt(parent, greyDark, tx + 3.15, y - 0.55, tz + 1.55, 0.28, 1.0, 3.5);
  boxAt(parent, greyDark, tx + 4.9, y - 0.55, tz + 1.55, 0.28, 1.0, 3.5);
  addRailRect(yBox, tx + 1.1, tx + 5.2, y + 0.12, tz - 0.15, tz + 3.25, 1.02, 0.05, 7);

  const boxes = [
    [tx + 2.15, y + 0.58, tz + 0.55],
    [tx + 3.25, y + 0.58, tz + 0.55],
    [tx + 2.15, y + 0.58, tz + 2.15],
    [tx + 3.25, y + 0.58, tz + 2.15],
  ];
  for (const [x, yy, z] of boxes) {
    navyBox.box(x, yy, z, 0.95, 0.95, 0.85);
    navyBox.box(x, yy + 0.52, z, 0.88, 0.08, 0.72);
  }

  addStairs(yBox, tx + 4.85, 0, tz + 2.55, y + 0.12, 7, -1);
}

function addRailRect(batch, x0, x1, y, z0, z1, height, thickness, posts) {
  for (let i = 0; i < posts; i += 1) {
    const t = posts === 1 ? 0 : i / (posts - 1);
    const x = THREE.MathUtils.lerp(x0, x1, t);
    const z = THREE.MathUtils.lerp(z0, z1, t);
    batch.box(x, y + height * 0.5, z0, thickness, height, thickness);
    batch.box(x, y + height * 0.5, z1, thickness, height, thickness);
    batch.box(x0, y + height * 0.5, z, thickness, height, thickness);
    batch.box(x1, y + height * 0.5, z, thickness, height, thickness);
  }
  batch.beam(x0, y + height, z0, x1, y + height, z0, thickness * 1.25);
  batch.beam(x0, y + height, z1, x1, y + height, z1, thickness * 1.25);
  batch.beam(x0, y + height, z0, x0, y + height, z1, thickness * 1.25);
  batch.beam(x1, y + height, z0, x1, y + height, z1, thickness * 1.25);
  batch.beam(x0, y + height * 0.5, z0, x1, y + height * 0.5, z0, thickness);
  batch.beam(x0, y + height * 0.5, z1, x1, y + height * 0.5, z1, thickness);
}

function addStairs(batch, x, y0, z, y1, steps, side) {
  const rise = y1 - y0;
  const run = steps * 0.28;
  const zEnd = z + side * run;
  batch.beam(x - 0.38, y0, z, x - 0.38, y1, zEnd, 0.055);
  batch.beam(x + 0.38, y0, z, x + 0.38, y1, zEnd, 0.055);
  batch.beam(x - 0.38, y0 + 0.9, z, x - 0.38, y1 + 0.9, zEnd, 0.04);
  batch.beam(x + 0.38, y0 + 0.9, z, x + 0.38, y1 + 0.9, zEnd, 0.04);
  for (let i = 0; i < steps; i += 1) {
    const t = (i + 0.5) / steps;
    batch.box(x, y0 + rise * t, THREE.MathUtils.lerp(z, zEnd, t), 0.82, 0.05, 0.22);
  }
}

export function measureRig(root) {
  _box.setFromObject(root);
  _box.getSize(_size);
  return {
    triangles: root.userData.triangles ?? countTriangles(root),
    height: root.userData.height ?? _size.y,
    width: root.userData.width ?? _size.x,
    length: root.userData.length ?? _size.z,
  };
}
