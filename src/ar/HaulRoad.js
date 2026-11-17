import * as THREE from 'three';

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

function ribbonGeometry(points, halfW, lift) {
  const n = points.length;
  const positions = new Float32Array(n * 2 * 3);
  let prevNx = 0;
  let prevNz = 1;
  let hasPrev = false;
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    const a = points[(i - 1 + n) % n];
    const b = points[(i + 1) % n];
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
  }
  const indices = [];
  for (let i = 0; i < n; i += 1) {
    const i2 = i * 2;
    const j = ((i + 1) % n) * 2;
    indices.push(i2, j, i2 + 1, i2 + 1, j, j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Asphalt ribbon + yellow center line. Parent it at the quarry origin. */
export function createHaulRoadMesh() {
  const group = new THREE.Group();
  group.name = 'HaulRoad';
  const pts = buildHaulLoop();
  const asphalt = new THREE.Mesh(
    ribbonGeometry(pts, HAUL.ribbon, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x3a4450,
      roughness: 0.86,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  );
  asphalt.receiveShadow = true;
  asphalt.name = 'HaulAsphalt';
  group.add(asphalt);

  const line = new THREE.Mesh(
    ribbonGeometry(pts, 0.14, 0.1),
    new THREE.MeshStandardMaterial({
      color: 0xf0c400,
      roughness: 0.45,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
  );
  line.name = 'HaulCenterLine';
  group.add(line);
  return group;
}
