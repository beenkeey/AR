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

    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 250);
    this.camera.rotation.reorder('YXZ');

    this.renderer = new THREE.WebGLRenderer({
      antialias: !CONFIG.performance.weak,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'ar-canvas';

    this.container.appendChild(this.video);
    this.container.appendChild(this.renderer.domElement);

    this.stream = null;
    this.running = false;
    this.onFrame = null;
    this._frame = 0;
    this._fpsLast = 0;
    this.fps = 0;
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
    this.projectionLocked = false;
    this.resize();
  }

  showBlackExhibition(scene) {
    this.video.classList.remove('is-hidden');
    this.renderer.setClearColor(0x000000, 1);
    this.activeScene = scene;
    this.camera.near = 0.05;
    this.camera.far = 250;
    this.projectionLocked = false;
    this.camera.aspect = (this.container.clientWidth || window.innerWidth)
      / (this.container.clientHeight || window.innerHeight);
    this.camera.updateProjectionMatrix();
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
    this.renderer.setAnimationLoop((now) => this._tick(now));
  }

  _tick(now) {
    if (!this.running) return;
    this._frame += 1;
    if (now - this._fpsLast >= 500) {
      this.fps = Math.round((this._frame * 1000) / (now - this._fpsLast));
      this._frame = 0;
      this._fpsLast = now;
    }
    this.onFrame?.(now);
    this.renderer.render(this.activeScene, this.camera);
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
