import * as THREE from 'three';
import { HAUL, buildHaulLoop, createHaulRoadMesh, queryHaul } from './HaulRoad.js';
import { coalAt, coalDigSites } from './CoalSeams.js';
import { surfaceTexture } from '../assets/finishMaps.js';

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
    [16, -28.5],
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
  const uvs = [];
  const indices = [];
  const tmpC = new THREE.Color();
  const colSoil = new THREE.Color(0xa88462);
  const colDeep = new THREE.Color(0x7d6248);
  const colFace = new THREE.Color(0x6d6258);
  const coalC = new THREE.Color(0x0c1016);

  function paintSoil(x, z, y, face) {
    const depth = THREE.MathUtils.clamp(-y / 30, 0, 1);
    tmpC.copy(colSoil).lerp(colDeep, depth * 0.35);
    if (face > 0.05) tmpC.lerp(colFace, 0.32 * face);
    const n = hash2(Math.floor(x * 0.8), Math.floor(z * 0.8));
    tmpC.offsetHSL(0, (n - 0.5) * 0.03, (n - 0.5) * 0.035);
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
      const bench = heightAt(r);
      const face = faceAmount(r);
      let y = bench;
      if (onRoad) {
        y = haul.y - 0.14;
        paintSoil(x, z, bench, face);
        tmpC.multiplyScalar(0.78);
      } else if (haul.dist < edge) {
        const k = (haul.dist - HAUL.cover) / HAUL.shoulder;
        const s = k * k * (3 - 2 * k);
        y = THREE.MathUtils.lerp(haul.y - 0.08, bench, s);
        paintSoil(x, z, bench, face);
        tmpC.multiplyScalar(THREE.MathUtils.lerp(0.86, 1, s));
      } else {
        paintSoil(x, z, y, face);
      }
      if (!onRoad) {
        const coal = coalAt(r, a);
        if (coal.amount > 0.04) tmpC.lerp(coalC, coal.amount);
        if (coal.recess > 0.05 && haul.dist > edge) y -= coal.recess * 0.9;
      }
      positions.push(x, y, z);
      colors.push(tmpC.r, tmpC.g, tmpC.b);
      uvs.push(x * 0.16, z * 0.16);
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
  buffer.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  buffer.setIndex(indices);
  buffer.computeVertexNormals();

  const earth = surfaceTexture('earth');
  const mesh = new THREE.Mesh(
    buffer,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: earth,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
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
