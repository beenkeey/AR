import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textured } from './surfaceMaps.js';

const WEAK = CONFIG.performance.weak;
const RAD = WEAK ? 8 : 14;
const CAP = WEAK ? 3 : 5;

/**
 * Mi-8 / Mi-171 transport. Rounded capsules/spheres, not boxes.
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

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.55, CAP, RAD), yellow);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.set(0.05, 0.02, 0);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, RAD, 8), yellow);
  belly.position.set(0.1, -0.18, 0);
  belly.scale.set(1.55, 0.55, 1.05);

  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.05, CAP, RAD), black);
  upper.rotation.z = Math.PI / 2;
  upper.position.set(0.08, 0.46, 0);
  upper.scale.set(1, 0.85, 1.05);

  const tankL = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.15, CAP, RAD), yellow);
  tankL.rotation.z = Math.PI / 2;
  tankL.position.set(0.05, -0.12, 0.58);
  const tankR = tankL.clone();
  tankR.position.z = -0.58;

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.38, RAD, 10), glass);
  nose.position.set(1.28, 0.14, 0);
  nose.scale.set(1.15, 0.85, 0.95);
  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.28, RAD, 8), yellow);
  chin.position.set(1.22, -0.18, 0);
  chin.scale.set(1.2, 0.7, 1.05);

  const boomY = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.25, RAD), yellow);
  boomY.rotation.z = Math.PI / 2 + 0.05;
  boomY.position.set(-1.45, 0.16, 0);
  const boomR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.45, RAD), red);
  boomR.rotation.z = Math.PI / 2 + 0.07;
  boomR.position.set(-2.62, 0.28, 0);

  const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.72, 3, 8), red);
  fin.position.set(-3.28, 0.62, 0);
  fin.scale.set(0.55, 1, 1.8);
  const stab = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.85, 3, 8), red);
  stab.rotation.x = Math.PI / 2;
  stab.position.set(-3.2, 0.32, 0);

  const engineL = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.52, 3, 8), black);
  engineL.rotation.z = Math.PI / 2;
  engineL.position.set(0.18, 0.68, 0.22);
  const engineR = engineL.clone();
  engineR.position.z = -0.22;
  const intake = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), black);
  intake.position.set(0.58, 0.74, 0);
  intake.scale.set(1.1, 0.65, 1.6);

  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.24),
    new THREE.MeshBasicMaterial({ map: utair, transparent: true }),
  );
  logo.position.set(0.12, 0.16, 0.47);
  const logoR = logo.clone();
  logoR.position.z = -0.47;
  logoR.rotation.y = Math.PI;
  const code = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.16),
    new THREE.MeshBasicMaterial({ map: tailCode, transparent: true }),
  );
  code.position.set(-2.5, 0.3, 0.09);
  const codeR = code.clone();
  codeR.position.z = -0.09;
  codeR.rotation.y = Math.PI;

  for (let i = 0; i < 6; i += 1) {
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), glass);
    win.position.set(0.5 - i * 0.26, 0.1, 0.455);
    inner.add(win);
    const winR = win.clone();
    winR.position.z = -0.455;
    winR.rotation.y = Math.PI;
    inner.add(winR);
  }

  const gearF = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), rubber);
  gearF.position.set(1.05, -0.68, 0);
  gearF.scale.set(1.3, 0.7, 1.3);
  const gearL = gearF.clone();
  gearL.position.set(-0.5, -0.68, 0.46);
  const gearR = gearF.clone();
  gearR.position.set(-0.5, -0.68, -0.46);
  const strutF = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.22, 2, 6), black);
  strutF.position.set(1.05, -0.5, 0);
  const strutL = strutF.clone();
  strutL.position.set(-0.5, -0.5, 0.46);
  const strutR = strutF.clone();
  strutR.position.set(-0.5, -0.5, -0.46);

  const rotor = new THREE.Group();
  rotor.position.set(0.06, 0.96, 0);
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 10), rotorMat));
  for (let i = 0; i < 5; i += 1) {
    const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 3.15, 2, 6), rotorMat);
    blade.rotation.z = Math.PI / 2;
    blade.scale.z = 0.45;
    blade.position.x = 1.62;
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 5) * Math.PI * 2;
    pivot.add(blade);
    rotor.add(pivot);
  }

  const tail = new THREE.Group();
  tail.position.set(-3.3, 0.86, 0.22);
  const tailHub = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), rotorMat);
  tail.add(tailHub);
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.62, 2, 6), rotorMat);
    blade.rotation.z = Math.PI / 2;
    blade.position.x = 0.32;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 3) * Math.PI * 2;
    pivot.add(blade);
    tail.add(pivot);
  }

  inner.add(
    fuselage, belly, upper, tankL, tankR, nose, chin, boomY, boomR, fin, stab,
    engineL, engineR, intake, logo, logoR, code, codeR,
    gearF, gearL, gearR, strutF, strutL, strutR, rotor, tail,
  );

  group.userData.rotor = rotor;
  group.userData.tail = tail;
  return group;
}

function std(color, metalness, roughness) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  textured(material, metalness > 0.25 ? 'metal' : 'paint');
  return material;
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
