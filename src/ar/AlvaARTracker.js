import * as THREE from 'three';
import { assetUrl, CONFIG } from '../config.js';
import { arError, arLog, arWarn } from '../logger.js';

/**
 * AlvaAR findCameraPose returns a column-major 4x4 camera-to-world matrix
 * (translation in indices 12,13,14). Convert OpenCV/Alva Y-down Z-forward
 * into Three.js Y-up / -Z-forward using the project's established mapping.
 */
export function alvaPoseToThreeCamera(pose, position, quaternion, scratchMatrix, scratchQuat, scratchVec) {
  scratchMatrix.fromArray(pose);
  scratchQuat.setFromRotationMatrix(scratchMatrix);
  scratchVec.set(pose[12], pose[13], pose[14]);
  quaternion.set(-scratchQuat.x, scratchQuat.y, scratchQuat.z, scratchQuat.w);
  position.set(scratchVec.x, -scratchVec.y, -scratchVec.z);
}

export class AlvaARTracker {
  constructor({ camera, onPose, onStatus }) {
    this.camera = camera;
    this.onPose = onPose;
    this.onStatus = onStatus;
    this.alva = null;
    this.running = false;
    this.hasPose = false;
    this._scratchMatrix = new THREE.Matrix4();
    this._scratchQuat = new THREE.Quaternion();
    this._scratchVec = new THREE.Vector3();
    this.processCanvas = document.createElement('canvas');
    this.processCtx = null;
    this.video = null;
    this._lastFrame = 0;
    this._cover = { x: 0, y: 0, width: 0, height: 0 };
    this.featurePoints = [];
    this.slamStatus = 'INITIALIZING';
    this._hadTracking = false;
    this._errorLogged = false;
    // Exhibition camera is written only by WorldTracking (relative to P0).
    this.applyToCamera = false;
    this.lastPose = null;
    this.framesProcessed = 0;
  }

  getCameraPose() {
    return this.lastPose;
  }

  get name() {
    return 'alva';
  }

  async initialize(width, height) {
    try {
      const url = new URL(assetUrl('vendor/alva_ar.js'), window.location.origin).href;
      const { AlvaAR } = await import(/* @vite-ignore */ url);
      this._setProcessSize(width, height);
      this.alva = await AlvaAR.Initialize(this.processCanvas.width, this.processCanvas.height);
      this._setStatus('INITIALIZING');
      this.onStatus?.(this.slamStatus);
      arLog(`AlvaAR initialized ${this.processCanvas.width}x${this.processCanvas.height}`);
    } catch (err) {
      this._setStatus('ERROR');
      err.code = err.code || 'unsupported';
      throw err;
    }
  }

  _setProcessSize(viewWidth, viewHeight) {
    const maxW = CONFIG.slam.maxWidth;
    const scale = Math.min(1, maxW / Math.max(viewWidth, viewHeight));
    const w = Math.max(160, Math.round(viewWidth * scale));
    const h = Math.max(160, Math.round(viewHeight * scale));
    this.processCanvas.width = w;
    this.processCanvas.height = h;
    this.processCtx = this.processCanvas.getContext('2d', {
      alpha: false,
      willReadFrequently: true,
    });
  }

  start(video) {
    this.video = video;
    this.running = true;
    this.hasPose = false;
    this.lastPose = null;
    this.framesProcessed = 0;
    this._hadTracking = false;
    this._errorLogged = false;
    this._setStatus('INITIALIZING');
    this.onStatus?.(this.slamStatus);
  }

  stop() {
    this.running = false;
  }

  async reset() {
    this.hasPose = false;
    this.lastPose = null;
    this.framesProcessed = 0;
    this.featurePoints = [];
    this._hadTracking = false;
    this._errorLogged = false;
    this._setStatus('INITIALIZING');
    this.onStatus?.(this.slamStatus);
    try {
      this.alva?.reset?.();
    } catch (err) {
      arWarn('AlvaAR reset failed', err);
    }
  }

  update(now, _viewWidth, _viewHeight) {
    if (!this.running || !this.alva || !this.video || this.video.readyState < 2) return false;

    const minDt = 1000 / CONFIG.slam.fps;
    if (now - this._lastFrame < minDt) return this.hasPose;
    this._lastFrame = now;
    this.framesProcessed += 1;

    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const cw = this.processCanvas.width;
    const ch = this.processCanvas.height;
    if (vw < 2 || vh < 2 || cw < 16 || ch < 16 || !this.processCtx) return false;

    this.processCtx.drawImage(this.video, 0, 0, cw, ch);
    const frame = this.processCtx.getImageData(0, 0, cw, ch);

    let pose = null;
    try {
      pose = this.alva.findCameraPose(frame);
    } catch (err) {
      this.hasPose = false;
      if (!this._errorLogged) {
        this._errorLogged = true;
        arError('SLAM pose failed', err);
      }
      this._setStatus('ERROR');
      return false;
    }

    if (pose) {
      if (!this.lastPose) this.lastPose = new Float32Array(16);
      for (let i = 0; i < 16; i += 1) this.lastPose[i] = pose[i];
      if (this.applyToCamera) {
        alvaPoseToThreeCamera(
          this.lastPose,
          this.camera.position,
          this.camera.quaternion,
          this._scratchMatrix,
          this._scratchQuat,
          this._scratchVec,
        );
        this.camera.updateMatrixWorld(true);
      }
      this.hasPose = true;
      this._errorLogged = false;
      this._hadTracking = true;
      this._setStatus('TRACKING');
      this.onPose?.(this.lastPose);
      this.featurePoints = [];
      if (this.framesProcessed === 1 || this.framesProcessed % 30 === 0) {
        arLog(`AlvaAR frame ${this.framesProcessed} TRACKING`);
      }
    } else {
      this.hasPose = false;
      // Keep lastPose. Lost tracking must not stop the render loop or reset the camera.
      this._setStatus(this._hadTracking ? 'LOST' : 'INITIALIZING');
      try {
        this.featurePoints = this.alva.getFramePoints?.() || [];
      } catch {
        this.featurePoints = [];
      }
      if (this.framesProcessed === 1 || this.framesProcessed % 30 === 0) {
        arLog(`AlvaAR frame ${this.framesProcessed} ${this.slamStatus} points=${this.featurePoints.length}`);
      }
    }

    return this.hasPose;
  }

  _setStatus(next) {
    if (this.slamStatus === next) return;
    const prev = this.slamStatus;
    this.slamStatus = next;
    if (prev === 'TRACKING' && next === 'LOST') arLog('SLAM tracking lost');
    if (prev === 'LOST' && next === 'TRACKING') arLog('SLAM tracking recovered');
    this.onStatus?.(next);
  }
}

export function coverRect(srcW, srcH, dstW, dstH) {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let width;
  let height;
  if (srcRatio > dstRatio) {
    height = dstH;
    width = height * srcRatio;
  } else {
    width = dstW;
    height = width / srcRatio;
  }
  return {
    width,
    height,
    x: (dstW - width) / 2,
    y: (dstH - height) / 2,
  };
}
