import * as THREE from 'three';
import { CONFIG } from '../config.js';

const WEAK = CONFIG.performance.weak;
const SEGS = WEAK ? 6 : 10;

function mat(color, metalness = 0.08, roughness = 0.62, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

function capsule(parent, material, r, len, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, SEGS), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  parent.add(m);
  return m;
}

function sphere(parent, material, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, SEGS, SEGS), material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

function createWorker({ suit, helmet, pose = 'idle' }) {
  const g = new THREE.Group();
  g.name = 'Worker';
  const suitMat = mat(suit);
  const dark = mat(0x2a2e32, 0.2, 0.5);
  const skin = mat(0xc4a07a, 0.04, 0.7);
  const helm = mat(helmet, 0.12, 0.45, { emissive: helmet, emissiveIntensity: 0.04 });

  const hip = new THREE.Group();
  hip.position.y = 0.32;
  g.add(hip);

  const legL = new THREE.Group();
  capsule(legL, suitMat, 0.065, 0.18, 0, -0.14, 0);
  sphere(legL, dark, 0.055, 0, -0.28, 0.02, 1.2, 0.45, 1.1);
  legL.position.set(-0.05, 0, 0.02);
  const legR = new THREE.Group();
  capsule(legR, suitMat, 0.065, 0.18, 0, -0.14, 0);
  sphere(legR, dark, 0.055, 0, -0.28, 0.02, 1.2, 0.45, 1.1);
  legR.position.set(0.05, 0, 0.02);
  hip.add(legL, legR);

  const torso = new THREE.Group();
  torso.position.y = 0.42;
  capsule(torso, suitMat, 0.11, 0.2, 0, 0.02, 0, 0.08);
  sphere(torso, dark, 0.09, 0, 0.14, 0, 1.1, 0.45, 1.05);
  const head = sphere(torso, skin, 0.075, 0, 0.22, 0.01);
  sphere(torso, helm, 0.082, 0, 0.26, 0, 1.05, 0.7, 1.1);
  sphere(torso, helm, 0.04, 0, 0.24, 0.07, 1.4, 0.35, 0.6);
  g.add(torso);

  const armL = new THREE.Group();
  capsule(armL, suitMat, 0.042, 0.2, 0, -0.1, 0);
  armL.position.set(-0.14, 0.12, 0);
  const armR = new THREE.Group();
  capsule(armR, suitMat, 0.042, 0.2, 0, -0.1, 0);
  armR.position.set(0.14, 0.12, 0);
  torso.add(armL, armR);

  if (pose === 'weld') {
    const torch = capsule(armR, dark, 0.016, 0.14, 0, -0.24, 0.03, 0.9);
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    spark.name = 'WeldSpark';
    spark.position.set(0, -0.34, 0.05);
    armR.add(spark, torch);
    g.userData.spark = spark;
  } else if (pose === 'carry') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), mat(0x6a4a22, 0.06, 0.8));
    crate.position.set(0, 0.02, 0.14);
    torso.add(crate);
    g.userData.crate = crate;
  } else if (pose === 'inspect') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.14), dark);
    pad.position.set(0, -0.22, 0.04);
    armR.add(pad);
  } else if (pose === 'hammer') {
    const handle = capsule(armR, mat(0x5a3a1c, 0.05, 0.8), 0.015, 0.16, 0, -0.24, 0, 0.2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
    head.position.set(0, -0.34, 0);
    armR.add(head, handle);
  }

  g.userData.armL = armL;
  g.userData.armR = armR;
  g.userData.legL = legL;
  g.userData.legR = legR;
  g.userData.torso = torso;
  g.userData.head = head;
  g.userData.hip = hip;
  g.userData.pose = pose;
  return g;
}

function barrel(x, z) {
  const g = new THREE.Group();
  const paint = mat(0xb85c22, 0.18, 0.48);
  const ring = mat(0x3a3e42, 0.4, 0.4);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 12), paint);
  body.position.y = 0.14;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 12), ring);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.26;
  g.add(body, rim);
  g.position.set(x, 0, z);
  return g;
}

