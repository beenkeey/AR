import * as THREE from 'three';
import { DEBUG } from '../config.js';
import { debugState } from '../debugState.js';

/**
 * Relative device orientation for Exhibition look.
 * Does not move ExhibitionRoot. Does not use MindAR.
 */
export class DeviceRotation {
  constructor() {
    this.enabled = false;
    this.hasSample = false;
    this.lastSampleAt = null;
    this.permission = 'NOT ASKED';
    this._permissionPromise = null;
    this._preferAbsolute = false;
    this._q = new THREE.Quaternion();
    this._qRef = new THREE.Quaternion();
    this._rel = new THREE.Quaternion();
    this._euler = new THREE.Euler();
    this._zee = new THREE.Vector3(0, 0, 1);
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._axisQ = new THREE.Quaternion();
    this._onOrient = (event) => this._handle(event, 'relative');
    this._onAbsolute = (event) => this._handle(event, 'absolute');
  }

  _alreadyAsked(status = this.permission) {
    return status === 'granted'
      || status === 'denied'
      || status === 'NOT REQUIRED'
      || status === 'UNAVAILABLE'
      || status === 'ERROR'
      || (typeof status === 'string' && status.startsWith('ERROR'));
  }

  /**
   * Call only from the Start tap, before any await.
   * Invokes requestPermission() synchronously in that user gesture.
   */
  requestPermissionFromGesture() {
    if (this._permissionPromise) return this._permissionPromise;
    if (this._alreadyAsked()) {
      this._permissionPromise = Promise.resolve(this.permission);
      this._syncDebug();
      return this._permissionPromise;
    }

    if (typeof DeviceOrientationEvent?.requestPermission !== 'function') {
      this.permission = typeof DeviceOrientationEvent !== 'undefined' ? 'NOT REQUIRED' : 'UNAVAILABLE';
      this._permissionPromise = Promise.resolve(this.permission);
      this._syncDebug();
      return this._permissionPromise;
    }

    try {
      this._permissionPromise = Promise.resolve(
        DeviceOrientationEvent.requestPermission.call(DeviceOrientationEvent),
      ).then((status) => {
        this.permission = status || 'ERROR';
        this._syncDebug();
        return this.permission;
      }).catch(() => {
        this.permission = 'ERROR';
        this._syncDebug();
        return this.permission;
      });
    } catch {
      this.permission = 'ERROR';
      this._permissionPromise = Promise.resolve(this.permission);
      this._syncDebug();
    }
    return this._permissionPromise;
  }

  /**
   * Bind listeners only. Never calls requestPermission() — that must happen
   * in requestPermissionFromGesture() during the Start tap.
   */
  prepare(existingPermission) {
    const status = existingPermission || this.permission || 'NOT ASKED';
    if (this._alreadyAsked(status)) {
      this.permission = typeof status === 'string' && status.startsWith('ERROR')
        ? 'ERROR'
        : status;
    } else if (typeof DeviceOrientationEvent?.requestPermission !== 'function') {
      this.permission = typeof DeviceOrientationEvent !== 'undefined' ? 'NOT REQUIRED' : 'UNAVAILABLE';
    }
    this._arm();
    this._syncDebug();
    return this.permission === 'granted' || this.permission === 'NOT REQUIRED';
  }

  _arm() {
    if (this.enabled) return;
    window.addEventListener('deviceorientation', this._onOrient, true);
    window.addEventListener('deviceorientationabsolute', this._onAbsolute, true);
    this.enabled = true;
    this._syncDebug();
  }

  stop() {
    if (!this.enabled) return;
    window.removeEventListener('deviceorientation', this._onOrient, true);
    window.removeEventListener('deviceorientationabsolute', this._onAbsolute, true);
    this.enabled = false;
    this.hasSample = false;
    this.lastSampleAt = null;
    this._preferAbsolute = false;
    this._syncDebug();
  }

  captureReference() {
    if (this.hasSample) this._qRef.copy(this._q);
  }

  relative(out) {
    const target = out || this._rel;
    if (!this.hasSample) {
      target.identity();
      return target;
    }
    target.copy(this._qRef).invert().multiply(this._q);
    return target;
  }

  _handle(event, kind) {
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;
    if (typeof alpha !== 'number' || typeof beta !== 'number' || typeof gamma !== 'number') return;
    if (!Number.isFinite(alpha) || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;

    if (kind === 'absolute') this._preferAbsolute = true;
    else if (this._preferAbsolute) return;

    const screenAngle = Number(screen?.orientation?.angle ?? window.orientation ?? 0);
    this._euler.set(
      THREE.MathUtils.degToRad(beta),
      THREE.MathUtils.degToRad(alpha),
      -THREE.MathUtils.degToRad(gamma),
      'YXZ',
    );
    this._q.setFromEuler(this._euler);
    this._q.multiply(this._q1);
    this._q.multiply(this._axisQ.setFromAxisAngle(this._zee, -THREE.MathUtils.degToRad(screenAngle)));
    this.lastSampleAt = performance.now();
    if (!this.hasSample) {
      this._qRef.copy(this._q);
      this.hasSample = true;
    }
    this._syncDebug(kind);
  }

  _syncDebug(kind) {
    if (!DEBUG) return;
    debugState.gyroPermission = this.permission;
    debugState.gyroListener = this.enabled ? 'YES' : 'NO';
    debugState.gyroEvent = this._preferAbsolute ? 'absolute' : (kind || debugState.gyroEvent || 'none');
  }
}
