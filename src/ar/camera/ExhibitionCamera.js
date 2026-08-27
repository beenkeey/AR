import { Vector3 } from 'three';
import { arLog, arWarn } from '../../logger.js';
import { debugState } from '../../debugState.js';
import { OrientationTouchProvider } from './OrientationTouchProvider.js';
import { WebXRCameraProvider } from './WebXRCameraProvider.js';

/**
 * Facade: App calls start/update/stop. The active backend is selected at start.
 * WebXR if immersive-ar is actually supported; otherwise DeviceOrientation + joystick.
 */
export class ExhibitionCamera {
  constructor({ camera, renderer, session, collide, joystick }) {
    this.camera = camera;
    this.renderer = renderer;
    this.session = session;
    this.collide = collide;
    this.joystick = joystick;
    this.provider = null;
    this.enabled = false;
    this.moved = false;
    this.lastDelta = new Vector3();
    this.probe = null;
  }

  get name() {
    return this.provider?.name || 'NONE';
  }

  get sixDof() {
    return Boolean(this.provider?.sixDof);
  }

  get status() {
    if (!this.enabled) return 'INACTIVE';
    return this.provider?.hasOrientation === false ? 'TOUCH' : 'ACTIVE';
  }

  async start() {
    await this.stop();
    let provider = null;

    if (this.probe?.immersiveAR) {
      provider = new WebXRCameraProvider({
        renderer: this.renderer,
        camera: this.camera,
        session: this.session,
      });
      try {
        await provider.start();
        arLog('Camera provider: WebXR');
      } catch (err) {
        arWarn('WebXR start failed, using DeviceOrientation+Touch', err);
        await provider.stop().catch(() => {});
        provider = null;
      }
    }

    if (!provider) {
      provider = new OrientationTouchProvider({
        camera: this.camera,
        canvas: this.renderer.domElement,
        collide: this.collide,
        joystick: this.joystick,
      });
      await provider.start();
      arLog('Camera provider: DeviceOrientation+Touch');
    }

    this.provider = provider;
    this.enabled = true;
    this.moved = false;
    debugState.cameraProvider = provider.name;
  }

  update(now) {
    if (!this.enabled || !this.provider) return false;
    const ok = this.provider.update(now);
    this.moved = Boolean(this.provider.moved);
    if (this.provider.lastDelta) this.lastDelta.copy(this.provider.lastDelta);
    return ok;
  }

  async stop() {
    this.enabled = false;
    const provider = this.provider;
    this.provider = null;
    if (provider) await provider.stop();
    debugState.cameraProvider = 'NONE';
  }
}
