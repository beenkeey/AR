import * as THREE from 'three';

/**
 * Yellow KamAZ crew bus (вахтовка). Visual reference: фото/автобус.jpg
 * Geometry only — no photo textures. Length along +X, sides face ±Z.
 */
export function createCrewBus() {
  const group = new THREE.Group();
  group.name = 'CrewBus';

  const yellow = std(0xf4c300, 0.08, 0.48);
  const yellowDark = std(0xd4a800, 0.08, 0.55);
  const black = std(0x1a1c1e, 0.18, 0.55);
  const chassisMat = std(0x2a2d32, 0.28, 0.5);
  const glass = std(0x1c2830, 0.62, 0.12, { transparent: true, opacity: 0.42 });
  const rubber = std(0x121212, 0.04, 0.82);
  const rim = std(0x2c3034, 0.35, 0.4);
  const orange = std(0xe65c12, 0.06, 0.5);
  const red = std(0xc4281c, 0.08, 0.48);
  const white = std(0xf0f0ec, 0.04, 0.45);
  const lightFront = std(0xfff2c4, 0.1, 0.25, { emissive: 0xffe08a, emissiveIntensity: 0.45 });
  const lightRear = std(0xff2a18, 0.08, 0.35, { emissive: 0xff1808, emissiveIntensity: 0.55 });
  const frame = std(0x111214, 0.12, 0.55);

  // Chassis / sills
  box(group, chassisMat, 0.05, 0.78, 0, 8.55, 0.22, 2.05);
  box(group, black, 0.1, 0.52, 0, 8.2, 0.18, 1.55);
  box(group, black, 0.2, 0.42, 1.12, 7.6, 0.1, 0.22);
  box(group, black, 0.2, 0.42, -1.12, 7.6, 0.1, 0.22);

  // Cab
  box(group, yellow, 3.62, 1.92, 0, 2.22, 2.18, 2.38);
  box(group, yellowDark, 3.62, 3.04, 0, 2.18, 0.12, 2.42);
  box(group, black, 3.62, 3.12, 0, 2.08, 0.1, 2.48);
  box(group, black, 4.74, 0.82, 0, 0.32, 0.46, 2.28);
  box(group, yellow, 4.58, 1.18, 0, 0.22, 0.38, 2.2);

  // Windshield + cab side glass + frames
  box(group, glass, 4.74, 2.28, 0, 0.06, 0.98, 2.02);
  box(group, frame, 4.77, 2.28, 0, 0.04, 1.08, 0.06);
  box(group, glass, 3.72, 2.22, 1.22, 0.95, 0.72, 0.05);
  box(group, glass, 3.72, 2.22, -1.22, 0.95, 0.72, 0.05);
  box(group, frame, 3.72, 2.22, 1.245, 1.02, 0.82, 0.03);
  box(group, frame, 3.72, 2.22, -1.245, 1.02, 0.82, 0.03);

  // Grille / headlights
  box(group, black, 4.76, 1.48, 0, 0.08, 0.55, 1.15);
  box(group, chassisMat, 4.78, 1.48, 0.28, 0.05, 0.08, 0.7);
  box(group, chassisMat, 4.78, 1.48, -0.28, 0.05, 0.08, 0.7);
  box(group, lightFront, 4.78, 1.05, 0.72, 0.08, 0.22, 0.42);
  box(group, lightFront, 4.78, 1.05, -0.72, 0.08, 0.22, 0.42);

  // Cab steps
  box(group, black, 4.35, 0.55, 1.18, 0.7, 0.08, 0.32);
  box(group, black, 4.35, 0.55, -1.18, 0.7, 0.08, 0.32);

  // Gap between cab and passenger module
  box(group, black, 2.38, 1.55, 0, 0.28, 0.35, 1.85);

  // Passenger module + roof + rear
  box(group, yellow, -0.92, 2.2, 0, 6.15, 2.52, 2.48);
  box(group, yellowDark, -0.92, 3.5, 0, 6.18, 0.12, 2.52);
  box(group, yellow, -4.02, 2.2, 0, 0.12, 2.48, 2.42);
  box(group, black, -4.1, 0.88, 0, 0.22, 0.38, 2.18);

  // Orange / red side waves (reference graphic, geometry not photo)
  box(group, orange, -2.15, 1.48, 1.255, 2.4, 0.55, 0.04);
  box(group, red, -2.55, 1.22, 1.26, 1.7, 0.28, 0.04);
  box(group, orange, -2.15, 1.48, -1.255, 2.4, 0.55, 0.04);
  box(group, red, -2.55, 1.22, -1.26, 1.7, 0.28, 0.04);

  // Passenger door (right side toward +Z)
  box(group, yellowDark, 0.35, 1.85, 1.27, 0.62, 1.55, 0.06);
  box(group, frame, 0.35, 1.85, 1.3, 0.68, 1.62, 0.02);
  box(group, glass, 0.35, 2.35, 1.305, 0.42, 0.42, 0.03);

  addPassengerWindows(group, glass, frame, 1.255);
  addPassengerWindows(group, glass, frame, -1.255);

  // Rear window
  box(group, frame, -4.08, 2.55, 0, 0.05, 0.85, 1.55);
  box(group, glass, -4.1, 2.55, 0, 0.04, 0.72, 1.38);
  box(group, lightRear, -4.12, 1.15, 0.72, 0.06, 0.22, 0.32);
  box(group, lightRear, -4.12, 1.15, -0.72, 0.06, 0.22, 0.32);
  box(group, white, -4.12, 1.42, 0.72, 0.06, 0.08, 0.32);
  box(group, white, -4.12, 1.42, -0.72, 0.06, 0.08, 0.32);

  // Mirrors
  addMirror(group, black, glass, 4.55, 2.35, 1.42, 1);
  addMirror(group, black, glass, 4.55, 2.35, -1.42, -1);

  // Fenders over the four wheels
  box(group, black, 3.35, 0.95, 1.18, 1.15, 0.18, 0.42);
  box(group, black, 3.35, 0.95, -1.18, 1.15, 0.18, 0.42);
  box(group, black, -1.85, 0.95, 1.18, 1.35, 0.18, 0.48);
  box(group, black, -1.85, 0.95, -1.18, 1.35, 0.18, 0.48);

  // Four wheels: front pair under cab, rear pair under module
  const axles = [3.35, -1.85];
  for (const x of axles) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.28, 8), rim);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, 0.6, 0);
    group.add(axle);
    group.add(wheel(x, 0.6, 1.12, rubber, rim));
    group.add(wheel(x, 0.6, -1.12, rubber, rim));
  }

  const brand = makeBrandDecal();
  const brandMat = new THREE.MeshBasicMaterial({ map: brand, transparent: true });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.42), brandMat);
  label.position.set(-0.55, 2.72, 1.27);
  group.add(label);
  const labelR = label.clone();
  labelR.position.z = -1.27;
  labelR.rotation.y = Math.PI;
  group.add(labelR);

  return group;
}

