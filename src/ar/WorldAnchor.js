import * as THREE from 'three';

export class WorldAnchor {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'WorldAnchor';
    this.group.visible = false;
    this.scene.add(this.group);
    this.created = false;
    this.locked = false;
  }

  setMatrix(matrix) {
    if (this.locked) return;
    this.group.matrix.copy(matrix);
    this.group.matrix.decompose(this.group.position, this.group.quaternion, this.group.scale);
    this.group.matrixAutoUpdate = false;
    this.group.updateMatrixWorld(true);
    this.group.visible = true;
    this.created = true;
  }

  lock() {
    if (this.locked) return;
    if (this.group.matrixAutoUpdate) {
      this.group.matrix.compose(this.group.position, this.group.quaternion, this.group.scale);
    }
    this.group.matrix.decompose(this.group.position, this.group.quaternion, this.group.scale);
    this.group.matrixAutoUpdate = false;
    this.group.updateMatrixWorld(true);
    this.locked = true;
  }

  createFromMatrix(matrix) {
    this.setMatrix(matrix);
  }

  createFromPose(position, quaternion) {
    if (this.locked) return;
    this.group.matrixAutoUpdate = true;
    this.group.position.copy(position);
    this.group.quaternion.copy(quaternion);
    this.group.scale.set(1, 1, 1);
    this.group.visible = true;
    this.created = true;
  }

  attach(object) {
    this.group.add(object);
  }

  clear() {
    const children = [...this.group.children];
    for (const child of children) this.group.remove(child);
    this.group.matrixAutoUpdate = true;
    this.group.position.set(0, 0, 0);
    this.group.quaternion.identity();
    this.group.scale.set(1, 1, 1);
    this.group.matrix.identity();
    this.group.visible = false;
    this.created = false;
    this.locked = false;
  }

  get position() {
    return this.group.position;
  }

  get quaternion() {
    return this.group.quaternion;
  }
}
