import * as THREE from 'three';

const cache = new Map();

function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function fbm(x, y, seed) {
  return hash(x, y, seed) * 0.5
    + hash(x >> 1, y >> 1, seed + 3) * 0.3
    + hash(x >> 2, y >> 2, seed + 9) * 0.2;
}

function build(kind) {
  const size = 128;
  const albedo = new Uint8ClampedArray(size * size * 4);
  const rough = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const panel = fbm(x >> 4, y >> 4, kind === 'plate' ? 4 : 1);
      const fine = hash(x, y, 11);
      let v;
      let rgh;
      if (kind === 'plate') {
        v = 188 + panel * 48 + fine * 14;
        rgh = 150 + (1 - panel) * 55 + fine * 24;
      } else if (kind === 'rubber') {
        v = 228 + fine * 18;
        rgh = 210 + fine * 30;
      } else {
        // Enamel: near-white modulator so the material color stays true.
        v = 196 + panel * 46 + fine * 12;
        rgh = 168 + (1 - panel) * 48 + fine * 18;
      }
      const c = Math.max(0, Math.min(255, v));
      const q = Math.max(0, Math.min(255, rgh));
      albedo[i] = c;
      albedo[i + 1] = c;
      albedo[i + 2] = c;
      albedo[i + 3] = 255;
      rough[i] = q;
      rough[i + 1] = q;
      rough[i + 2] = q;
      rough[i + 3] = 255;
    }
  }
  const albedoMap = new THREE.CanvasTexture(imageFrom(albedo, size));
  const roughnessMap = new THREE.CanvasTexture(imageFrom(rough, size));
  for (const tex of [albedoMap, roughnessMap]) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  roughnessMap.colorSpace = THREE.NoColorSpace;
  const repeat = kind === 'plate' ? 2.4 : 1.8;
  albedoMap.repeat.set(repeat, repeat);
  roughnessMap.repeat.set(repeat, repeat);
  return { albedoMap, roughnessMap };
}

function imageFrom(data, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = new ImageData(data, size, size);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function mapsFor(kind) {
  if (!cache.has(kind)) cache.set(kind, build(kind));
  return cache.get(kind);
}

/**
 * Break up flat toy shading. Albedo stays near white so yellow paint
 * remains yellow; roughness variation kills the single plastic highlight.
 */
export function applyFinish(material, kind) {
  if (typeof document === 'undefined') return material;
  if (!material || material.transparent) return material;
  if (material.emissive && material.emissive.getHex() > 0 && material.emissiveIntensity > 0.2) return material;
  const maps = mapsFor(kind);
  material.map = maps.albedoMap;
  material.roughnessMap = maps.roughnessMap;
  material.needsUpdate = true;
  return material;
}

const surfaceCache = new Map();

function clampByte(v) {
  return Math.max(0, Math.min(255, v | 0));
}

/** Colored ground photo. Null outside the browser so node checks still load. */
export function surfaceTexture(kind) {
  if (typeof document === 'undefined') return null;
  if (surfaceCache.has(kind)) return surfaceCache.get(kind);
  const size = 256;
  const data = new Uint8ClampedArray(size * size * 4);
  const gravel = kind === 'gravel';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const coarse = fbm(x >> 3, y >> 3, gravel ? 21 : 4);
      const fine = hash(x, y, gravel ? 8 : 2);
      const chip = hash(x >> 2, y >> 2, 19);
      let r;
      let g;
      let b;
      if (kind === 'asphalt') {
        const grain = 62 + fine * 16 + hash(x >> 1, y >> 1, 4) * 8;
        const speckle = chip > 0.94 ? 14 : 0;
        r = grain + speckle;
        g = grain + 2 + speckle;
        b = grain + 6 + speckle;
      } else if (gravel) {
        const stone = chip > 0.72 ? 186 : chip < 0.14 ? 128 : 156 + coarse * 22;
        r = stone + fine * 10;
        g = stone + fine * 6 - 4;
        b = stone - 10;
      } else if (kind === 'earth') {
        const grain = 198 + fine * 42 + hash(x >> 1, y >> 1, 5) * 16;
        const pebble = chip < 0.06 ? -28 : 0;
        r = grain + 6 + pebble;
        g = grain - 2 + pebble;
        b = grain - 8 + pebble;
      } else {
        const soil = 132 + fine * 36 + hash(x >> 1, y >> 1, 7) * 22;
        const speck = chip < 0.08 ? 22 : 0;
        r = soil + 16 - speck;
        g = soil - speck * 0.3;
        b = soil - 28;
      }
      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.CanvasTexture(imageFrom(data, size));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  surfaceCache.set(kind, tex);
  return tex;
}
