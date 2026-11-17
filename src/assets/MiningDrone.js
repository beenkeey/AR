import * as THREE from 'three';

/**
 * Compact survey drone (much smaller than a helicopter). Nose +X via inner yaw.
 */
export function createMiningDrone() {
  const group = new THREE.Group();
  group.name = 'MiningDrone';
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);

  const body = mat(0xffffff, 0.25, 0.4);
  const accent = mat(0xffc400, 0.12, 0.45);
  const teal = mat(0x1ec8b0, 0.2, 0.4);
  const black = mat(0x22262a, 0.35, 0.45);
  const glass = mat(0x6ec8ff, 0.15, 0.15, { transparent: true, opacity: 0.5 });
  const rotorMat = mat(0x33383e, 0.4, 0.4);
  const led = mat(0xff4a3a, 0.1, 0.3, { emissive: 0xff2a18, emissiveIntensity: 1.2 });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 4, 10), body);
  fuselage.rotation.z = Math.PI / 2;
  inner.add(fuselage);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), teal);
  belly.position.set(0, -0.18, 0);
  belly.scale.set(1.4, 0.55, 1);
  inner.add(belly);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glass);
  nose.position.set(0.72, 0.02, 0);
  nose.scale.set(1.1, 0.85, 0.9);
  inner.add(nose);
  const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 3, 8), accent);
  stripe.rotation.z = Math.PI / 2;
  stripe.position.set(0, 0.22, 0);
  inner.add(stripe);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), led);
  beacon.position.set(-0.35, 0.32, 0);
  inner.add(beacon);

  const rotors = [];
  const arms = [
    [0.55, 0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [-0.55, -0.55],
  ];
  for (const [x, z] of arms) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.55, 3, 6), black);
    arm.position.set(x * 0.35, 0.08, z * 0.35);
    arm.lookAt(x, 0.08, z);
    inner.add(arm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), accent);
    hub.position.set(x, 0.14, z);
    inner.add(hub);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.02, 0.07), rotorMat);
    blade.position.set(x, 0.2, z);
    inner.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    inner.add(blade2);
    rotors.push(blade, blade2);
  }

  for (const z of [0.22, -0.22]) {
    const skid = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.7, 3, 6), black);
    skid.rotation.z = Math.PI / 2;
    skid.position.set(0, -0.32, z);
    inner.add(skid);
  }

  group.userData.rotors = rotors;
  group.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return group;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
