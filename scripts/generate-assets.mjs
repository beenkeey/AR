import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function writePNG(width, height, rgb) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    rgb.copy(raw, y * stride + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hash32(n) {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function generateTargetPNG(size = 768) {
  const rgb = Buffer.alloc(size * size * 3);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = hash32(x * 73856093 ^ y * 19349663 ^ 42);
      const grain = h & 31;
      set(x, y, 236 + (grain % 12), 232 + ((grain >> 2) % 10), 220 + ((grain >> 4) % 8));
    }
  }

  const rect = (x0, y0, w, h, r, g, b) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) set(x, y, r, g, b);
    }
  };

  rect(0, 0, size, 28, 18, 28, 36);
  rect(0, size - 28, size, 28, 18, 28, 36);
  rect(0, 0, 28, size, 18, 28, 36);
  rect(size - 28, 0, 28, size, 18, 28, 36);

  const cells = [
    [48, 48, 170, 170, 12, 90, 140],
    [250, 48, 210, 130, 180, 70, 40],
    [500, 48, 220, 200, 40, 110, 90],
    [48, 250, 200, 220, 90, 40, 120],
    [280, 210, 180, 180, 200, 160, 40],
    [500, 270, 220, 180, 30, 80, 160],
    [48, 500, 230, 220, 20, 120, 100],
    [310, 500, 190, 220, 140, 50, 50],
    [530, 490, 190, 230, 50, 50, 50],
  ];
  for (const [x, y, w, h, r, g, b] of cells) rect(x, y, w, h, r, g, b);

  for (let i = 0; i < 90; i += 1) {
    const h = hash32(i * 9973 + 17);
    const x = 40 + (h % (size - 80));
    const y = 40 + ((h >>> 10) % (size - 80));
    const w = 12 + (h % 48);
    const hh = 12 + ((h >>> 6) % 48);
    const r = 20 + (h % 200);
    const g = 20 + ((h >>> 8) % 200);
    const b = 20 + ((h >>> 16) % 200);
    rect(x, y, w, hh, r, g, b);
  }

  for (let i = 0; i < 40; i += 1) {
    const h = hash32(i * 1337 + 99);
    const cx = 60 + (h % (size - 120));
    const cy = 60 + ((h >>> 9) % (size - 120));
    const rad = 8 + (h % 28);
    for (let y = -rad; y <= rad; y += 1) {
      for (let x = -rad; x <= rad; x += 1) {
        if (x * x + y * y <= rad * rad) {
          set(cx + x, cy + y, h & 255, (h >>> 8) & 255, (h >>> 16) & 255);
        }
      }
    }
  }

  const glyph = (ox, oy, rows, r = 250, g = 250, b = 245) => {
    const s = 8;
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        if (rows[y][x] === '1') rect(ox + x * s, oy + y * s, s, s, r, g, b);
      }
    }
  };

  const R = ['11110', '10001', '10001', '11110', '10100', '10010', '10001'];
  const I = ['11111', '00100', '00100', '00100', '00100', '00100', '11111'];
  const G = ['01110', '10001', '10000', '10111', '10001', '10001', '01110'];
  glyph(250, 340, R);
  glyph(310, 340, I);
  glyph(370, 340, G);
  glyph(430, 340, ['11111', '10000', '10000', '11110', '10000', '10000', '11111']);

  return writePNG(size, size, rgb);
}

