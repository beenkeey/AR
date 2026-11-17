import * as THREE from 'three';
import { textured } from './surfaceMaps.js';

/**
 * Large industrial survey / haul-assist drone. Nose toward +X.
 */
export function createMiningDrone() {
  const group = new THREE.Group();
  group.name = 'MiningDrone';
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);

  const body = std(0x2c3238, 0.45, 0.4);
  const accent = std(0xe8b40a, 0.12, 0.48);
  const black = std(0x121416, 0.3, 0.5);
  const glass = std(0x1a3038, 0.55, 0.15);
  const rotorMat = std(0x22262a, 0.35, 0.45);
  const led = std(0x48e0ff, 0.15, 0.25, { emissive: 0x28c8ff, emissiveIntensity: 1.1 });

  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 1.9), body);
  fuselage.position.set(0, 0, 0);
  inner.add(fuselage);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.5), glass);
  nose.position.set(2.2, 0.05, 0);
  inner.add(nose);
  const keel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.2), black);
  keel.position.set(-0.2, -0.55, 0);
  inner.add(keel);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.95), accent);
  stripe.position.set(0, 0.35, 0);
  inner.add(stripe);

  // Sensor dome + lidar
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), glass);
  dome.position.set(0.4, 0.72, 0);
  inner.add(dome);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8), black);
  mast.position.set(-0.8, 0.85, 0);
  inner.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), led);
  beacon.position.set(-0.8, 1.25, 0);
  inner.add(beacon);

  // Cargo / battery pods
  for (const z of [0.85, -0.85]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.4, 4, 10), body);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(-0.1, -0.15, z);
    inner.add(pod);
  }

  // Quad arms + rotors (large)
  const rotors = [];
  const arms = [
    [1.35, 1.55],
    [1.35, -1.55],
    [-1.55, 1.55],
    [-1.55, -1.55],
  ];
  for (const [x, z] of arms) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 1.35), black);
    arm.position.set(x * 0.35, 0.15, z * 0.42);
    arm.lookAt(x, 0.15, z);
    inner.add(arm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10), accent);
    hub.position.set(x, 0.28, z);
    inner.add(hub);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.22), rotorMat);
    blade.position.set(x, 0.42, z);
    inner.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    inner.add(blade2);
    rotors.push(blade, blade2);
  }

  // Landing skids
  for (const z of [0.7, -0.7]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.1), black);
    skid.position.set(0, -0.85, z);
    inner.add(skid);
    for (const x of [-1.0, 1.0]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), black);
      leg.position.set(x, -0.55, z);
      inner.add(leg);
    }
  }

  group.userData.rotors = rotors;
  return group;
}

function std(color, metalness, roughness, extra = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  if (!extra.transparent && !extra.emissive) {
    textured(material, metalness > 0.22 ? 'metal' : 'paint');
  }
  return material;
}
