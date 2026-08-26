import { arLog, arWarn } from '../logger.js';

/**
 * WebXR immersive-ar backend.
 *
 * Stage 1 does not use this path on iOS: Safari still does not expose
 * immersive-ar (caniuse / WebKit, 2026). Kept as a probed capability and
 * a future world-tracking backend for Android Chrome.
 */
export class WebXRTracker {
  constructor() {
    this.session = null;
    this.hasPose = false;
    this.running = false;
  }

  get name() {
    return 'webxr';
  }

  static async isSupported() {
    try {
      return Boolean(await navigator.xr?.isSessionSupported?.('immersive-ar'));
    } catch {
      return false;
    }
  }

  async start() {
    arWarn('WebXRTracker.start() is not used in Stage 1. iOS Safari has no immersive-ar.');
    throw new Error('WebXR immersive-ar is not the Stage 1 backend');
  }

  stop() {
    this.running = false;
    this.session?.end?.().catch(() => {});
    this.session = null;
    arLog('WebXR session ended');
  }
}
