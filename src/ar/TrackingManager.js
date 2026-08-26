import { AlvaARTracker } from './AlvaARTracker.js';
import { WebXRTracker } from './WebXRTracker.js';
import { debugState } from '../debugState.js';

export class TrackingManager {
  constructor({ camera, onPose, onStatus }) {
    this.camera = camera;
    this.onPose = onPose;
    this.onStatus = onStatus;
    this.tracker = null;
    this.backend = 'none';
    this.required = true;
  }

  async initialize(capabilities, viewWidth, viewHeight) {
    const webxrOk = await WebXRTracker.isSupported();
    debugState.backend = webxrOk && !capabilities.isiOS ? 'webxr-available-unused' : 'alva';

    // Stage 1: always use AlvaAR so recognition and world tracking share one camera stream.
    // WebXR would start a new session and reset the world origin after getUserMedia detection.
    this.tracker = new AlvaARTracker({
      camera: this.camera,
      onPose: (pose) => this.onPose?.(pose),
      onStatus: (status) => {
        debugState.alvaStatus = status;
        debugState.cameraTracking = status;
        debugState.alvaInstance = this.tracker?.alva ? 'CREATED' : 'NOT CREATED';
        this.onStatus?.(status);
      },
    });
    await this.tracker.initialize(viewWidth, viewHeight);
    this.backend = this.tracker.name;
    debugState.backend = this.backend;
    debugState.alvaStatus = this.tracker.slamStatus || 'INITIALIZING';
    debugState.alvaInstance = this.tracker.alva ? 'CREATED' : 'NOT CREATED';
    debugState.cameraTracking = debugState.alvaStatus;
    return this.backend;
  }

  start(video) {
    this.required = true;
    this.tracker.start(video);
  }

  markWorldTrackingIndependent() {
    this.required = true;
  }

  update(now, viewWidth, viewHeight) {
    return this.tracker?.update(now, viewWidth, viewHeight) ?? false;
  }

  async reset() {
    await this.tracker?.reset?.();
  }

  stop() {
    this.tracker?.stop?.();
  }

  get hasPose() {
    return Boolean(this.tracker?.hasPose);
  }

  getCameraPose() {
    return this.tracker?.getCameraPose?.() ?? null;
  }

  get featurePoints() {
    return this.tracker?.featurePoints || [];
  }
}
