import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { arDiag, arLog } from '../logger.js';

export class ARSession {
  constructor(container) {
    this.container = container;
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('webkit-playsinline', '');
    this.video.setAttribute('autoplay', '');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.className = 'ar-video';

    this.scanScene = new THREE.Scene();
    this.scanScene.name = 'Scan';
    this.activeScene = this.scanScene;

    this.camera = new THREE.PerspectiveCamera(CONFIG.exhibition.cameraFov, 1, 0.05, CONFIG.exhibition.cameraFar);
    this.camera.rotation.reorder('YXZ');

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.dithering = true;
    this.renderer.domElement.className = 'ar-canvas';

    this.container.appendChild(this.video);
    this.container.appendChild(this.renderer.domElement);

    this.stream = null;
    this.running = false;
    this.onFrame = null;
    this.onAfterRender = null;
    this._frame = 0;
    this.frameTotal = 0;
    this._fpsLast = 0;
    this.fps = 0;
    this.lastRenderAt = 0;
    this.projectionLocked = false;
    this._onResize = () => this.resize();
  }

  setActiveScene(scene) {
    this.activeScene = scene;
  }

  showLiveCamera() {
    this.video.classList.remove('is-hidden');
    this.renderer.setClearColor(0x000000, 0);
    this.activeScene = this.scanScene;
    this.camera.near = 0.05;
    this.camera.far = 250;
    this.camera.fov = CONFIG.exhibition.cameraFov;
    this.projectionLocked = false;
    this.resize();
  }

  showExhibition(scene) {
    this.video.classList.add('is-hidden');
    this.renderer.setClearColor(0xa9c7dc, 1);
    this.activeScene = scene;
    this.camera.near = CONFIG.exhibition.cameraNear;
    this.camera.far = CONFIG.exhibition.cameraFar;
    this.camera.fov = CONFIG.exhibition.cameraFov;
    this.projectionLocked = false;
    this.resize();
    void this.video.play?.();
  }

  async ensureCamera() {
    const live = Boolean(this.stream?.getVideoTracks?.().some((track) => track.readyState === 'live'));
    if (live && this.video.srcObject) return this.video;
    return this.startCamera();
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('getUserMedia is not available');
      err.code = 'unsupported';
      throw err;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: CONFIG.camera.facingMode },
          width: CONFIG.camera.width,
          height: CONFIG.camera.height,
        },
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        err.code = 'camera-denied';
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        err.code = 'unsupported';
      }
      throw err;
    }

    this.video.srcObject = this.stream;
    await this.video.play();
    await waitForVideo(this.video);
    applyMindARVideoSize(this.video);
    this.resize();
    arLog('Session started');
    return this.video;
  }

  startLoop(onFrame) {
    this.onFrame = onFrame;
    this.running = true;
    this._fpsLast = performance.now();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this.renderer.setAnimationLoop((now) => this._tick(now));
  }

  _tick(now) {
    if (!this.running) return;
    this._frame += 1;
    this.frameTotal += 1;
    this.lastRenderAt = now;
    if (now - this._fpsLast >= 500) {
      this.fps = Math.round((this._frame * 1000) / (now - this._fpsLast));
      this._frame = 0;
      this._fpsLast = now;
    }
    this.onFrame?.(now);
    this.renderer.render(this.activeScene, this.camera);
    // SLAM / getImageData after paint so a slow findCameraPose cannot freeze the picture.
    this.onAfterRender?.(now);
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, CONFIG.performance.maxPixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    if (!this.projectionLocked) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  get size() {
    return {
      width: this.container.clientWidth || window.innerWidth,
      height: this.container.clientHeight || window.innerHeight,
    };
  }

  async stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this.stream?.getTracks()?.forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
  }
}

function waitForVideo(video) {
  if (video.videoWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    video.addEventListener('loadedmetadata', done, { once: true });
  });
}

function applyMindARVideoSize(video) {
  video.setAttribute('width', String(video.videoWidth));
  video.setAttribute('height', String(video.videoHeight));
  arDiag(
    'VIDEO',
    `MindAR contract attr=${video.getAttribute('width')}x${video.getAttribute('height')} real=${video.videoWidth}x${video.videoHeight} idl=${video.width}x${video.height}`,
  );
}
