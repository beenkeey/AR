import * as THREE from 'three';

/**
 * Relative device orientation for Exhibition look.
 * Does not move ExhibitionRoot. Does not use MindAR.
 */
export class DeviceRotation {
  constructor() {
    this.enabled = false;
    this.hasSample = false;
    this._q = new THREE.Quaternion();
    this._qRef = new THREE.Quaternion();
    this._rel = new THREE.Quaternion();
    this._euler = new THREE.Euler();
    this._zee = new THREE.Vector3(0, 0, 1);
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._axisQ = new THREE.Quaternion();
    this._onOrient = (event) => this._handle(event);
  }

  async prepare() {
    try {
      const request = DeviceOrientationEvent?.requestPermission;
      if (typeof request === 'function') {
        const result = await request.call(DeviceOrientationEvent);
        if (result !== 'granted') return false;
      }
    } catch {
      return false;
    }
    if (!this.enabled) {
      window.addEventListener('deviceorientation', this._onOrient, true);
      this.enabled = true;
    }
    return true;
  }

  stop() {
    if (!this.enabled) return;
    window.removeEventListener('deviceorientation', this._onOrient, true);
    this.enabled = false;
    this.hasSample = false;
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

  _handle(event) {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    const screenAngle = Number(screen?.orientation?.angle ?? window.orientation ?? 0);
    const alpha = THREE.MathUtils.degToRad(event.alpha);
    const beta = THREE.MathUtils.degToRad(event.beta);
    const gamma = THREE.MathUtils.degToRad(event.gamma);
    this._euler.set(beta, alpha, -gamma, 'YXZ');
    this._q.setFromEuler(this._euler);
    this._q.multiply(this._q1);
    this._q.multiply(this._axisQ.setFromAxisAngle(this._zee, -THREE.MathUtils.degToRad(screenAngle)));
    if (!this.hasSample) {
      this._qRef.copy(this._q);
      this.hasSample = true;
    }
  }
}
