import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { alvaPoseToThreeCamera } from './AlvaARTracker.js';
import { DeviceRotation } from './DeviceRotation.js';

/**
 * Camera-only motion for the exhibition.
 *
 * Graph:
 *   exhibitionScene
 *     CameraRig     ← frozen exhibition start pose
 *       camera      ← gyro look (360°) + clamped Alva XZ
 *     ExhibitionRoot ← never written from here
 *
 * relative = inverse(P0) * P
 * Gyro owns orientation after enable. Alva owns only small XZ deltas.
 * Lost AlvaAR keeps the last accepted position. MindAR is not used.
 */
export class WorldTracking {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.rig = new THREE.Group();
    this.rig.name = 'CameraRig';
    this.device = new DeviceRotation();
    this.collide = null;

    this.enabled = false;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.lastDelta = new THREE.Vector3();
    this.trackingActive = false;

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
    this._identQuat = new THREE.Quaternion();
    this._cameraAtLock = new THREE.Matrix4();
    this._relPos = new THREE.Vector3();
    this._relQuat = new THREE.Quaternion();
    this._prevRelPos = new THREE.Vector3();
    this._prevRelQuat = new THREE.Quaternion();
    this._pendingRelPos = new THREE.Vector3();
    this._pendingRelQuat = new THREE.Quaternion();
    this._hadRelative = false;
    this._hasPending = false;
    this._lockLocal = new THREE.Matrix4();
    this._targetPos = new THREE.Vector3();
    this._holdPos = new THREE.Vector3();
    this._holdRelPos = new THREE.Vector3();
    this._holdRelQuat = new THREE.Quaternion();
    this._targetQuat = new THREE.Quaternion();
    this._smoothPos = new THREE.Vector3();
    this._smoothQuat = new THREE.Quaternion();
    this._lostQuat = new THREE.Quaternion();
    this._baseQuat = new THREE.Quaternion();
    this._rigInvQuat = new THREE.Quaternion();
    this._appliedPos = new THREE.Vector3();
    this._lastConsumedRelPos = new THREE.Vector3();
    this._moveDelta = new THREE.Vector3();
    this._lastNow = 0;
    this._smoothed = false;
    this._holdingLost = false;
  }

  get status() {
    if (!this.enabled) return 'INACTIVE';
    if (!this.referenceSet) return 'WAITING_POSE';
    if (this.usingLastPose) return 'LAST POSE';
    return 'TRACKING';
  }

  requestPermissionFromGesture() {
    return this.device.requestPermissionFromGesture();
  }

  prepareSensors(existingPermission) {
    return this.device.prepare(existingPermission);
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.trackingActive = true;
    this._hadRelative = false;
    this._hasPending = false;
    this._smoothed = false;
    this._holdingLost = false;
    this._lockLocal.identity();
    this.lastDelta.set(0, 0, 0);
    this._appliedPos.set(0, 0, 0);
    this._lastConsumedRelPos.set(0, 0, 0);
    this._mountCamera();
    this._baseQuat.copy(this.camera.quaternion);
    this._lostQuat.copy(this.camera.quaternion);
    this._targetQuat.copy(this.camera.quaternion);
    this.device.captureReference();
  }

  disable() {
    this._unmountCamera();
    this.enabled = false;
    this.referenceSet = false;
    this.moved = false;
    this.usingLastPose = false;
    this.trackingActive = false;
    this._hadRelative = false;
    this._hasPending = false;
    this._smoothed = false;
    this._holdingLost = false;
    this._lockLocal.identity();
    this.lastDelta.set(0, 0, 0);
    this._appliedPos.set(0, 0, 0);
    this._lastConsumedRelPos.set(0, 0, 0);
  }

  _mountCamera() {
    const camera = this.camera;
    camera.matrixAutoUpdate = true;
    if (camera.parent) camera.parent.remove(camera);
    camera.updateMatrixWorld(true);
    this._cameraAtLock.copy(camera.matrixWorld);

    if (this.rig.parent !== this.scene) this.scene.add(this.rig);
    this.rig.matrix.copy(this._cameraAtLock);
    this.rig.matrix.decompose(this.rig.position, this.rig.quaternion, this.rig.scale);
    this.rig.matrixAutoUpdate = false;
    this.rig.updateMatrixWorld(true);

    this.rig.add(camera);
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.scale.set(1, 1, 1);
    camera.matrix.identity();
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.matrixAutoUpdate = false;
    camera.updateMatrixWorld(true);
    this._prevPos.setFromMatrixPosition(camera.matrixWorld);
    this._smoothPos.copy(camera.position);
    this._smoothQuat.copy(camera.quaternion);
    this._targetPos.copy(camera.position);
    this._holdPos.copy(camera.position);
    this._targetQuat.copy(camera.quaternion);
  }

  _unmountCamera() {
    const camera = this.camera;
    camera.matrixAutoUpdate = true;
    if (camera.parent === this.rig) this.rig.remove(camera);
    else if (camera.parent) camera.parent.remove(camera);
    if (this.rig.parent) this.rig.parent.remove(this.rig);
    this.rig.matrixAutoUpdate = true;
    this.rig.position.set(0, 0, 0);
    this.rig.quaternion.identity();
    this.rig.scale.set(1, 1, 1);
    this.rig.matrix.identity();
  }

  /**
   * Gyro owns look after enable. Alva only contributes clamped XZ deltas.
   * relative = inverse(P0) * P. P0 is never reseated.
   * Lost AlvaAR holds last accepted position; gyro keeps 360° look.
   */
  update(pose, live, now = performance.now()) {
    if (!this.enabled) {
      this.usingLastPose = false;
      this.trackingActive = false;
      return false;
    }
    this.trackingActive = true;

    if (!live || !pose) {
      this._applyLostHold(now);
      return false;
    }

    const dt = this._dt(now);

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
      this._holdingLost = false;
      this._refInv.copy(this._current).invert();
      this.referenceSet = true;
      this._hadRelative = false;
      this._hasPending = false;
      this.usingLastPose = false;
      this.lastDelta.set(0, 0, 0);
      this._appliedPos.set(0, 0, 0);
      this._lastConsumedRelPos.set(0, 0, 0);
      this._targetPos.copy(this._appliedPos);
      this._applyGyroLook();
      this._commitCamera(dt);
      return true;
    }

    this._relative.multiplyMatrices(this._refInv, this._current);
    this._relative.decompose(this._relPos, this._relQuat, this._scale);

    if (this._holdingLost) {
      const posJump = this._relPos.distanceTo(this._holdPos);
      if (posJump > CONFIG.worldTracking.jumpPos) {
        this._applyLostHold(now);
        return false;
      }
      this._holdingLost = false;
      // Resume from the new Alva origin without teleporting to it.
      this._lastConsumedRelPos.copy(this._relPos);
    }

    if (this._hadRelative) {
      const jumpPos = this._relPos.distanceTo(this._prevRelPos);
      const jumpRot = this._relQuat.angleTo(this._prevRelQuat);
      const jumped =
        jumpPos > CONFIG.worldTracking.jumpPos || jumpRot > CONFIG.worldTracking.jumpRot;
      if (jumped) {
        const pendingStable =
          this._hasPending &&
          this._relPos.distanceTo(this._pendingRelPos) <= CONFIG.worldTracking.jumpPos &&
          this._relQuat.angleTo(this._pendingRelQuat) <= CONFIG.worldTracking.jumpRot;
        if (!pendingStable) {
          this._pendingRelPos.copy(this._relPos);
          this._pendingRelQuat.copy(this._relQuat);
          this._hasPending = true;
          this.usingLastPose = true;
          this._lastConsumedRelPos.copy(this._relPos);
          this._targetPos.copy(this._appliedPos);
          this._applyGyroLook();
          this._commitCamera(dt);
          return false;
        }
        this._lastConsumedRelPos.copy(this._relPos);
      }
      this._hasPending = false;
      if (!jumped && jumpPos < CONFIG.worldTracking.translationDeadzone) {
        this._relPos.copy(this._prevRelPos);
      }
    }
    this._hadRelative = true;
    this._prevRelPos.copy(this._relPos);
    this._prevRelQuat.copy(this._relQuat);

    this._consumeHorizontalDelta();
    this._targetPos.copy(this._appliedPos);
    this._applyGyroLook();
    this.usingLastPose = false;
    this._commitCamera(dt);
    return true;
  }

  _applyGyroLook() {
    if (this.device.hasSample) {
      this.device.relative(this._scratchQuat);
      this._targetQuat.copy(this._baseQuat).multiply(this._scratchQuat);
      return;
    }
    this._targetQuat.copy(this._baseQuat);
  }

  _consumeHorizontalDelta() {
    this._moveDelta.copy(this._relPos).sub(this._lastConsumedRelPos);
    this._lastConsumedRelPos.copy(this._relPos);
    this._moveDelta.y = 0;

    const len = Math.hypot(this._moveDelta.x, this._moveDelta.z);
    const dead = CONFIG.worldTracking.moveDeadzone ?? CONFIG.worldTracking.translationDeadzone;
    if (len < dead) return;

    const maxDelta = CONFIG.worldTracking.maxDeltaPerFrame;
    if (len > maxDelta && len > 1e-8) {
      this._moveDelta.multiplyScalar(maxDelta / len);
    }

    this._appliedPos.x += this._moveDelta.x;
    this._appliedPos.z += this._moveDelta.z;
    this._appliedPos.y = 0;

    const radius = Math.hypot(this._appliedPos.x, this._appliedPos.z);
    const maxRadius = CONFIG.worldTracking.maxRadius;
    if (radius > maxRadius && radius > 1e-8) {
      const k = maxRadius / radius;
      this._appliedPos.x *= k;
      this._appliedPos.z *= k;
    }
  }

  _applyLostHold(now) {
    this.usingLastPose = true;
    this._hasPending = false;
    if (!this._holdingLost) {
      this._holdPos.copy(this._smoothPos);
      this._holdPos.y = 0;
      this._appliedPos.copy(this._holdPos);
      this._lostQuat.copy(this.camera.quaternion);
      this._holdRelPos.copy(this._hadRelative ? this._prevRelPos : this._smoothPos);
      this._holdRelQuat.copy(this._hadRelative ? this._prevRelQuat : this.camera.quaternion);
      this._holdingLost = true;
    }
    this._targetPos.copy(this._holdPos);
    this._applyGyroLook();
    this._commitCamera(this._dt(now));
  }

  _dt(now) {
    const prev = this._lastNow;
    this._lastNow = now;
    if (!prev) return 1 / 60;
    return Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
  }

  _commitCamera(dt) {
    const camera = this.camera;
    if (!this._smoothed) {
      this._smoothPos.copy(this._targetPos);
      this._smoothQuat.copy(this._targetQuat);
      this._smoothed = true;
    } else {
      const posK = 1 - Math.exp(-CONFIG.cameraSmoothing.position * 12 * dt);
      const rotK = 1 - Math.exp(-CONFIG.cameraSmoothing.rotation * 12 * dt);
      this._smoothPos.lerp(this._targetPos, THREE.MathUtils.clamp(posK, 0, 1));
      this._smoothQuat.slerp(this._targetQuat, THREE.MathUtils.clamp(rotK, 0, 1));
    }
    this._smoothPos.y = 0;

    // _smoothPos is exhibition-space XZ. CameraRig keeps lookAt pitch;
    // undo that rotation on translation so worldPos = T_rig + _smoothPos.
    this._rigInvQuat.copy(this.rig.quaternion).invert();
    camera.position.copy(this._smoothPos).applyQuaternion(this._rigInvQuat);
    camera.quaternion.copy(this._smoothQuat);
    camera.scale.set(1, 1, 1);
    camera.matrixAutoUpdate = false;
    camera.updateMatrix();
    camera.updateMatrixWorld(true);

    if (this.collide) {
      camera.getWorldPosition(this._scratchVec);
      this.collide(this._scratchVec);
      this._scratchMat.copy(this.rig.matrixWorld).invert();
      this._scratchVec.applyMatrix4(this._scratchMat);
      camera.position.copy(this._scratchVec);
      this._smoothPos.copy(camera.position).applyQuaternion(this.rig.quaternion);
      this._smoothPos.y = 0;
      this._appliedPos.x = this._smoothPos.x;
      this._appliedPos.z = this._smoothPos.z;
      this._appliedPos.y = 0;
      camera.position.copy(this._smoothPos).applyQuaternion(this._rigInvQuat);
      camera.updateMatrix();
      camera.updateMatrixWorld(true);
    }

    this._scratchVec.setFromMatrixPosition(camera.matrixWorld);
    this.lastDelta.subVectors(this._scratchVec, this._prevPos);
    if (this.lastDelta.lengthSq() > 1e-8) this.moved = true;
    this._prevPos.copy(this._scratchVec);
  }
}
