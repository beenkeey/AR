import * as THREE from 'three';
import { surfaceTexture } from '../assets/finishMaps.js';

/**
 * One haul spiral inside the pit: climb on the inner lane, rim turnaround,
 * descend on the outer lane, floor turnaround. Closed loop — trucks always
 * face the way they travel and change elevation instead of circling a bench.
 *
 * Quarry-local space. Rim of the pit is r≈78, y≈0.
 */
export const HAUL = {
  r0: 22,
  r1: 68,
  y0: -20.6,
  y1: 0.28,
  turns: 2,
  a0: 0.85,
  lane: 3.3,
  /** Asphalt half-width measured from the driving line (not the pit center). */
  ribbon: 3.75,
  /** Terrain cut half-width from the driving line. Keep this near `ribbon`
   *  so the next winding of the spiral still has a bench between roads. */
  cover: 4.15,
  shoulder: 2.3,
};

const TAU = Math.PI * 2;

let _loop = null;

function spiralCenter(t, lane, out) {
  const ang = HAUL.a0 + t * HAUL.turns * TAU;
  const r = THREE.MathUtils.lerp(HAUL.r0, HAUL.r1, t);
  const y = THREE.MathUtils.lerp(HAUL.y0, HAUL.y1, t);
  const dAng = HAUL.turns * TAU;
  const dr = HAUL.r1 - HAUL.r0;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tx = -s * r * dAng + c * dr;
  const tz = c * r * dAng + s * dr;
  const len = Math.hypot(tx, tz) || 1;
  // Left of travel. For this CCW climb that points inward.
  const nx = -tz / len;
  const nz = tx / len;
  out.set(c * r + nx * lane, y, s * r + nz * lane);
  return out;
}

function addBulb(from, to, outward, steps, out) {
  const mx = (from.x + to.x) * 0.5;
  const mz = (from.z + to.z) * 0.5;
  const hx = (to.x - from.x) * 0.5;
  const hz = (to.z - from.z) * 0.5;
  const chord = Math.hypot(hx, hz) * 2 || 1;
  let px = -hz / (chord * 0.5);
  let pz = hx / (chord * 0.5);
  const radial = mx * px + mz * pz;
  if (outward ? radial < 0 : radial > 0) {
    px = -px;
    pz = -pz;
  }
  const radius = chord * 0.5;
  for (let i = 1; i < steps; i += 1) {
    const u = i / steps;
    const c = Math.cos(Math.PI * u);
    const s = Math.sin(Math.PI * u);
    out.push(new THREE.Vector3(
      mx - hx * c + px * radius * s,
      THREE.MathUtils.lerp(from.y, to.y, u),
      mz - hz * c + pz * radius * s,
    ));
  }
}

/** Closed polyline. Shared, do not mutate. */
export function buildHaulLoop() {
  if (_loop) return _loop;
  const steps = HAUL.turns * 96;
  const up = [];
  const down = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    up.push(spiralCenter(t, HAUL.lane, new THREE.Vector3()));
    down.push(spiralCenter(t, -HAUL.lane, new THREE.Vector3()));
  }
  const points = up.slice();
  addBulb(up[up.length - 1], down[down.length - 1], true, 18, points);
  for (let i = down.length - 1; i >= 0; i -= 1) points.push(down[i]);
  addBulb(down[0], up[0], false, 18, points);
  _loop = points;
  return _loop;
}

/** XZ distance to the driving line, road height, and segment tangent in XZ. */
export function queryHaul(x, z) {
  const pts = buildHaulLoop();
  const n = pts.length;
  let bestD = Infinity;
  let bestY = 0;
  let tx = 1;
  let tz = 0;
  for (let i = 0; i < n; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const len2 = abx * abx + abz * abz || 1e-8;
    let t = ((x - a.x) * abx + (z - a.z) * abz) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const px = a.x + abx * t;
    const pz = a.z + abz * t;
    const dx = x - px;
    const dz = z - pz;
    const d = Math.hypot(dx, dz);
    if (d < bestD) {
      bestD = d;
      bestY = a.y + (b.y - a.y) * t;
      tx = abx;
      tz = abz;
    }
  }
  return { dist: bestD, y: bestY, tx, tz };
}

