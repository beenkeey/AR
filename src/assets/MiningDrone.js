import * as THREE from 'three';

/**
 * Compact angular survey drone. Much smaller than a helicopter.
 */
export function createMiningDrone() {
  const group = new THREE.Group();
  group.name = 'MiningDrone';
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2;
  group.add(inner);

  const body = mat(0xe8ecef, 0.25, 0.4);
  const accent = mat(0xf5c400, 0.15, 0.45);
  const teal = mat(0x1a8a9e, 0.25, 0.4);
  const black = mat(0x1e2226, 0.35, 0.45);
  const glass = mat(0x1a2832, 0.2, 0.15, { transparent: true, opacity: 0.5 });
  const rotorMat = mat(0x2a2e32, 0.4, 0.4);
  const led = mat(0xff3b2e, 0.1, 0.3, { emissive: 0xff2a18, emissiveIntensity: 1.1 });

  box(inner, body, 0, 0, 0, 1.15, 0.28, 0.55);
  box(inner, teal, 0, -0.16, 0, 0.9, 0.12, 0.4);
  box(inner, glass, 0.55, 0.02, 0, 0.28, 0.2, 0.42);
  box(inner, accent, 0, 0.16, 0, 1.0, 0.06, 0.5);
  box(inner, led, -0.4, 0.2, 0, 0.12, 0.08, 0.12);

  const rotors = [];
  const arms = [
    [0.48, 0.48],
    [0.48, -0.48],
    [-0.48, 0.48],
    [-0.48, -0.48],
  ];
  for (const [x, z] of arms) {
    box(inner, black, x * 0.4, 0.05, z * 0.4, 0.55, 0.06, 0.08);
    box(inner, accent, x, 0.1, z, 0.12, 0.08, 0.12);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.06), rotorMat);
    blade.position.set(x, 0.16, z);
    inner.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    inner.add(blade2);
    rotors.push(blade, blade2);
  }

  box(inner, black, 0, -0.28, 0.2, 0.7, 0.04, 0.05);
  box(inner, black, 0, -0.28, -0.2, 0.7, 0.04, 0.05);

  group.userData.rotors = rotors;
  group.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  return group;
}

function box(parent, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function mat(color, metalness, roughness, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}
