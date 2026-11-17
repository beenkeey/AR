import * as THREE from 'three';

/**
 * Autonomous BelAZ dump truck — vivid yellow, rounded volumes.
 * Nose toward local +X.
 */
export function createBelAZ() {
  const root = new THREE.Group();
  root.name = 'BelAZ';

  const yellow = mat(0xffc400, 0.12, 0.42);
  const yellowDeep = mat(0xe89a00, 0.14, 0.48);
  const orange = mat(0xff6a1a, 0.1, 0.45);
  const chassis = mat(0x3a424a, 0.4, 0.4);
  const black = mat(0x1e2226, 0.25, 0.55);
  const rubber = mat(0x141618, 0.05, 0.88);
  const rim = mat(0x8a929a, 0.55, 0.32);
  const glass = mat(0x6ec8ff, 0.2, 0.12, { transparent: true, opacity: 0.45, emissive: 0x1a4060, emissiveIntensity: 0.15 });
  const coal = mat(0x2a2622, 0.04, 0.9);
  const lamp = mat(0xfff2c8, 0.05, 0.25, { emissive: 0xffe08a, emissiveIntensity: 0.85 });
  const sensor = mat(0x3ad0ff, 0.15, 0.25, { emissive: 0x1ab8ff, emissiveIntensity: 1.0 });
  const stripe = mat(0xff3b2e, 0.08, 0.45);

  // Chassis rail
  const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 9.2, 4, 10), chassis);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0.1, 0.95, 0);
  root.add(rail);

  // Cab body (rounded)
  const cab = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 1.1, 5, 12), yellow);
  cab.rotation.z = Math.PI / 2;
  cab.position.set(4.35, 2.55, 0);
  cab.scale.set(1, 1.05, 1.35);
  root.add(cab);
  const cabRoof = new THREE.Mesh(new THREE.SphereGeometry(1.45, 14, 10), yellowDeep);
  cabRoof.position.set(4.35, 3.55, 0);
  cabRoof.scale.set(1.05, 0.42, 1.35);
  root.add(cabRoof);
  const windshield = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), glass);
  windshield.position.set(5.55, 2.7, 0);
  windshield.scale.set(0.55, 0.85, 1.15);
  root.add(windshield);
  addBox(root, black, 5.75, 1.75, 0, 0.2, 0.45, 2.0);
  addBox(root, lamp, 5.85, 1.55, 0.85, 0.12, 0.28, 0.45);
  addBox(root, lamp, 5.85, 1.55, -0.85, 0.12, 0.28, 0.45);
  addBox(root, stripe, 4.35, 2.1, 1.85, 2.2, 0.35, 0.08);
  addBox(root, stripe, 4.35, 2.1, -1.85, 2.2, 0.35, 0.08);

  // Dump bed — tapered hull
  const bed = new THREE.Group();
  bed.name = 'DumpBed';
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.35, 6.8, 12, 1, true), yellow);
  hull.rotation.z = Math.PI / 2;
  hull.position.set(-1.35, 2.55, 0);
  bed.add(hull);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 3.9), yellowDeep);
  floor.position.set(-1.35, 1.55, 0);
  bed.add(floor);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 10), yellow);
  tail.position.set(-4.55, 2.55, 0);
  tail.scale.set(0.55, 1.05, 1.15);
  bed.add(tail);
  const load = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8), coal);
  load.position.set(-1.5, 2.85, 0);
  load.scale.set(1.7, 0.75, 1.05);
  bed.add(load);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.12, 8, 20), orange);
  lip.rotation.y = Math.PI / 2;
  lip.position.set(1.85, 2.55, 0);
  lip.scale.set(1, 1.05, 0.55);
  bed.add(lip);
  root.add(bed);
  root.userData.bed = bed;

  // Wheels
  const axles = [4.2, 2.5, 0.4, -1.7, -3.5, -4.9];
  for (const x of axles) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), rim);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(x, 0.95, 0);
    root.add(axle);
    root.add(makeWheel(x, 0.95, 2.05, rubber, rim));
    root.add(makeWheel(x, 0.95, -2.05, rubber, rim));
  }

  // Autopilot mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), black);
  mast.position.set(4.35, 4.55, 0);
  root.add(mast);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), sensor);
  dish.position.set(4.35, 5.2, 0);
  dish.scale.set(1, 0.5, 1);
  root.add(dish);

  // BELAZ label
  const label = makeLabel('БелАЗ', '#111111', '#ffc400');
  const side = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.45),
    new THREE.MeshBasicMaterial({ map: label, transparent: true }),
  );
  side.position.set(-1.2, 3.55, 2.28);
  root.add(side);
  const sideR = side.clone();
  sideR.position.z = -2.28;
  sideR.rotation.y = Math.PI;
  root.add(sideR);

  root.userData.eyeLocal = new THREE.Vector3(4.1, 4.7, 0);
  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return root;
}

function makeWheel(x, y, z, rubber, rim) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.32, 10, 18), rubber);
  tire.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.55, 12), rim);
  hub.rotation.z = Math.PI / 2;
  g.add(tire, hub);
  g.position.set(x, y, z);
  return g;
}

function addBox(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function makeLabel(text, fg, bg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = '700 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
