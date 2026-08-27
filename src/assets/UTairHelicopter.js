import * as THREE from 'three';

/**
 * Mi-8 / Mi-171 styled transport heli. Paint matches фото/вертолет.jpg:
 * yellow fuselage and tanks, black upper deck, red tail, UTair / RA-22619.
 * Nose is local +X. Object3D.lookAt aims +Z, so callers yaw the wrapper.
 */
export function createUTairHelicopter() {
  const group = new THREE.Group();
  group.name = 'UTairHelicopter';
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);

  const yellow = std(0xf0c31a, 0.12, 0.48);
  const black = std(0x1a1c1e, 0.38, 0.42);
  const red = std(0xe31b23, 0.14, 0.46);
  const glass = std(0x1a2832, 0.72, 0.14);
  const rubber = std(0x141618, 0.08, 0.72);
  const rotorMat = std(0x222428, 0.32, 0.5);
  const utair = makeLabelTexture('UTair', '#143c8c', '#f0c31a', 512, 160, 92);
  const tailCode = makeLabelTexture('RA-22619', '#111111', '#e31b23', 640, 140, 78);

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.72, 1.02), yellow);
  fuselage.position.y = -0.04;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.98), black);
  upper.position.set(0.12, 0.48, 0);
  const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.55, 10), yellow);
  tankL.rotation.z = Math.PI / 2;
  tankL.position.set(0.05, -0.18, 0.62);
  const tankR = tankL.clone();
  tankR.position.z = -0.62;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.58, 0.84), glass);
  nose.position.set(1.42, 0.12, 0);
  const chin = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.78), yellow);
  chin.position.set(1.46, -0.28, 0);
  const boomY = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.22), yellow);
  boomY.position.set(-1.55, 0.18, 0);
  boomY.rotation.z = 0.06;
  const boomR = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.22), red);
  boomR.position.set(-2.68, 0.28, 0);
  boomR.rotation.z = 0.08;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.48), red);
  fin.position.set(-3.28, 0.68, 0);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.95), red);
  stab.position.set(-3.22, 0.32, 0);
  const engineL = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.34, 0.34), black);
  engineL.position.set(0.22, 0.72, 0.28);
  const engineR = engineL.clone();
  engineR.position.z = -0.28;
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.72), black);
  intake.position.set(0.62, 0.78, 0);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.28),
    new THREE.MeshBasicMaterial({ map: utair, transparent: true }),
  );
  logo.position.set(0.15, 0.18, 0.52);
  const logoR = logo.clone();
  logoR.position.z = -0.52;
  logoR.rotation.y = Math.PI;
  const code = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.18),
    new THREE.MeshBasicMaterial({ map: tailCode, transparent: true }),
  );
  code.position.set(-2.55, 0.3, 0.12);
  const codeR = code.clone();
  codeR.position.z = -0.12;
  codeR.rotation.y = Math.PI;

  for (let i = 0; i < 6; i += 1) {
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), glass);
    win.position.set(0.55 - i * 0.28, 0.08, 0.515);
    inner.add(win);
    const winR = win.clone();
    winR.position.z = -0.515;
    winR.rotation.y = Math.PI;
    inner.add(winR);
  }

  const gearF = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 8), rubber);
  gearF.position.set(1.12, -0.72, 0);
  gearF.rotation.z = Math.PI / 2;
  const gearL = gearF.clone();
  gearL.position.set(-0.55, -0.72, 0.48);
  const gearR = gearF.clone();
  gearR.position.set(-0.55, -0.72, -0.48);
  const strutF = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 0.07), black);
  strutF.position.set(1.12, -0.55, 0);
  const strutL = strutF.clone();
  strutL.position.set(-0.55, -0.55, 0.48);
  const strutR = strutF.clone();
  strutR.position.set(-0.55, -0.55, -0.48);

  const rotor = new THREE.Group();
  rotor.position.set(0.08, 0.98, 0);
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 8), rotorMat));
  for (let i = 0; i < 5; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.035, 0.18), rotorMat);
    blade.position.x = 1.7;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2;
    pivot.add(blade);
    rotor.add(pivot);
  }

  const tail = new THREE.Group();
  tail.position.set(-3.32, 0.88, 0.26);
  const tailHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), rotorMat);
  tailHub.rotation.x = Math.PI / 2;
  tail.add(tailHub);
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.03, 0.08), rotorMat);
    blade.position.x = 0.36;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 3) * Math.PI * 2;
    pivot.add(blade);
    tail.add(pivot);
  }

  inner.add(
    fuselage, upper, tankL, tankR, nose, chin, boomY, boomR, fin, stab,
    engineL, engineR, intake, logo, logoR, code, codeR,
    gearF, gearL, gearR, strutF, strutL, strutR, rotor, tail,
  );

  group.userData.rotor = rotor;
  group.userData.tail = tail;
  return group;
}

function std(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function makeLabelTexture(text, fg, bg, w, h, fontPx) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = `700 ${fontPx}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
