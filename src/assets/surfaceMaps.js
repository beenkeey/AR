import * as THREE from 'three';
import { CONFIG } from '../config.js';

const WEAK = CONFIG.performance.weak;
const CACHE = new Map();

function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function fbm(x, y, seed) {
  return (
    hash(x, y, seed) * 0.45
    + hash(x >> 2, y >> 2, seed + 11) * 0.32
    + hash(x >> 4, y >> 4, seed + 23) * 0.23
  );
}

function makeCanvas(size, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(size, size);
  paint(img.data, size);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function toMap(canvas, colorSpace) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = WEAK ? 4 : 8;
  tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

function paintKind(kind, data, size) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = fbm(x >> 2, y >> 2, 1);
      const n2 = fbm((x >> 2) + 17, (y >> 2) + 9, 40);
      let r = 228;
      let g = 228;
      let b = 228;
      if (kind === 'metal') {
        const v = 214 + n * 18;
        r = v;
        g = v + 1;
        b = v + 3;
      } else if (kind === 'rust') {
        r = 148 + n * 36;
        g = 112 + n2 * 22;
        b = 90 + n * 10;
      } else if (kind === 'snow') {
        const dune = fbm(x >> 3, y >> 3, 3);
        const v = 236 + n * 8 + dune * 6;
        r = v;
        g = v + 1;
        b = v + 3;
      } else if (kind === 'rock') {
        const v = 128 + n * 36;
        r = v + 6;
        g = v + 3;
        b = v - 4;
      } else {
        const v = 220 + n * 14;
        r = v;
        g = v - 1;
        b = v - 3;
      }
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      data[i + 3] = 255;
    }
  }
}

function buildKind(kind) {
  const size = kind === 'snow' ? (WEAK ? 96 : 160) : (WEAK ? 96 : 128);
  const albedoCanvas = makeCanvas(size, (data) => paintKind(kind, data, size));
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  const src = albedoCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const n = fbm((x >> 2) + 3, (y >> 2) + 5, 90);
      const v = 110 + ((src[i] + src[i + 1] + src[i + 2]) / 3 - 180) * 0.35 + n * 18;
      const c = Math.max(70, Math.min(200, v));
      rimg.data[i] = c;
      rimg.data[i + 1] = c;
      rimg.data[i + 2] = c;
      rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  const albedo = toMap(albedoCanvas, THREE.SRGBColorSpace);
  const roughness = toMap(roughCanvas, THREE.NoColorSpace);
  const repeat = kind === 'snow' ? 3.5 : kind === 'rock' ? 4 : 1.6;
  albedo.repeat.set(repeat, repeat);
  roughness.repeat.set(repeat, repeat);

  let normal = null;
  if (!WEAK && kind !== 'snow' && kind !== 'paint') {
    const nCanvas = document.createElement('canvas');
    nCanvas.width = size;
    nCanvas.height = size;
    const nctx = nCanvas.getContext('2d');
    const nimg = nctx.createImageData(size, size);
    const lum = (x, y) => {
      const xx = ((x % size) + size) % size;
      const yy = ((y % size) + size) % size;
      const i = (yy * size + xx) * 4;
      return src[i] / 255;
    };
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = lum(x + 1, y) - lum(x - 1, y);
        const dy = lum(x, y + 1) - lum(x, y - 1);
        const i = (y * size + x) * 4;
        nimg.data[i] = Math.max(0, Math.min(255, 128 - dx * 90));
        nimg.data[i + 1] = Math.max(0, Math.min(255, 128 - dy * 90));
        nimg.data[i + 2] = 255;
        nimg.data[i + 3] = 255;
      }
    }
    nctx.putImageData(nimg, 0, 0);
    normal = toMap(nCanvas, THREE.NoColorSpace);
    normal.repeat.set(repeat, repeat);
  }

  return { albedo, roughness, normal };
}

export function surface(kind = 'paint') {
  if (!CACHE.has(kind)) CACHE.set(kind, buildKind(kind));
  return CACHE.get(kind);
}

/** Multiply-tint noise maps so one atlas serves many paint colors. */
export function textured(material, kind = 'paint', extra = {}) {
  if (!material || material.transparent) return material;
  const maps = surface(kind);
  material.map = maps.albedo;
  material.roughnessMap = maps.roughness;
  if (maps.normal) {
    material.normalMap = maps.normal;
    const n = extra.normalScale ?? (kind === 'rock' ? 0.28 : 0.12);
    material.normalScale = new THREE.Vector2(n, n);
  } else {
    material.normalMap = null;
  }
  material.needsUpdate = true;
  return material;
}
