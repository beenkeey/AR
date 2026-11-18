import { queryHaul } from './HaulRoad.js';

/**
 * Two worked coal faces. The shovel stands on the bench deck and the
 * bucket reaches the toe of the highwall (outer face).
 * Angles are chosen so both the tracks and the face stay off the haul road.
 */
const FACES = [
  { faceR: 28, standR: 23.0, deckY: -20.2, arc: 0.62, phase: 0.18, scale: 1.35 },
  { faceR: 64, standR: 58.0, deckY: -4.8, arc: 0.55, phase: 0.37, scale: 1 },
];

const SEAM_RADII = [28, 40, 52, 64];

let _sites = null;

export function coalDigSites() {
  if (_sites) return _sites;
  _sites = FACES.map((face) => {
    let best = null;
    for (let i = 0; i < 90; i += 1) {
      const ang = (i / 90) * Math.PI * 2;
      const r0 = face.standR - 3.4;
      const r1 = face.faceR + 1.6;
      let score = Infinity;
      for (let k = 0; k <= 12; k += 1) {
        const radius = r0 + ((r1 - r0) * k) / 12;
        for (const lat of [-2.4, 0, 2.4]) {
          const x = Math.cos(ang) * radius - Math.sin(ang) * lat;
          const z = Math.sin(ang) * radius + Math.cos(ang) * lat;
          score = Math.min(score, queryHaul(x, z).dist);
        }
      }
      if (!best || score > best.score) best = { ...face, ang, score };
    }
    return best;
  });
  return _sites;
}

/** How much of this ground point is exposed coal, and how deep the dig cut is. */
export function coalAt(r, angle) {
  let amount = 0;
  let recess = 0;
  for (const faceR of SEAM_RADII) {
    const mid = faceR + 1.15;
    const d = Math.abs(r - mid);
    if (d >= 1.45) continue;
    const band = 1 - d / 1.45;
    const n = Math.sin(angle * 7.5 + faceR * 0.41);
    const gate = n > -0.25 ? 0.82 : 0.18;
    amount = Math.max(amount, band * gate * (0.5 + 0.28 * Math.max(n, 0)));
  }
  for (const site of coalDigSites()) {
    let da = angle - site.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    const ad = Math.abs(da);
    if (ad > site.arc) continue;
    const angK = 1 - ad / site.arc;
    // Worked seam: deck in front of the tracks, the highwall, and the bench above it.
    if (r >= site.standR + 1.2 && r <= site.faceR + 8) {
      const onFace = r >= site.faceR - 0.15 && r <= site.faceR + 3.4;
      amount = Math.max(amount, angK * (onFace ? 1 : 0.88));
      if (onFace) recess = Math.max(recess, angK * 0.75);
    }
  }
  return { amount: Math.min(1, amount), recess };
}
