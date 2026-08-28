import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { textured } from './surfaceMaps.js';

const WEAK = CONFIG.performance.weak;
const SEGS = WEAK ? 6 : 10;

function fur(color, roughness = 0.92) {
  return textured(
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 }),
    'snow',
    { normalScale: 0.22 },
  );
}

/** Distant polar bear. Rounded body only — readable at 60–120 m. */
export function createPolarBear() {
  const group = new THREE.Group();
  group.name = 'PolarBear';
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);
  const white = fur(0xf4f7fa);
  const cream = fur(0xe8eef2, 0.88);
  const nose = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.55, metalness: 0.08 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.4, metalness: 0.05 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 4, SEGS), white);
  body.rotation.z = Math.PI / 2;
  body.position.set(0.05, 0.72, 0);
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.46, SEGS, SEGS), cream);
  rump.position.set(-0.42, 0.7, 0);
  rump.scale.set(1, 0.92, 1.05);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.4, SEGS, SEGS), white);
  chest.position.set(0.48, 0.74, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, SEGS, SEGS), white);
  head.position.set(0.92, 0.92, 0);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 3, 8), cream);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.14, 0.84, 0);
  const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), nose);
  noseMesh.position.set(1.28, 0.86, 0);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), cream);
  earL.position.set(0.86, 1.14, 0.16);
  const earR = earL.clone();
  earR.position.z = -0.16;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eye);
  eyeL.position.set(1.08, 0.98, 0.12);
  const eyeR = eyeL.clone();
  eyeR.position.z = -0.12;

  const legs = [];
  const spots = [
    [0.42, 0.22],
    [0.42, -0.22],
    [-0.38, 0.24],
    [-0.38, -0.24],
  ];
  for (const [x, z] of spots) {
    const leg = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 3, 8), white);
    thigh.position.y = 0.38;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cream);
    paw.position.y = 0.1;
    paw.scale.set(1.15, 0.55, 1.2);
    leg.add(thigh, paw);
    leg.position.set(x, 0, z);
    inner.add(leg);
    legs.push(leg);
  }

  inner.add(body, rump, chest, head, snout, noseMesh, earL, earR, eyeL, eyeR);
  group.userData.legs = legs;
  group.userData.head = head;
  return group;
}
