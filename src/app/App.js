import * as THREE from 'three';
import { CONFIG, DEBUG, MESSAGES, WORLD_TRACKING_ENABLED } from '../config.js';
import { arDiag, arError, arLog, arWarn } from '../logger.js';
import { debugState, formatEuler, formatScalar, formatVec3 } from '../debugState.js';
import { AppState, STATES } from './AppState.js';
import { ARSession } from '../ar/ARSession.js';
import { TrackingManager } from '../ar/TrackingManager.js';
import { WorldTracking } from '../ar/WorldTracking.js';
import { ExhibitionScene } from '../ar/ExhibitionScene.js';
import { TargetRecognition } from '../recognition/TargetRecognition.js';
import { RigModel, createFallbackRig } from '../model/RigModel.js';
import { HyperSpeedEffect } from '../effects/HyperSpeedEffect.js';
import { ScanUI } from '../ui/ScanUI.js';
import { ARUI } from '../ui/ARUI.js';
import { ErrorUI } from '../ui/ErrorUI.js';
import { LoadingUI } from '../ui/LoadingUI.js';
import { DebugPanel } from '../ui/DebugPanel.js';

export class App {
  constructor(root) {
    this.root = root;
    this.state = new AppState(STATES.SCAN);
    this.session = new ARSession(root);
    this.exhibition = new ExhibitionScene();
    this.worldTracking = new WorldTracking(this.session.camera);
    this.rig = new RigModel();
    this.hyperspace = new HyperSpeedEffect(root);
    this.recognition = new TargetRecognition({
      onFound: (data) => this.handleTargetFound(data),
      onLost: () => this.handleTargetLost(),
      onProgress: (_phase, progress) => {
        if (DEBUG) this.debugPanel.update();
        if (typeof progress === 'number') {
          this.loading.show(`${MESSAGES.compiling} ${Math.round(progress)}%`);
        }
      },
    });
    this.tracking = new TrackingManager({
      camera: this.session.camera,
      onStatus: (status) => {
        debugState.tracking = status;
      },
    });

    this.loading = new LoadingUI();
    this.scanUI = new ScanUI();
    this.arUI = new ARUI({ onBack: () => this.backToScan() });
    this.errorUI = new ErrorUI();
    this.debugPanel = new DebugPanel();
    this.debugPanel.onSimulate(() => this.simulateTargetFound());
    this.debugPanel.onReset(() => this.resetTest());
    this.debugPanel.onToggleWorldTracking(() => this.toggleWorldTracking());

    root.appendChild(this.loading.el);
    root.appendChild(this.scanUI.el);
    root.appendChild(this.arUI.el);
    root.appendChild(this.errorUI.el);
    root.appendChild(this.debugPanel.el);

    this.placementStarted = false;
    this.capabilities = null;
    this.sessionReady = false;
    this.transitioning = false;
    this.worldTrackingWanted = WORLD_TRACKING_ENABLED;
    this._scratchPos = new THREE.Vector3();
    this._scratchQuat = new THREE.Quaternion();
    this._scratchScale = new THREE.Vector3();
    this._euler = new THREE.Euler();

    this.resetDebugPlacement();
    this.state.subscribe((value) => {
      debugState.appState = value;
      this.scanUI.el.hidden = !this.sessionReady || value !== STATES.SCAN;
      this.arUI.el.hidden = value !== STATES.EXHIBITION;
    });
  }

  async boot(capabilities) {
    this.capabilities = capabilities;
    this.loading.show(MESSAGES.loading);

    try {
      await this.recognition.prepare();
      try {
        await this.rig.load();
      } catch (err) {
        arWarn('GLB load failed, using fallback mesh', err);
        this.rig.root.add(createFallbackRig());
        this.rig.applyConfig();
        this.rig.loaded = true;
      }
      this.exhibition.attach(this.rig.root);
      this.rig.hide();
      debugState.modelVisible = 'HIDDEN';
      debugState.modelMode = 'HIDDEN';
      if (DEBUG) this.debugPanel.update();
    } catch (err) {
      arError('Asset prepare failed', err);
      if (DEBUG) this.debugPanel.update();
      this.fail(MESSAGES.genericError);
      return;
    }

    this.loading.show(MESSAGES.tapToStart);
    this.root.classList.add('awaiting-gesture');
    const start = async () => {
      this.root.removeEventListener('pointerdown', start);
      this.root.classList.remove('awaiting-gesture');
      await this.startSession();
    };
    this.root.addEventListener('pointerdown', start, { once: true });
  }

