import * as THREE from 'three';
import { alvaPoseToThreeCamera } from './AlvaARTracker.js';

/**
 * Camera-only motion for the exhibition.
 * First pose P0 is the reference. Later: camera = cameraAtLock * inverse(P0) * P.
 * The exhibition model is never written from here.
 * Lost tracking keeps the last camera transform.
 */
export class WorldTracking {
  constructor(camera) {
    this.camera = camera;
    this.enabled = false;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.lastDelta = new THREE.Vector3();

    this._refInv = new THREE.Matrix4();
    this._current = new THREE.Matrix4();
    this._relative = new THREE.Matrix4();
    this._pos = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scale = new THREE.Vector3(1, 1, 1);
    this._scratchMat = new THREE.Matrix4();
    this._scratchQuat = new THREE.Quaternion();
    this._scratchVec = new THREE.Vector3();
    this._prevPos = new THREE.Vector3();
    this._one = new THREE.Vector3(1, 1, 1);
    this._cameraAtLock = new THREE.Matrix4();
    this._result = new THREE.Matrix4();
  }

  get status() {
    if (!this.enabled) return 'INACTIVE';
    if (!this.referenceSet) return 'WAITING_POSE';
    if (this.usingLastPose) return 'LAST POSE';
    return 'TRACKING';
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.lastDelta.set(0, 0, 0);
    this.camera.matrixAutoUpdate = true;
    this.camera.updateMatrixWorld(true);
    this._cameraAtLock.copy(this.camera.matrixWorld);
  }

  disable() {
    this.enabled = false;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.lastDelta.set(0, 0, 0);
  }

  update(pose, live) {
    if (!this.enabled) {
      this.moved = false;
      this.usingLastPose = false;
      return false;
    }
    if (!pose) {
      this.moved = false;
      this.usingLastPose = this.referenceSet;
      return false;
    }

    this.usingLastPose = !live;
    alvaPoseToThreeCamera(
      pose,
      this._pos,
      this._quat,
      this._scratchMat,
      this._scratchQuat,
      this._scratchVec,
    );
    this._current.compose(this._pos, this._quat, this._one);

    if (!this.referenceSet) {
      this._refInv.copy(this._current).invert();
      this.referenceSet = true;
      this.camera.updateMatrixWorld(true);
      this._cameraAtLock.copy(this.camera.matrixWorld);
      this._prevPos.copy(this.camera.position);
      this.lastDelta.set(0, 0, 0);
      this.moved = false;
      return true;
    }

    this._relative.multiplyMatrices(this._refInv, this._current);
    this._result.multiplyMatrices(this._cameraAtLock, this._relative);
    this._result.decompose(this._pos, this._quat, this._scale);

    this.camera.matrixAutoUpdate = true;
    this.camera.position.copy(this._pos);
    this.camera.quaternion.copy(this._quat);
    this.camera.updateMatrixWorld(true);

    this.lastDelta.subVectors(this.camera.position, this._prevPos);
    this.moved = this.lastDelta.lengthSq() > 1e-8;
    this._prevPos.copy(this.camera.position);
    return true;
  }
}