function ribbonGeometry(points, halfW, lift, closed = true) {
  const n = points.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  let prevNx = 0;
  let prevNz = 1;
  let hasPrev = false;
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const i0 = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
    const i1 = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const a = points[i0];
    const b = points[i1];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    let nx = -tz;
    let nz = tx;
    if (hasPrev && nx * prevNx + nz * prevNz < 0) {
      nx = -nx;
      nz = -nz;
    }
    prevNx = nx;
    prevNz = nz;
    hasPrev = true;
    const y = p.y + lift;
    const o = i * 6;
    positions[o] = p.x + nx * halfW;
    positions[o + 1] = y;
    positions[o + 2] = p.z + nz * halfW;
    positions[o + 3] = p.x - nx * halfW;
    positions[o + 4] = y;
    positions[o + 5] = p.z - nz * halfW;
    const u = i * 0.42;
    const uv = i * 4;
    uvs[uv] = u;
    uvs[uv + 1] = 0;
    uvs[uv + 2] = u;
    uvs[uv + 3] = 6;
  }
  const indices = [];
  const seg = closed ? n : n - 1;
  for (let i = 0; i < seg; i += 1) {
    const i2 = i * 2;
    const j = (closed ? (i + 1) % n : i + 1) * 2;
    indices.push(i2, j, i2 + 1, i2 + 1, j, j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Inward (toward the pit) horizontal normal of the spiral centerline. */
function inwardNormal(t, out) {
  const ang = HAUL.a0 + t * HAUL.turns * TAU;
  const r = THREE.MathUtils.lerp(HAUL.r0, HAUL.r1, t);
  const dAng = HAUL.turns * TAU;
  const dr = HAUL.r1 - HAUL.r0;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tx = -s * r * dAng + c * dr;
  const tz = c * r * dAng + s * dr;
  const len = Math.hypot(tx, tz) || 1;
  let nx = -tz / len;
  let nz = tx / len;
  if (c * r * nx + s * r * nz > 0) {
    nx = -nx;
    nz = -nz;
  }
  out.set(nx, 0, nz);
  return out;
}

/** Spoil windrow on the pit side of the merged climb/descent. */
function bermGeometry() {
  const steps = HAUL.turns * 200;
  const inner = HAUL.lane + HAUL.ribbon + 0.2;
  const mid = inner + 1.15;
  const outer = inner + 2.35;
  const positions = new Float32Array((steps + 1) * 9);
  const normal = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    spiralCenter(t, 0, center);
    inwardNormal(t, normal);
    const y0 = center.y + 0.1;
    const y1 = center.y + 0.85;
    const o = i * 9;
    positions[o] = center.x + normal.x * inner;
    positions[o + 1] = y0;
    positions[o + 2] = center.z + normal.z * inner;
    positions[o + 3] = center.x + normal.x * mid;
    positions[o + 4] = y1;
    positions[o + 5] = center.z + normal.z * mid;
    positions[o + 6] = center.x + normal.x * outer;
    positions[o + 7] = y0;
    positions[o + 8] = center.z + normal.z * outer;
  }
  const indices = [];
  for (let i = 0; i < steps; i += 1) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
    indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Flat semicircle so the turnaround does not pinch into a triangle fan. */
function turnaroundPad(from, to, outward) {
  const mx = (from.x + to.x) * 0.5;
  const mz = (from.z + to.z) * 0.5;
  const y = (from.y + to.y) * 0.5 + 0.045;
  const hx = (to.x - from.x) * 0.5;
  const hz = (to.z - from.z) * 0.5;
  const halfChord = Math.hypot(hx, hz) || 1;
  let px = -hz / halfChord;
  let pz = hx / halfChord;
  if ((outward && mx * px + mz * pz < 0) || (!outward && mx * px + mz * pz > 0)) {
    px = -px;
    pz = -pz;
  }
  const bow = halfChord + 2.9;
  const steps = 28;
  const positions = [mx, y, mz];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const c = Math.cos(Math.PI * u);
    const s = Math.sin(Math.PI * u);
    positions.push(
      mx - hx * c + px * bow * s,
      y,
      mz - hz * c + pz * bow * s,
    );
  }
  const indices = [];
  for (let i = 1; i <= steps; i += 1) indices.push(0, i, i + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Asphalt shelf for both lanes, round pads at the turnarounds (a ribbon
 * around the bulb pinches and draws a white fan), spoil berm on the pit side.
 * Driving line is unchanged.
 */
export function createHaulRoadMesh() {
  const group = new THREE.Group();
  group.name = 'HaulRoad';
  const steps = HAUL.turns * 280;
  const center = [];
  for (let i = 0; i <= steps; i += 1) {
    center.push(spiralCenter(i / steps, 0, new THREE.Vector3()));
  }
  const asphaltMap = surfaceTexture('asphalt');
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: asphaltMap ? 0xffffff : 0x3c434c,
    map: asphaltMap,
    roughness: 0.94,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const road = new THREE.Mesh(
    ribbonGeometry(center, HAUL.lane + HAUL.ribbon, 0.06, false),
    asphaltMat,
  );
  road.receiveShadow = true;
  road.name = 'HaulAsphalt';
  group.add(road);

  const upEnd = spiralCenter(1, HAUL.lane, new THREE.Vector3());
  const downEnd = spiralCenter(1, -HAUL.lane, new THREE.Vector3());
  const upStart = spiralCenter(0, HAUL.lane, new THREE.Vector3());
  const downStart = spiralCenter(0, -HAUL.lane, new THREE.Vector3());
  for (const [a, b, outward] of [[upEnd, downEnd, true], [downStart, upStart, false]]) {
    const pad = new THREE.Mesh(turnaroundPad(a, b, outward), asphaltMat);
    pad.receiveShadow = true;
    pad.name = 'HaulPad';
    group.add(pad);
  }

  const berm = new THREE.Mesh(
    bermGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0x3d3028,
      roughness: 0.97,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  berm.castShadow = true;
  berm.receiveShadow = true;
  berm.name = 'HaulBerm';
  group.add(berm);
  return group;
}