  async startSession() {
    this.loading.show(MESSAGES.loading);
    try {
      const video = await this.session.startCamera();
      const stream = video.srcObject;
      const live = Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live'));
      arDiag(
        'VIDEO',
        `camera started VIDEO ATTR ${video.width}x${video.height} VIDEO REAL ${video.videoWidth}x${video.videoHeight} readyState=${video.readyState} streamActive=${Boolean(stream?.active) || live}`,
      );
      debugState.videoAttrSize = `${video.width}x${video.height}`;
      debugState.videoRealSize = `${video.videoWidth}x${video.videoHeight}`;
      await this.tracking.initialize(this.capabilities, video.videoWidth, video.videoHeight);
      this.tracking.start(video);
      await this.recognition.start(video);
      this.session.startLoop((now) => this.onFrame(now));
      this.sessionReady = true;
      if (!this.placementStarted) this.enterScan();
      this.loading.hide();
      if (DEBUG) this.debugPanel.update();
    } catch (err) {
      arError('Failed to start AR session', err);
      if (DEBUG) this.debugPanel.update();
      if (err.code === 'camera-denied') this.fail(MESSAGES.cameraDenied);
      else if (err.code === 'unsupported') this.fail(MESSAGES.unsupported);
      else this.fail(MESSAGES.genericError);
    }
  }

  enterScan() {
    this.placementStarted = false;
    this.transitioning = false;
    this.worldTracking.disable();
    this.exhibition.hide();
    this.hyperspace.stop();
    this.resetCameraToOrigin();
    this.session.showLiveCamera();
    this.resetDebugPlacement();
    this.scanUI.setTitle(MESSAGES.scan);
    this.state.set(STATES.SCAN);
  }

  onFrame(now) {
    const { width, height } = this.session.size;
    this.tracking.update(now, width, height);
    if (this.state.is(STATES.EXHIBITION)) this.updateCameraTracking();
    this.updateDebug();
  }

  handleTargetFound(_data) {
    if (!this.state.is(STATES.SCAN) || this.placementStarted || this.transitioning) return;
    this.placementStarted = true;
    this.recognition.lockAfterFound();
    this.recognition.stop();
    arLog('MindAR FOUND — starting exhibition transition');
    this.beginTransition();
  }

  handleTargetLost() {
    if (!this.state.is(STATES.SCAN)) return;
  }

  async beginTransition() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.state.set(STATES.TRANSITION);
    debugState.effect = 'HYPERSPACE';
    debugState.modelMode = 'PREPARING';
    this.scanUI.hide();
    arLog('TRANSITION hyperspace');

    try {
      await this.hyperspace.play({
        durationMs: CONFIG.hyperspace.durationMs,
        onPeak: () => this.prepareExhibition(),
      });
    } catch (err) {
      arError('Hyperspace failed', err);
      this.prepareExhibition();
    }

