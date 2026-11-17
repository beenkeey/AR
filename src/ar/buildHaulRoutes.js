/**
 * Spiral haul routes: arc along a bench, then down the ramp to the next.
 * Coordinates are local to quarry center.
 */

function arcPoints(radius, y, a0, a1, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    pts.push([Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return pts;
}

/**
 * @param {{ r: number, y: number }[]} roads
 * @param {{ angle: number, top: number[], mid: number[], bot: number[] }[]} ramps
 */
export function buildSpiralRoutes(roads, ramps) {
  if (!roads?.length || !ramps?.length) return [];

  // Route A: rim → bottom via consecutive ramps (descending spiral)
  const down = [];
  let ang = ramps[0].angle - 1.8;
  for (let i = 0; i < roads.length; i += 1) {
    const road = roads[i];
    const ramp = ramps[i];
    const aArrive = ramp ? ramp.angle : ang + 2.2;
    down.push(...arcPoints(road.r, road.y, ang, aArrive, 5));
    if (ramp) {
      down.push(ramp.top, ramp.mid, ramp.bot);
      ang = ramp.angle + 0.35;
    }
  }
  // Climb back up opposite ramps for a closed spiral
  for (let i = roads.length - 2; i >= 0; i -= 1) {
    const road = roads[i];
    const ramp = ramps[i];
    if (!ramp) continue;
    const a1 = ramp.angle + Math.PI;
    down.push(...arcPoints(roads[i + 1].r, roads[i + 1].y, ang, a1 - 0.2, 4));
    down.push(
      [Math.cos(a1) * ramp.r1, ramp.y1, Math.sin(a1) * ramp.r1],
      [Math.cos(a1) * ramp.midR, (ramp.y0 + ramp.y1) * 0.5, Math.sin(a1) * ramp.midR],
      [Math.cos(a1) * ramp.r0, ramp.y0, Math.sin(a1) * ramp.r0],
    );
    ang = a1 + 0.35;
    down.push(...arcPoints(road.r, road.y, ang, ang + 1.4, 4));
    ang += 1.4;
  }

  // Route B: starts mid-pit, phase-shifted, mostly mid benches
  const mid = [];
  let angB = ramps[1]?.angle - 1.2 || 0.5;
  for (let i = 1; i < Math.min(4, roads.length); i += 1) {
    const road = roads[i];
    const ramp = ramps[i];
    const aArrive = ramp ? ramp.angle : angB + 2.0;
    mid.push(...arcPoints(road.r, road.y, angB, aArrive, 5));
    if (ramp && i < roads.length - 1) {
      mid.push(ramp.top, ramp.mid, ramp.bot);
      angB = ramp.angle + 0.4;
    } else {
      angB = aArrive + 0.3;
    }
  }
  // Return upward via ramp 1 opposite
  if (ramps[1]) {
    const ramp = ramps[1];
    const a = ramp.angle + Math.PI;
    mid.push(
      [Math.cos(a) * ramp.r1, ramp.y1, Math.sin(a) * ramp.r1],
      [Math.cos(a) * ramp.midR, (ramp.y0 + ramp.y1) * 0.5, Math.sin(a) * ramp.midR],
      [Math.cos(a) * ramp.r0, ramp.y0, Math.sin(a) * ramp.r0],
    );
    mid.push(...arcPoints(roads[1].r, roads[1].y, a + 0.2, a + 2.0, 5));
  }

  // Route C: upper two benches only, opposite phase
  const upper = [];
  let angC = (ramps[0]?.angle || 0) + Math.PI;
  upper.push(...arcPoints(roads[0].r, roads[0].y, angC, angC + 2.4, 6));
  if (ramps[0]) {
    const ramp = ramps[0];
    const a = ramp.angle;
    upper.push(ramp.top, ramp.mid, ramp.bot);
    upper.push(...arcPoints(roads[1].r, roads[1].y, a + 0.3, a + 2.6, 6));
    const aUp = a + Math.PI;
    upper.push(
      [Math.cos(aUp) * ramp.r1, ramp.y1, Math.sin(aUp) * ramp.r1],
      [Math.cos(aUp) * ramp.midR, (ramp.y0 + ramp.y1) * 0.5, Math.sin(aUp) * ramp.midR],
      [Math.cos(aUp) * ramp.r0, ramp.y0, Math.sin(aUp) * ramp.r0],
    );
  }
  upper.push(...arcPoints(roads[0].r, roads[0].y, angC + 3.0, angC + 5.5, 6));

  return [
    { scale: 1.5, duration: 95, phase: 0.0, waypoints: down },
    { scale: 1.3, duration: 78, phase: 0.0, waypoints: mid },
    { scale: 1.35, duration: 70, phase: 0.0, waypoints: upper },
  ];
}
