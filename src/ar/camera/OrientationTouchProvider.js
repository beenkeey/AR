import * as THREE from 'three';
import { CONFIG, DEBUG } from '../../config.js';

/**
 * Honest non-6DoF exhibition camera for iPhone Safari.
 *
 * Look: DeviceOrientation yaw/pitch with a start offset (no roll).
 *       Touch-drag on the canvas adds extra look if sensors are quiet.
 * Move: on-screen joystick (and WASD in debug). NOT accelerometer integration.
 *
 * This is 3DoF look + explicit locomotion, not fake world tracking.
 */
export class OrientationTouchProvider {
  constructor({ camera, canvas, collide, joystick }) {
    this.name = 'DeviceOrientation+Touch';
    this.sixDof = false;
    this.camera = camera;
    this.canvas = canvas;
    this.collide = collide;
    this.joystick = joystick;
    this.running = false;
    this.moved = false;
    this.hasOrientation = false;
    this.lastDelta = new THREE.Vector3();

    this._pos = new THREE.Vector3();
    this._prev = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._deviceQuat = new THREE.Quaternion();
    this._deviceEuler = new THREE.Euler();
    this._zee = new THREE.Vector3(0, 0, 1);
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this._axisQ = new THREE.Quaternion();
    this._calibrated = false;
    this._yaw0 = 0;
    this._pitch0 = 0;
    this._startYaw = 0;
    this._startPitch = 0;
    this._dragYaw = 0;
    this._dragPitch = 0;
    this._lookX = 0;
    this._lookY = 0;
    this._lastNow = 0;
    this._keys = new Set();
    this._dragId = null;
    this._dragLast = { x: 0, y: 0 };

    this._onOrient = (event) => this._handleOrient(event);
    this._onPointerDown = (event) => this._pointerDown(event);
    this._onPointerMove = (event) => this._pointerMove(event);
    this._onPointerUp = (event) => this._pointerUp(event);
    this._onKey = (event) => {
      if (event.type === 'keydown') this._keys.add(event.code);
      else this._keys.delete(event.code);
    };
  }

  async start() {
    this.running = true;
    this.moved = false;
    this._calibrated = false;
    this._dragYaw = 0;
    this._dragPitch = 0;
    this._keys.clear();
    this._lastNow = 0;

    const camera = this.camera;
    camera.matrixAutoUpdate = true;
    if (camera.parent) camera.parent.remove(camera);
    camera.rotation.reorder('YXZ');
    this._pos.copy(camera.position);
    this._prev.copy(camera.position);
    this._startYaw = camera.rotation.y;
    this._startPitch = camera.rotation.x;
    this._lookX = this._startPitch;
    this._lookY = this._startYaw;

    window.addEventListener('deviceorientation', this._onOrient, false);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    if (DEBUG) {
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('keyup', this._onKey);
    }
  }

  update(now = performance.now()) {
    if (!this.running) return false;
    const dt = this._dt(now);
    this._applyLook();
    this._applyMove(dt);
    this.camera.position.copy(this._pos);
    this.camera.updateMatrixWorld(true);
    this.lastDelta.subVectors(this._pos, this._prev);
    if (this.lastDelta.lengthSq() > 1e-8) this.moved = true;
    this._prev.copy(this._pos);
    return true;
  }

  async stop() {
    this.running = false;
    this._keys.clear();
    this.joystick?.reset?.();
    window.removeEventListener('deviceorientation', this._onOrient, false);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
  }

  _applyLook() {
    if (this.hasOrientation) {
      this._deviceEuler.setFromQuaternion(this._deviceQuat, 'YXZ');
      if (!this._calibrated) {
        this._yaw0 = this._deviceEuler.y;
        this._pitch0 = this._deviceEuler.x;
        this._calibrated = true;
      }
      this._lookY = this._startYaw + (this._deviceEuler.y - this._yaw0) + this._dragYaw;
      this._lookX = this._startPitch + (this._deviceEuler.x - this._pitch0) + this._dragPitch;
    } else {
      this._lookY = this._startYaw + this._dragYaw;
      this._lookX = this._startPitch + this._dragPitch;
    }
    this._lookX = THREE.MathUtils.clamp(this._lookX, -0.55, 1.45);
    this.camera.rotation.set(this._lookX, this._lookY, 0, 'YXZ');
  }

  _applyMove(dt) {
    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    if (this._forward.lengthSq() < 1e-8) this._forward.set(0, 0, -1);
    else this._forward.normalize();
    this._right.crossVectors(this._forward, this._up).normalize();

    let x = this.joystick?.x || 0;
    let y = this.joystick?.y || 0;
    if (DEBUG) {
      if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) x -= 1;
      if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) x += 1;
      if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) y += 1;
      if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) y -= 1;
    }
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    if (mag < 0.08) return;

    const speed = CONFIG.exhibition.walkSpeed;
    this._pos.addScaledVector(this._forward, y * speed * dt);
    this._pos.addScaledVector(this._right, x * speed * dt);
    this._pos.y = CONFIG.exhibition.eyeHeight;
    if (this.collide) this.collide(this._pos);
    this._pos.y = CONFIG.exhibition.eyeHeight;
  }

  _handleOrient(event) {
    if (event.alpha == null || event.beta == null || event.gamma == null) return;
    const screenAngle = Number(screen?.orientation?.angle ?? window.orientation ?? 0);
    this._deviceEuler.set(
      THREE.MathUtils.degToRad(event.beta),
      THREE.MathUtils.degToRad(event.alpha),
      -THREE.MathUtils.degToRad(event.gamma),
      'YXZ',
    );
    this._deviceQuat.setFromEuler(this._deviceEuler);
    this._deviceQuat.multiply(this._q1);
    this._deviceQuat.multiply(this._axisQ.setFromAxisAngle(this._zee, -THREE.MathUtils.degToRad(screenAngle)));
    this.hasOrientation = true;
  }

  _pointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.joystick?.ownsPointer?.(event.pointerId)) return;
    this._dragId = event.pointerId;
    this._dragLast.x = event.clientX;
    this._dragLast.y = event.clientY;
  }

  _pointerMove(event) {
    if (event.pointerId !== this._dragId) return;
    const dx = event.clientX - this._dragLast.x;
    const dy = event.clientY - this._dragLast.y;
    this._dragLast.x = event.clientX;
    this._dragLast.y = event.clientY;
    this._dragYaw -= dx * 0.005;
    this._dragPitch -= dy * 0.004;
  }

  _pointerUp(event) {
    if (event.pointerId === this._dragId) this._dragId = null;
  }

  _dt(now) {
    const prev = this._lastNow;
    this._lastNow = now;
    if (!prev) return 1 / 60;
    return Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
  }
}