export function createRoofCrew() {
  const root = new THREE.Group();
  root.name = 'RoofCrew';
  const weld = createWorker({ suit: 0xe28a1a, helmet: 0xf3c43a, pose: 'weld' });
  weld.position.set(-0.85, 0, 0.55);
  weld.rotation.y = 0.6;
  const carry = createWorker({ suit: 0xd4ae2e, helmet: 0xf0c31a, pose: 'carry' });
  carry.position.set(0.7, 0, -0.35);
  carry.rotation.y = -0.4;
  const inspect = createWorker({ suit: 0xc9a227, helmet: 0xefefef, pose: 'inspect' });
  inspect.position.set(-0.15, 0, 0.95);
  inspect.rotation.y = Math.PI * 0.15;
  const hammer = createWorker({ suit: 0x3d6a8a, helmet: 0xf3c43a, pose: 'hammer' });
  hammer.position.set(1.15, 0, 0.7);
  hammer.rotation.y = -1.1;
  root.add(weld, carry, inspect, hammer);

  root.add(barrel(-1.35, -0.55));
  root.add(barrel(-1.12, -0.72));
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.28), mat(0x5a3e1c, 0.06, 0.82));
  crate.position.set(1.35, 0.11, -0.85);
  crate.rotation.y = 0.2;
  root.add(crate);
  const crate2 = crate.clone();
  crate2.position.set(1.55, 0.11, -0.55);
  crate2.rotation.y = -0.15;
  root.add(crate2);
  const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.2), mat(0x3a3e42, 0.4, 0.4));
  anvil.position.set(1.05, 0.05, 0.95);
  root.add(anvil);

  const gen = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.28, 3, 10),
    mat(0x3a6a3a, 0.22, 0.5),
  );
  gen.rotation.z = Math.PI / 2;
  gen.position.set(-1.55, 0.14, 0.35);
  root.add(gen);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 10), mat(0x3a6aa0, 0.3, 0.4));
  bottle.position.set(-0.55, 0.16, 0.35);
  root.add(bottle);
  const bottle2 = bottle.clone();
  bottle2.material = mat(0xb03a32, 0.3, 0.4);
  bottle2.position.set(-0.42, 0.16, 0.22);
  root.add(bottle2);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.85, 6), mat(0x4a5056, 0.45, 0.4));
  antenna.position.set(1.7, 0.42, 1.05);
  root.add(antenna);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0xc8d0d6, 0.35, 0.35));
  dish.position.set(1.7, 0.78, 1.05);
  dish.rotation.x = 0.5;
  root.add(dish);

  weld.userData.home = weld.position.clone();
  carry.userData.home = carry.position.clone();
  inspect.userData.home = inspect.position.clone();
  hammer.userData.home = hammer.position.clone();
  root.userData.workers = [weld, carry, inspect, hammer];
  return root;
}

export function tickRoofCrew(root, time) {
  const crew = root?.getObjectByName?.('RoofCrew') || root;
  if (!crew?.userData?.workers) return;
  for (const w of crew.userData.workers) {
    const pose = w.userData.pose;
    const t = time;
    if (pose === 'weld') {
      w.userData.torso.rotation.x = 0.35 + Math.sin(t * 16) * 0.06;
      w.userData.armR.rotation.set(-0.55 + Math.sin(t * 18) * 0.35, 0.1, -0.85);
      w.userData.armL.rotation.set(0.4, 0, 0.55);
      if (w.userData.spark) {
        const on = (Math.sin(t * 41) * 0.5 + 0.5) > 0.28;
        w.userData.spark.visible = on;
        w.userData.spark.scale.setScalar(0.6 + Math.random() * 1.1);
      }
    } else if (pose === 'carry') {
      const walk = t * 1.15;
      const x = Math.sin(walk) * 0.95;
      w.position.x = (w.userData.home?.x ?? 0.7) + x;
      w.position.z = (w.userData.home?.z ?? -0.35) + Math.sin(walk * 0.5) * 0.12;
      w.rotation.y = Math.cos(walk) >= 0 ? 1.2 : -1.9;
      w.userData.legL.rotation.x = Math.sin(walk * 6) * 0.55;
      w.userData.legR.rotation.x = -Math.sin(walk * 6) * 0.55;
      w.userData.armL.rotation.set(0.15, 0, 0.95);
      w.userData.armR.rotation.set(0.15, 0, -0.95);
      w.userData.hip.position.y = 0.32 + Math.abs(Math.sin(walk * 6)) * 0.03;
    } else if (pose === 'inspect') {
      const squat = 0.5 + Math.sin(t * 1.6) * 0.5;
      w.userData.hip.position.y = 0.32 - squat * 0.08;
      w.userData.torso.rotation.x = 0.25 + squat * 0.25;
      w.userData.armR.rotation.set(-0.9 - squat * 0.35, 0.2, -0.35);
      w.userData.armL.rotation.set(0.2, 0, 0.25);
      w.userData.head.rotation.y = Math.sin(t * 1.1) * 0.45;
      w.userData.head.rotation.x = -0.2 + Math.sin(t * 0.8) * 0.15;
    } else if (pose === 'hammer') {
      const swing = Math.max(0, Math.sin(t * 7.2));
      w.userData.torso.rotation.x = 0.2 + swing * 0.25;
      w.userData.armR.rotation.set(-0.15 - swing * 1.35, 0.1, -0.2);
      w.userData.armL.rotation.set(0.4, 0, 0.35);
      w.userData.legL.rotation.x = 0.15;
      w.userData.legR.rotation.x = -0.05;
    }
  }
}