function concatFloat32(chunks) {
  const count = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(count);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function concatUint16(chunks) {
  const count = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint16Array(count);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function box(cx, cy, cz, sx, sy, sz, color) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const faces = [
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
    { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
  ];
  const pos = [];
  const nrm = [];
  const col = [];
  const idx = [];
  let base = 0;
  for (const f of faces) {
    for (const p of f.v) {
      pos.push(cx + p[0], cy + p[1], cz + p[2]);
      nrm.push(...f.n);
      col.push(color[0], color[1], color[2], 1);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    col: new Float32Array(col),
    idx: new Uint16Array(idx),
  };
}

function align4(n) {
  return (n + 3) & ~3;
}

function generateRigGLB() {
  const steel = [0.55, 0.58, 0.62];
  const accent = [0.86, 0.45, 0.12];
  const deck = [0.22, 0.24, 0.28];
  const parts = [];

  parts.push(box(0, 0.08, 0, 2.4, 0.16, 2.4, deck));
  parts.push(box(0, 0.28, 0, 1.6, 0.24, 1.6, steel));
  for (const x of [-0.95, 0.95]) {
    for (const z of [-0.95, 0.95]) {
      parts.push(box(x, 0.7, z, 0.12, 1.2, 0.12, steel));
    }
  }
  parts.push(box(0, 1.45, 0, 1.3, 0.12, 1.3, accent));

  for (let i = 0; i < 8; i += 1) {
    const y = 1.7 + i * 0.42;
    const w = 1.05 - i * 0.07;
    parts.push(box(0, y, 0, w, 0.08, w, steel));
    parts.push(box(-w / 2, y + 0.18, -w / 2, 0.08, 0.42, 0.08, steel));
    parts.push(box(w / 2, y + 0.18, -w / 2, 0.08, 0.42, 0.08, steel));
    parts.push(box(-w / 2, y + 0.18, w / 2, 0.08, 0.42, 0.08, steel));
    parts.push(box(w / 2, y + 0.18, w / 2, 0.08, 0.42, 0.08, steel));
  }

  parts.push(box(0, 5.15, 0, 0.7, 0.18, 0.7, accent));
  parts.push(box(0, 5.4, 0, 0.22, 0.35, 0.22, steel));
  parts.push(box(0.55, 1.7, 0.55, 0.18, 2.2, 0.18, accent));
  parts.push(box(0, 0.55, 0.9, 0.35, 0.7, 0.5, [0.18, 0.35, 0.55]));

  let vertexOffset = 0;
  const posChunks = [];
  const nrmChunks = [];
  const colChunks = [];
  const idxChunks = [];
  for (const p of parts) {
    posChunks.push(p.pos);
    nrmChunks.push(p.nrm);
    colChunks.push(p.col);
    const shifted = new Uint16Array(p.idx.length);
    for (let i = 0; i < p.idx.length; i += 1) shifted[i] = p.idx[i] + vertexOffset;
    idxChunks.push(shifted);
    vertexOffset += p.pos.length / 3;
  }

  const positions = concatFloat32(posChunks);
  const normals = concatFloat32(nrmChunks);
  const colors = concatFloat32(colChunks);
  const indices = concatUint16(idxChunks);

  const json = {
    asset: { version: '2.0', generator: 'rig-trigger-ar-placeholder' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'RigPlaceholder' }],
    meshes: [{
      name: 'RigPlaceholder',
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
        indices: 3,
        material: 0,
      }],
    }],
    materials: [{
      name: 'RigSteel',
      pbrMetallicRoughness: { metallicFactor: 0.35, roughnessFactor: 0.45 },
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: [0, 0, 0], max: [0, 0, 0] },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: colors.length / 4, type: 'VEC4' },
      { bufferView: 3, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
      { buffer: 0, byteOffset: 0, byteLength: normals.byteLength, target: 34962 },
      { buffer: 0, byteOffset: 0, byteLength: colors.byteLength, target: 34962 },
      { buffer: 0, byteOffset: 0, byteLength: indices.byteLength, target: 34963 },
    ],
    buffers: [{ byteLength: 0 }],
  };

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  json.accessors[0].min = [minX, minY, minZ];
  json.accessors[0].max = [maxX, maxY, maxZ];

  const posPad = align4(positions.byteLength);
  const nrmPad = align4(normals.byteLength);
  const colPad = align4(colors.byteLength);
  const idxPad = align4(indices.byteLength);
  json.bufferViews[0].byteOffset = 0;
  json.bufferViews[1].byteOffset = posPad;
  json.bufferViews[2].byteOffset = posPad + nrmPad;
  json.bufferViews[3].byteOffset = posPad + nrmPad + colPad;
  json.buffers[0].byteLength = posPad + nrmPad + colPad + idxPad;

  const jsonBuf = Buffer.from(JSON.stringify(json));
  const jsonPad = align4(jsonBuf.length);
  const jsonChunk = Buffer.alloc(jsonPad);
  jsonBuf.copy(jsonChunk);
  jsonChunk.fill(0x20, jsonBuf.length);

  const binChunk = Buffer.alloc(json.buffers[0].byteLength);
  Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength).copy(binChunk, 0);
  Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength).copy(binChunk, posPad);
  Buffer.from(colors.buffer, colors.byteOffset, colors.byteLength).copy(binChunk, posPad + nrmPad);
  Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength).copy(binChunk, posPad + nrmPad + colPad);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  const glb = Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
  glb.writeUInt32LE(glb.length, 8);
  return glb;
}

mkdirSync(join(root, 'public/assets/targets'), { recursive: true });
mkdirSync(join(root, 'public/assets/models'), { recursive: true });
writeFileSync(join(root, 'public/assets/targets/rig-target.png'), generateTargetPNG());
writeFileSync(join(root, 'public/assets/models/rig.glb'), generateRigGLB());
console.log('Generated target PNG and placeholder GLB');
