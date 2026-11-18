import * as THREE from 'three';
import { applyFinish } from './finishMaps.js';

/**
 * Survey aircraft. Nose is local -Z so lookAt flies them forward.
 * `quad` is a long-body four-rotor. `hex` is a heavier six-rotor disc.
 */
export function createMiningDrone(kind = 'quad') {
  const hex = kind === 'hex';
  const group = new THREE.Group();
  group.name = hex ? 'MiningHex' : 'MiningDrone';

  const body = mat(0xd5dbe2, 0.12, 0.48);
  const deck = mat(0xc5ced6, 0.18, 0.5);
  const accent = mat(0xe4ae00, 0.06, 0.55);
  const teal = mat(0x1a7f92, 0.16, 0.42);
  const black = mat(0x1e2226, 0.2, 0.55);
  const carbon = mat(0x2a3036, 0.35, 0.48);
  const glass = mat(0x1a2832, 0.25, 0.1, { transparent: true, opacity: 0.55 });
  const rotorMat = mat(0x2a2e32, 0.15, 0.55);
  const motorMat = mat(0x3a4148, 0.55, 0.38);
  const red = mat(0xff3b2e, 0.1, 0.3, { emissive: 0xff2a18, emissiveIntensity: 1.05 });
  const green = mat(0x3dff6a, 0.1, 0.3, { emissive: 0x1ec94a, emissiveIntensity: 0.9 });
  const white = mat(0xfff4d0, 0.05, 0.3, { emissive: 0xffe7a8, emissiveIntensity: 0.8 });

  const rotors = [];
  const armCount = hex ? 6 : 4;
  const armR = hex ? 2.15 : 1.42;
  const blade = hex ? 1.28 : 0.92;

  if (hex) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.28, 8), body);
    shell.position.y = 0.02;
    group.add(shell);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 8), deck);
    lid.position.y = 0.18;
    group.add(lid);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 8), accent);
    band.position.y = 0.08;
    group.add(band);
    box(group, teal, 0, 0.02, 0.42, 0.5, 0.16, 0.12);
    box(group, black, 0, -0.22, 0, 0.9, 0.16, 0.7);
    box(group, carbon, 0, -0.38, 0, 0.55, 0.18, 0.42);
    box(group, glass, 0, -0.38, 0.28, 0.22, 0.14, 0.08);
    box(group, black, 0, 0.28, -0.15, 0.04, 0.28, 0.04);
    box(group, white, 0, 0.44, -0.15, 0.08, 0.06, 0.08);
  } else {
    box(group, body, 0, 0, 0.05, 0.62, 0.26, 1.35);
    box(group, deck, 0, 0.16, 0.05, 0.5, 0.06, 1.15);
    box(group, accent, 0, 0.2, 0.15, 0.28, 0.04, 0.55);
    box(group, teal, 0, -0.02, 0.05, 0.66, 0.08, 1.05);
    box(group, body, 0, 0.02, -0.72, 0.4, 0.18, 0.38);
    box(group, glass, 0, 0.08, -0.78, 0.32, 0.12, 0.16);
    box(group, black, 0, -0.16, -0.15, 0.28, 0.12, 0.34);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), carbon);
    yoke.position.set(0, -0.28, -0.15);
    group.add(yoke);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), black);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.36, -0.15);
    group.add(lens);
    box(group, glass, 0, -0.36, -0.21, 0.06, 0.06, 0.02);
    box(group, black, 0.22, -0.22, 0.35, 0.04, 0.04, 0.7);
    box(group, black, -0.22, -0.22, 0.35, 0.04, 0.04, 0.7);
    box(group, carbon, 0.22, -0.28, 0.68, 0.05, 0.12, 0.05);
    box(group, carbon, -0.22, -0.28, 0.68, 0.05, 0.12, 0.05);
    box(group, carbon, 0.22, -0.28, 0.02, 0.05, 0.12, 0.05);
    box(group, carbon, -0.22, -0.28, 0.02, 0.05, 0.12, 0.05);
    box(group, black, 0, 0.22, 0.62, 0.03, 0.22, 0.03);
    box(group, white, 0, 0.34, 0.62, 0.07, 0.05, 0.07);
  }

  for (let i = 0; i < armCount; i += 1) {
    const ang = (i / armCount) * Math.PI * 2 + (hex ? 0 : Math.PI / 4);
    const x = Math.cos(ang) * armR;
    const z = Math.sin(ang) * armR;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armR * 0.92, 0.07, 0.09), carbon);
    arm.position.set(x * 0.48, 0.06, z * 0.48);
    arm.rotation.y = -ang;
    group.add(arm);
    box(group, accent, x, 0.1, z, 0.16, 0.06, 0.16);
    addRotor(group, x, 0.2, z, blade, motorMat, rotorMat, rotors);
    const nav = i === 0 ? red : i === 1 ? green : null;
    if (nav) box(group, nav, x * 0.72, 0.02, z * 0.72, 0.08, 0.05, 0.08);
  }

  group.userData.rotors = rotors;
  group.userData.kind = hex ? 'hex' : 'quad';
  group.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return group;
}

function addRotor(parent, x, y, z, span, motorMat, rotorMat, rotors) {
  const hub = new THREE.Group();
  hub.position.set(x, y, z);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 10), motorMat);
  hub.add(can);
  const spin = new THREE.Group();
  spin.position.y = 0.12;
  const geo = new THREE.BoxGeometry(span, 0.02, 0.055);
  const a = new THREE.Mesh(geo, rotorMat);
  const b = new THREE.Mesh(geo, rotorMat);
  b.rotation.y = Math.PI / 2;
  spin.add(a, b);
  hub.add(spin);
  parent.add(hub);
  rotors.push(spin);
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const kind = roughness >= 0.82 ? 'rubber' : metalness >= 0.4 ? 'plate' : 'enamel';
  return applyFinish(material, kind);
}
