import * as THREE from 'three';

/**
 * Invisible placement anchor only.
 * Visible quarry / rim base live in CoalMineWorld — avoids a scaled
 * centerpiece + ContactShadow disc floating in the middle of the pit.
 */
export function createCoalMineComplex() {
  const root = new THREE.Group();
  root.name = 'CoalMineComplex';

  // Tiny invisible box so placeStatic still has a bbox to scale/position.
  const anchor = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.2, 2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  anchor.position.y = 0.6;
  anchor.name = 'PlacementAnchor';
  root.add(anchor);

  root.userData.triangles = 12;
  root.userData.height = 1.2;
  root.userData.tick = () => {};
  return root;
}

export function measureRig(root) {
  let triangles = 0;
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const idx = n.geometry.index;
    const pos = n.geometry.attributes.position;
    triangles += idx ? idx.count / 3 : pos.count / 3;
  });
  const box3 = new THREE.Box3().setFromObject(root);
  const size = box3.getSize(new THREE.Vector3());
  return { triangles: Math.round(triangles), height: Math.max(size.y, 0.01) };
}
