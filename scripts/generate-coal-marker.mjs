import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'assets', 'targets', 'coal-quarry-marker.png');

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

/** Distinct high-contrast quarry marker for MindAR (not MindAR Soft). */
function generateMarker(size = 768) {
  const rgb = Buffer.alloc(size * size * 3);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  };
  const rect = (x0, y0, w, h, r, g, b) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) set(x, y, r, g, b);
    }
  };
  const circ = (cx, cy, rad, r, g, b) => {
    for (let y = -rad; y <= rad; y += 1) {
      for (let x = -rad; x <= rad; x += 1) {
        if (x * x + y * y <= rad * rad) set(cx + x, cy + y, r, g, b);
      }
    }
  };

  // Cream field
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = hash32(x * 17 + y * 91) & 15;
      set(x, y, 245 - n, 236 - n, 220 - (n >> 1));
    }
  }

  // Thick dark border (feature-rich frame)
  rect(0, 0, size, 48, 18, 22, 28);
  rect(0, size - 48, size, 48, 18, 22, 28);
  rect(0, 0, 48, size, 18, 22, 28);
  rect(size - 48, 0, 48, size, 18, 22, 28);
  rect(48, 48, size - 96, 16, 255, 196, 0);
  rect(48, size - 64, size - 96, 16, 255, 196, 0);

  // Quarry terrace bands
  const bands = [
    [70, 90, 280, 70, 212, 138, 64],
    [120, 170, 360, 55, 196, 90, 48],
    [180, 235, 280, 50, 90, 82, 76],
    [230, 295, 200, 45, 46, 42, 40],
  ];
  for (const [x, y, w, h, r, g, b] of bands) rect(x, y, w, h, r, g, b);

  // Yellow BelAZ block
  rect(430, 200, 180, 90, 255, 196, 0);
  rect(590, 220, 55, 55, 255, 196, 0);
  circ(450, 300, 22, 30, 30, 34);
  circ(520, 300, 22, 30, 30, 34);
  circ(580, 300, 22, 30, 30, 34);

  // Excavator boom marks
  rect(140, 120, 28, 160, 255, 120, 30);
  rect(140, 120, 120, 28, 255, 120, 30);
  circ(270, 134, 26, 160, 170, 180);

  // Drone glyph
  circ(560, 120, 34, 255, 255, 255);
  rect(520, 112, 80, 16, 30, 200, 176);
  rect(545, 95, 10, 50, 30, 30, 34);
  rect(575, 95, 10, 50, 30, 30, 34);

  // Unique corner glyphs
  const corners = [
    [70, 400, 90, 90, 30, 200, 176],
    [580, 420, 100, 70, 61, 204, 106],
    [90, 560, 70, 100, 255, 80, 60],
    [520, 560, 110, 80, 80, 140, 220],
  ];
  for (const [x, y, w, h, r, g, b] of corners) rect(x, y, w, h, r, g, b);

  // Scatter feature dots
  for (let i = 0; i < 70; i += 1) {
    const h = hash32(i * 9973 + 42);
    const x = 80 + (h % (size - 160));
    const y = 80 + ((h >>> 10) % (size - 160));
    const rad = 6 + (h % 18);
    circ(x, y, rad, h & 255, (h >>> 8) & 200, (h >>> 16) & 180);
  }

  // Title bar
  rect(200, 500, 360, 70, 18, 22, 28);
  // Pixel letters К А Р Ь Е Р — blocky shapes
  const bars = [
    [220, 515, 18, 40], [220, 515, 40, 12], [220, 543, 40, 12],
    [280, 515, 18, 40], [298, 515, 28, 12], [298, 533, 22, 12],
    [350, 515, 18, 40], [368, 515, 28, 12], [368, 533, 22, 12], [368, 543, 28, 12],
    [420, 515, 40, 12], [430, 515, 18, 40],
    [480, 515, 40, 12], [480, 515, 18, 40], [502, 515, 18, 40], [480, 543, 40, 12],
    [540, 515, 18, 40], [540, 515, 36, 12], [540, 533, 28, 12],
  ];
  for (const [x, y, w, h] of bars) rect(x, y, w, h, 255, 220, 80);

  return writePNG(size, size, rgb);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, generateMarker(768));
console.log(`Wrote ${out}`);
