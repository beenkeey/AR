import * as THREE from 'three';
import { HAUL, buildHaulLoop, createHaulRoadMesh, queryHaul } from './HaulRoad.js';
import { coalAt, coalDigSites } from './CoalSeams.js';

/**
 * Continuous open-pit mesh: radial terraces with short faces — no sky leaks.
 * Local origin = pit center, rim at y≈0.
 */
export function createQuarryTerrain({
  rimR = 78,
  segs = 72,
  rings = 56,
} = {}) {
  const group = new THREE.Group();
  group.name = 'QuarryTerrain';

  // Bench steps: [maxRadius, deckY]
  const steps = [
    [78, 0.0],
    [64, -4.8],
    [52, -9.8],
    [40, -15.0],
    [28, -20.2],
    [16, -25.0],
    [0, -28.5],
  ];

  const faceW = 2.4;

  function heightAt(r) {
    for (let i = 0; i < steps.length - 1; i += 1) {
      const [, yOuter] = steps[i];
      const [rInner, yInner] = steps[i + 1];
      if (r >= rInner) {
        const deckInner = rInner + faceW;
        if (r >= deckInner) return yOuter;
        const t = (deckInner - r) / faceW;
        return THREE.MathUtils.lerp(yOuter, yInner, THREE.MathUtils.clamp(t, 0, 1));
      }
    }
    return steps[steps.length - 1][1];
  }

  function hash2(ix, iy) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function faceAmount(r) {
    let best = 0;
    for (let i = 0; i < steps.length - 1; i += 1) {
      const rInner = steps[i + 1][0];
      if (r >= rInner && r < rInner + faceW) {
        const t = (r - rInner) / faceW;
        best = Math.max(best, 1 - t * 0.25);
      }
    }
    return best;
  }

  const radial = rings;
  const angular = segs;
  const positions = [];
  const colors = [];
  const indices = [];
  const tmpC = new THREE.Color();
  const colRim = new THREE.Color(0x8d7358);
  const colMid = new THREE.Color(0x6a5340);
  const colLow = new THREE.Color(0x3e342c);
  const colFace = new THREE.Color(0x4e4942);
  const colCrest = new THREE.Color(0x3a3026);
  const colDeep = new THREE.Color(0x221e1a);
  const colOchre = new THREE.Color(0x8a5a34);
  const colGray = new THREE.Color(0x6e6a62);
  const gravelC = new THREE.Color(0xc4beb4);
  const spoilC = new THREE.Color(0x4a382c);
  const coalC = new THREE.Color(0x0c1016);

  function crestAmount(r) {
    let best = 0;
    for (let i = 0; i < steps.length - 1; i += 1) {
      const edge = steps[i][0];
      if (edge <= 0) continue;
      const d = edge - r;
      if (d >= -0.5 && d < 3.4) {
        const u = d < 0 ? 1 : 1 - d / 3.4;
        best = Math.max(best, u);
      }
    }
    return best;
  }

  function paintRock(r, a, y, face) {
    const depth = THREE.MathUtils.clamp(-y / 28.5, 0, 1);
    if (depth < 0.5) tmpC.copy(colRim).lerp(colMid, depth / 0.5);
    else tmpC.copy(colMid).lerp(colLow, (depth - 0.5) / 0.5);
    if (y < -24) tmpC.lerp(colDeep, THREE.MathUtils.clamp((-24 - y) / 4.5, 0, 1));
    if (face > 0.05) tmpC.lerp(colFace, 0.7 * face);
    const n1 = hash2(Math.floor(r / 3.2), Math.floor(a * 9));
    const n2 = hash2(Math.floor(r / 8) + 4, Math.floor(a * 2.2) + 1);
    if (n2 > 0.58) tmpC.lerp(colOchre, (n2 - 0.58) * 0.85);
    else if (n2 < 0.32) tmpC.lerp(colGray, (0.32 - n2) * 0.9);
    tmpC.offsetHSL((n2 - 0.5) * 0.02, (n1 - 0.5) * 0.05, (n1 - 0.5) * 0.1);
    const crest = crestAmount(r);
    if (crest > 0.02) tmpC.lerp(colCrest, 0.55 * crest);
  }

  for (let ir = 0; ir <= radial; ir += 1) {
    const r = (ir / radial) * rimR;
    for (let ia = 0; ia <= angular; ia += 1) {
      const a = (ia / angular) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const haul = queryHaul(x, z);
      const edge = HAUL.cover + HAUL.shoulder;
      const onRoad = haul.dist <= HAUL.cover;
      const coal = coalAt(r, a);
      const worked = coal.amount > 0.35;
      const jag = (onRoad || worked) ? 0 : (hash2(Math.floor(a * 22), 11) - 0.5) * 1.5;
      const rr = Math.max(0, Math.min(rimR, r + jag));
      const face = faceAmount(rr);
      let bench = heightAt(rr);
      if (!onRoad && !worked && haul.dist >= edge) {
        const hum = hash2(Math.floor(a * 30), Math.floor(r * 3) + 2) - 0.5;
        bench += hum * (face > 0.2 ? 0.22 : 0.72);
      }
      let y = bench;
      if (onRoad) {
        y = haul.y - 0.08;
        tmpC.copy(gravelC);
        const grit = hash2(Math.floor(x * 1.4 + 40), Math.floor(z * 1.4 + 7));
        tmpC.offsetHSL(0, 0, (grit - 0.5) * 0.05);
      } else if (haul.dist < edge) {
        const k = (haul.dist - HAUL.cover) / HAUL.shoulder;
        const s = k * k * (3 - 2 * k);
        y = THREE.MathUtils.lerp(haul.y - 0.04, bench, s);
        paintRock(r, a, bench, face);
        tmpC.lerp(spoilC, (1 - s) * 0.8);
      } else {
        paintRock(r, a, y, face);
      }
      if (!onRoad) {
        if (coal.amount > 0.04) tmpC.lerp(coalC, coal.amount);
        if (coal.recess > 0.05 && haul.dist > edge) y -= coal.recess * 0.9;
      }
      positions.push(x, y, z);
      colors.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }

  const stride = angular + 1;
  for (let ir = 0; ir < radial; ir += 1) {
    for (let ia = 0; ia < angular; ia += 1) {
      const a = ir * stride + ia;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  buffer.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  buffer.setIndex(indices);
  buffer.computeVertexNormals();

  const mesh = new THREE.Mesh(
    buffer,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.04,
      flatShading: false,
      // Visible from pit floor (дно) looking up the benches
      side: THREE.DoubleSide,
    }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  const haul = buildHaulLoop();
  let yMin = Infinity;
  let yMax = -Infinity;
  let rMin = Infinity;
  let rMax = 0;
  for (const p of haul) {
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
    const rr = Math.hypot(p.x, p.z);
    rMin = Math.min(rMin, rr);
    rMax = Math.max(rMax, rr);
  }
  group.add(createHaulRoadMesh());
  group.userData.heightAt = heightAt;
  group.userData.haul = { yMin, yMax, rMin, rMax, points: haul.length };
  group.userData.coalSites = coalDigSites();
  return group;
}
