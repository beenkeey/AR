import * as THREE from 'three';

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

  for (let ir = 0; ir <= radial; ir += 1) {
    const r = (ir / radial) * rimR;
    for (let ia = 0; ia <= angular; ia += 1) {
      const a = (ia / angular) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      let y = heightAt(r);
      y += Math.sin(a * 6 + r * 0.2) * 0.08 + Math.cos(a * 3 - r * 0.15) * 0.06;
      positions.push(x, y, z);
      tmpC.copy(colorAt(y));
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
    }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3e4752, roughness: 0.8, metalness: 0.1 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf0c400, roughness: 0.45, metalness: 0.1 });
  const roadDefs = [
    { r: 71, y: 0.08, w: 5.2 },
    { r: 58, y: -4.72, w: 5.0 },
    { r: 46, y: -9.72, w: 4.8 },
    { r: 34, y: -14.92, w: 4.6 },
    { r: 22, y: -20.12, w: 4.2 },
  ];
  for (const rd of roadDefs) {
    const road = new THREE.Mesh(
      new THREE.RingGeometry(rd.r - rd.w * 0.5, rd.r + rd.w * 0.5, angular),
      roadMat,
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = rd.y;
    road.receiveShadow = true;
    group.add(road);
    const line = new THREE.Mesh(
      new THREE.RingGeometry(rd.r - 0.1, rd.r + 0.1, angular),
      lineMat,
    );
    line.rotation.x = -Math.PI / 2;
    line.position.y = rd.y + 0.025;
    group.add(line);
  }

  for (let i = 0; i < roadDefs.length - 1; i += 1) {
    const a = i * 1.55 + 0.4;
    const r0 = roadDefs[i].r;
    const r1 = roadDefs[i + 1].r;
    const y0 = roadDefs[i].y;
    const y1 = roadDefs[i + 1].y;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 15), roadMat);
    ramp.position.set(
      Math.cos(a) * ((r0 + r1) * 0.5),
      (y0 + y1) * 0.5,
      Math.sin(a) * ((r0 + r1) * 0.5),
    );
    ramp.lookAt(Math.cos(a) * r1, y1, Math.sin(a) * r1);
    const pitch = Math.atan2(y0 - y1, Math.abs(r0 - r1));
    ramp.rotateX(-pitch * 0.55);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    group.add(ramp);
  }

  group.userData.roadDefs = roadDefs;
  group.userData.heightAt = heightAt;
  return group;
}