    if (!this.placementStarted) return;
    if (!this.exhibition.locked) this.prepareExhibition();
    await this.exhibition.fadeIn(CONFIG.exhibition.fadeMs);
    this.syncWorldTracking();
    debugState.effect = 'NONE';
    debugState.modelMode = 'STATIC';
    debugState.modelVisible = 'VISIBLE';
    debugState.placementStatus = 'FIXED';
    this.state.set(STATES.EXHIBITION);
    this.transitioning = false;
    arLog('EXHIBITION — model static, camera tracking only');
  }

  prepareExhibition() {
    this.resetCameraForExhibition();
    this.session.showBlackExhibition(this.exhibition.scene);
    this.exhibition.placeStatic();
    debugState.placementStatus = 'FIXED';
    debugState.placementMode = 'EXHIBITION';
    debugState.modelTransformUpdates = this.exhibition.transformUpdates;
    debugState.modelMode = 'STATIC';
    arLog('Exhibition model placed and locked');
  }

  resetCameraToOrigin() {
    const camera = this.session.camera;
    camera.matrixAutoUpdate = true;
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.scale.set(1, 1, 1);
    camera.updateMatrixWorld(true);
  }

  resetCameraForExhibition() {
    const camera = this.session.camera;
    camera.matrixAutoUpdate = true;
    camera.position.set(0, CONFIG.exhibition.eyeHeight, 0);
    camera.lookAt(0, EXHIBITION_LOOK_Y, -CONFIG.exhibition.distance);
    camera.updateMatrixWorld(true);
  }

  updateCameraTracking() {
    if (!this.worldTrackingWanted) {
      debugState.worldTracking = 'OFF';
      debugState.cameraMode = 'LOCKED';
      return;
    }
    if (!this.worldTracking.enabled) return;
    const live = Boolean(this.tracking.hasPose);
    const pose = this.tracking.getCameraPose();
    debugState.cameraPoseValid = live ? 'VALID' : (pose ? 'LAST POSE' : 'INVALID');
    this.worldTracking.update(pose, live);
    debugState.cameraMode = this.worldTracking.status;
  }

  syncWorldTracking() {
    if (!this.worldTrackingWanted) {
      this.worldTracking.disable();
      debugState.worldTracking = 'OFF';
      debugState.cameraMode = 'LOCKED';
      return;
    }
    this.worldTracking.enable();
    debugState.worldTracking = this.worldTracking.status;
    debugState.cameraMode = this.worldTracking.status;
  }

  toggleWorldTracking() {
    this.worldTrackingWanted = !this.worldTrackingWanted;
    if (this.state.is(STATES.EXHIBITION) && this.worldTrackingWanted) {
      this.worldTracking.enable();
      arLog('World tracking ON');
    } else {
      this.worldTracking.disable();
      if (this.state.is(STATES.EXHIBITION)) this.resetCameraForExhibition();
      arLog('World tracking OFF');
    }
    debugState.worldTracking = this.worldTrackingWanted ? this.worldTracking.status : 'OFF';
    this.debugPanel.setWorldTrackingLabel(this.worldTrackingWanted);
    if (DEBUG) this.debugPanel.update();
  }

  simulateTargetFound() {
    if (!DEBUG) return;
    if (!this.state.is(STATES.SCAN) || this.placementStarted) return;
    arLog('Debug: simulating target found');
    debugState.target = 'FOUND';
    this.handleTargetFound({});
  }

  async backToScan() {
    arLog('Back to scan');
    this.placementStarted = false;
    this.transitioning = false;
    this.hyperspace.stop();
    this.worldTracking.disable();
    this.exhibition.hide();
    this.resetCameraToOrigin();
    this.session.showLiveCamera();
    this.resetDebugPlacement();
    debugState.target = 'LOST';
    await this.tracking.reset();
    this.scanUI.setTitle(MESSAGES.scan);
    this.state.set(STATES.SCAN);
    try {
      await this.recognition.start(this.session.video);
    } catch (err) {
      arError('Failed to restart recognition', err);
      this.fail(MESSAGES.genericError);
    }
  }

  async resetTest() {
    if (!DEBUG || !this.sessionReady) return;
    arLog('Debug: reset test');
    await this.backToScan();
  }

  resetDebugPlacement() {
    debugState.placementStatus = 'PENDING';
    debugState.placementMode = 'NONE';
    debugState.modelVisible = 'HIDDEN';
    debugState.modelMode = 'HIDDEN';
    debugState.effect = 'NONE';
    debugState.modelTransformUpdates = 0;
    debugState.worldTracking = this.worldTrackingWanted ? 'INACTIVE' : 'OFF';
    debugState.cameraPoseValid = 'INVALID';
    debugState.cameraMode = 'SCAN';
    debugState.referencePose = 'NOT SET';
    debugState.cameraMoved = 'NO';
    debugState.poseDelta = 'N/A';
    debugState.modelX = 'N/A';
    debugState.modelY = 'N/A';
    debugState.modelZ = 'N/A';
    debugState.modelRotation = 'N/A';
    debugState.modelScale = 'N/A';
    debugState.modelWorldPosition = 'N/A';
    debugState.modelWorldScale = 'N/A';
    debugState.modelCameraDistance = 'N/A';
  }

  updateDebug() {
    if (!DEBUG) return;
    const video = this.session.video;
    if (video) {
      debugState.videoSize = `${video.videoWidth}x${video.videoHeight}`;
      debugState.videoAttrSize = `${video.width}x${video.height}`;
      debugState.videoRealSize = `${video.videoWidth}x${video.videoHeight}`;
      debugState.videoReadyState = String(video.readyState);
      const stream = video.srcObject;
      const live = Boolean(stream?.getVideoTracks?.().some((track) => track.readyState === 'live'));
      debugState.cameraStreamActive = stream ? String(Boolean(stream.active) || live) : 'false';
    }
    debugState.fps = Number.isFinite(this.session.fps) ? String(this.session.fps) : 'N/A';
    const tracker = this.tracking.tracker;
    if (!tracker) {
      debugState.alvaStatus = 'N/A';
      debugState.alvaInstance = 'NOT CREATED';
    } else {
      debugState.alvaInstance = tracker.alva ? 'CREATED' : 'NOT CREATED';
      debugState.alvaStatus = tracker.slamStatus || 'INITIALIZING';
      debugState.alvaFrames = tracker.framesProcessed ?? 0;
    }
    debugState.cameraTracking = this.state.is(STATES.EXHIBITION)
      ? this.worldTracking.status
      : debugState.alvaStatus;
    debugState.worldTracking = this.worldTrackingWanted ? this.worldTracking.status : 'OFF';
    debugState.referencePose = this.worldTracking.referenceSet ? 'SET' : 'NOT SET';
    debugState.cameraPoseValid = this.tracking.hasPose ? 'VALID' : (this.tracking.getCameraPose() ? 'LAST POSE' : 'INVALID');
    debugState.cameraMoved = this.worldTracking.moved ? 'YES' : 'NO';
    debugState.poseDelta = this.worldTracking.referenceSet ? formatVec3(this.worldTracking.lastDelta) : 'N/A';
    debugState.cameraMode = this.state.is(STATES.EXHIBITION) ? this.worldTracking.status : 'SCAN';

    this.session.camera.updateMatrixWorld(true);
    this.session.camera.matrixWorld.decompose(this._scratchPos, this._scratchQuat, this._scratchScale);
    debugState.cameraPosition = formatVec3(this.session.camera.position);
    debugState.cameraWorldPosition = formatVec3(this._scratchPos);
    this._euler.setFromQuaternion(this.session.camera.quaternion, 'YXZ');
    debugState.cameraRotation = formatEuler(this._euler);
    this._euler.setFromQuaternion(this._scratchQuat, 'YXZ');
    debugState.cameraWorldRotation = formatEuler(this._euler);

    debugState.modelVisible = this.rig.root.visible ? 'VISIBLE' : 'HIDDEN';
    debugState.modelMode = this.exhibition.locked ? 'STATIC' : debugState.modelMode;
    debugState.modelTransformUpdates = this.exhibition.transformUpdates;

    if (this.exhibition.locked) {
      this.exhibition.anchor.updateMatrixWorld(true);
      this.exhibition.anchor.matrixWorld.decompose(this._scratchPos, this._scratchQuat, this._scratchScale);
      debugState.modelX = formatScalar(this._scratchPos.x);
      debugState.modelY = formatScalar(this._scratchPos.y);
      debugState.modelZ = formatScalar(this._scratchPos.z);
      debugState.modelWorldPosition = formatVec3(this._scratchPos);
      debugState.modelWorldScale = formatVec3(this._scratchScale);
      this._euler.setFromQuaternion(this._scratchQuat, 'YXZ');
      debugState.modelRotation = formatEuler(this._euler);
      debugState.modelScale = formatScalar(this._scratchScale.y);
      debugState.modelCameraDistance = formatScalar(this.session.camera.position.distanceTo(this._scratchPos));
    }
    this.debugPanel.update();
  }

  fail(message) {
    this.loading.hide();
    this.scanUI.hide();
    this.arUI.hide();
    this.errorUI.show(message);
  }
}

const EXHIBITION_LOOK_Y = CONFIG.exhibition.modelScale * 0.4;
