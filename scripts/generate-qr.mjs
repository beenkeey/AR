import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'assets', 'targets', 'coal-quarry-qr.png');
const url = process.env.AR_URL || 'https://beenkeey.github.io/AR/';

mkdirSync(dirname(out), { recursive: true });
await QRCode.toFile(out, url, {
  type: 'png',
  width: 1024,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#111111', light: '#ffffff' },
});
console.log(`QR → ${out}\nURL → ${url}`);
