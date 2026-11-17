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

  function colorAt(y) {
    const c = new THREE.Color();
    if (y < -22) c.setHex(0x2c2824);
    else if (y < -16) c.setHex(0x8a4a30);
    else if (y < -10) c.setHex(0xc46a38);
    else if (y < -4) c.setHex(0xd48948);
    else c.setHex(0xc9a06a);
    const n = Math.sin(y * 1.7) * 0.04 + Math.cos(y * 0.9) * 0.03;
    c.offsetHSL(0, 0, n);
    return c;
  }

  const radial = rings;
  const angular = segs;
  const positions = [];
  const colors = [];
  const indices = [];
  const tmpC = new THREE.Color();
  const asphaltC = new THREE.Color(0x3a4450);
  const coalC = new THREE.Color(0x0c1016);

  for (let ir = 0; ir <= radial; ir += 1) {
    const r = (ir / radial) * rimR;
    for (let ia = 0; ia <= angular; ia += 1) {
      const a = (ia / angular) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const bench = heightAt(r)
        + Math.sin(a * 6 + r * 0.2) * 0.08
        + Math.cos(a * 3 - r * 0.15) * 0.06;
      let y = bench;
      const haul = queryHaul(x, z);
      const edge = HAUL.cover + HAUL.shoulder;
      const onRoad = haul.dist <= HAUL.cover;
      if (haul.dist < edge) {
        const cut = haul.y - 0.2;
        if (onRoad) {
          y = cut;
          tmpC.setHex(0x3a4450);
        } else {
          const k = (haul.dist - HAUL.cover) / HAUL.shoulder;
          const s = k * k * (3 - 2 * k);
          y = THREE.MathUtils.lerp(cut, bench, s);
          tmpC.copy(colorAt(bench)).lerp(asphaltC, 1 - s);
        }
      } else {
        tmpC.copy(colorAt(y));
      }
      if (!onRoad) {
        const coal = coalAt(r, a);
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
      roughness: 0.92,
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
