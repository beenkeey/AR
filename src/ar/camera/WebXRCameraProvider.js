import * as THREE from 'three';
import { arLog, arWarn } from '../../logger.js';

/**
 * Real 6DoF via WebXR immersive-ar when the browser actually supports it.
 * ExhibitionRoot is never written. Three.js applies XRViewerPose to the camera.
 */
export class WebXRCameraProvider {
  constructor({ renderer, camera, session }) {
    this.name = 'WebXR';
    this.sixDof = true;
    this.renderer = renderer;
    this.camera = camera;
    this.appSession = session;
    this.xrSession = null;
    this.running = false;
    this.moved = false;
    this.lastDelta = new THREE.Vector3();
    this._prev = new THREE.Vector3();
  }

  static async isAvailable() {
    try {
      return Boolean(await navigator.xr?.isSessionSupported?.('immersive-ar'));
    } catch {
      return false;
    }
  }

  async start() {
    const xr = navigator.xr;
    if (!xr?.requestSession) throw new Error('WebXR requestSession is not available');

    this.appSession.stream?.getTracks?.().forEach((track) => track.stop());
    this.appSession.video.srcObject = null;

    this.renderer.xr.enabled = true;
    this.xrSession = await xr.requestSession('immersive-ar', {
      optionalFeatures: ['local-floor', 'bounded-floor'],
    });
    await this.renderer.xr.setSession(this.xrSession);
    this.running = true;
    this.moved = false;
    this._prev.setFromMatrixPosition(this.camera.matrixWorld);
    arLog('WebXR immersive-ar session started');
  }

  update() {
    if (!this.running) return false;
    this.camera.updateMatrixWorld(true);
    const pos = this.camera.position;
    this.lastDelta.subVectors(pos, this._prev);
    if (this.lastDelta.lengthSq() > 1e-8) this.moved = true;
    this._prev.copy(pos);
    return true;
  }

  async stop() {
    this.running = false;
    try {
      await this.xrSession?.end?.();
    } catch {
      /* already ended */
    }
    this.xrSession = null;
    try {
      await this.renderer.xr.setSession(null);
    } catch {
      /* ignore */
    }
    this.renderer.xr.enabled = false;
    arWarn('WebXR session stopped');
  }
}
