import * as THREE from 'three';

export function createDebugPlacementMarker() {
  const group = new THREE.Group();
  group.name = 'DebugPlacementMarker';

  const axes = new THREE.AxesHelper(0.28);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffee00 }),
  );
  const grid = new THREE.GridHelper(0.5, 8, 0x66ffcc, 0x2a6655);

  group.add(grid);
  group.add(axes);
  group.add(sphere);
  return group;
}