function addPassengerWindows(group, glass, frame, z) {
  const xs = [1.55, 0.35, -0.85, -2.05, -3.15];
  const widths = [0.95, 0.95, 0.95, 0.95, 0.62];
  for (let i = 0; i < xs.length; i += 1) {
    const w = widths[i];
    box(group, frame, xs[i], 2.58, z, w + 0.08, 0.78, 0.04);
    box(group, glass, xs[i], 2.58, z + Math.sign(z) * 0.015, w, 0.66, 0.03);
  }
}

function addMirror(group, black, glass, x, y, z, side) {
  box(group, black, x, y, z, 0.08, 0.08, 0.42);
  box(group, black, x + 0.12, y - 0.05, z + side * 0.28, 0.08, 0.28, 0.22);
  box(group, glass, x + 0.17, y - 0.05, z + side * 0.28, 0.03, 0.22, 0.16);
}

function wheel(x, y, z, rubber, rim) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.4, 16), rubber);
  tire.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 12), rim);
  hub.rotation.x = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.44, 10), rim);
  cap.rotation.x = Math.PI / 2;
  g.add(tire, hub, cap);
  g.position.set(x, y, z);
  return g;
}

function box(group, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

function makeBrandDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = '#111111';
  ctx.font = '700 58px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('РОСНЕФТЬ', 256, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function std(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
