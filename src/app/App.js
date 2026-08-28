import * as THREE from 'three';
import { CONFIG, DEBUG, MESSAGES, WORLD_TRACKING_ENABLED } from '../config.js';
import { arDiag, arError, arLog, arWarn } from '../logger.js';
import { debugState, formatAgeSince, formatEuler, formatScalar, formatTimestamp, formatVec3 } from '../debugState.js';
import { paintFreezeHud, recordLastError, startWatchdog } from '../debugWatchdog.js';
import { AppState, STATES } from './AppState.js';
import { ARSession } from '../ar/ARSession.js';
import { TrackingManager } from '../ar/TrackingManager.js';
import { alvaPoseToThreeCamera } from '../ar/AlvaARTracker.js';
import { WorldTracking } from '../ar/WorldTracking.js';
import { SessionAnchor } from '../ar/SessionAnchor.js';
import { applyOrientationPermission, probeCameraApis } from '../ar/camera/probeCameraApis.js';
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
    this.rig = new RigModel();
    this.hyperspace = new HyperSpeedEffect(root);
    this.anchor = new SessionAnchor();
    this.worldTracking = new WorldTracking(this.session.camera, this.exhibition.scene);
    this.worldTracking.collide = (pos) => this.exhibition.resolveCamera(pos);
    this.tracking = new TrackingManager({
      camera: this.session.camera,
    });
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

    this.loading = new LoadingUI();
    this.scanUI = new ScanUI();
    this.arUI = new ARUI({
      onBack: () => this.backToScan(),
      onViewpoint: (id) => this.goToViewpoint(id),
    });
    this.errorUI = new ErrorUI();
    this.debugPanel = new DebugPanel();
    this.debugPanel.onSimulate(() => this.simulateTargetFound());
    this.debugPanel.onReset(() => this.resetTest());
    this.debugPanel.onToggleWorldTracking(() => this.toggleCamera());

    this.freezeHud = document.createElement('pre');
    this.freezeHud.className = 'freeze-hud';
    this.freezeHud.hidden = !DEBUG;
    if (DEBUG) startWatchdog(this.freezeHud);

    root.appendChild(this.loading.el);
    root.appendChild(this.scanUI.el);
    root.appendChild(this.arUI.el);
    root.appendChild(this.errorUI.el);
    root.appendChild(this.debugPanel.el);
    root.appendChild(this.freezeHud);

    this.placementStarted = false;
    this.capabilities = null;
    this.sessionReady = false;
    this.transitioning = false;
    this.cameraWanted = WORLD_TRACKING_ENABLED;
    this.slamReady = false;
    this.probe = null;
    this._slamMs = 0;
    this._slamBusy = false;
    this._scratchPos = new THREE.Vector3();
    this._scratchQuat = new THREE.Quaternion();
    this._scratchScale = new THREE.Vector3();
    this._camWorld = new THREE.Vector3();
    this._euler = new THREE.Euler();
    this._hudLastNow = 0;
    this._hudLastCam = '';
    this._rawPos = new THREE.Vector3();
    this._rawQuat = new THREE.Quaternion();
    this._rawScratchQuat = new THREE.Quaternion();
    this._rawMat = new THREE.Matrix4();
    this._rawVec = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this.session.renderer.domElement.addEventListener('pointerup', (event) => {
      this.onExhibitionPointer(event);
    });

    this.resetDebugPlacement();
    this.state.subscribe((value) => {
      debugState.appState = value;
      this.scanUI.el.hidden = !this.sessionReady || value !== STATES.SCAN;
      this.arUI.el.hidden = value !== STATES.EXHIBITION;
      this.freezeHud.hidden = !DEBUG;
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
        arWarn('Model load failed, using Arctic procedural rig', err);
        this.rig.root.add(createFallbackRig());
        this.rig.applyConfig();
        this.rig.assetKind = 'ARCTIC PROCEDURAL';
        this.rig.loaded = true;
        this.rig.syncAssetDebug();
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
    this.probe = await probeCameraApis();
    const start = () => {
      this.root.removeEventListener('click', start);
      this.root.classList.remove('awaiting-gesture');
      const permissionPromise = this.worldTracking.requestPermissionFromGesture();
      this._startAfterOrientationPermission(permissionPromise);
    };
    this.root.addEventListener('click', start, { once: true });
  }

  async _startAfterOrientationPermission(permissionPromise) {
    const status = await permissionPromise;
    if (this.probe) applyOrientationPermission(this.probe, status);
    this.worldTracking.prepareSensors(status);
    await this.startSession();
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

      try {
        await this.tracking.initialize(
          this.capabilities,
          video.videoWidth || 640,
          video.videoHeight || 480,
        );
        this.slamReady = true;
        debugState.alvaInstance = 'CREATED';
        this.tracking.start(video);
        debugState.alvaStatus = this.tracking.tracker?.slamStatus || 'INITIALIZING';
        debugState.alvaRunning = this.tracking.tracker?.running ? 'YES' : 'NO';
        arLog('AlvaAR WASM ready, feeding camera during SCAN');
      } catch (err) {
        this.slamReady = false;
        debugState.alvaStatus = 'UNAVAILABLE';
        debugState.alvaInstance = 'NOT CREATED';
        debugState.cameraSixDof = 'NO';
        arWarn('AlvaAR init failed — exhibition camera has no 6DoF source', err);
      }

      await this.recognition.start(video);
      debugState.mindar = 'SCANNING';
      this.session.startLoop((now) => this.onFrame(now));
      this.session.onAfterRender = (now) => this.afterRender(now);
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
    if (this.slamReady) this.tracking.start(this.session.video);
    this.anchor.clear();
    this.exhibition.hide();
    this.arUI.setScaleMode('huge');
    this.hyperspace.stop();
    this.resetCameraToOrigin();
    this.session.showLiveCamera();
    this.resetDebugPlacement();
    debugState.mindar = 'SCANNING';
    this.scanUI.setTitle(MESSAGES.scan);
    this.state.set(STATES.SCAN);
  }

  onFrame(now) {
    if (this.state.is(STATES.EXHIBITION) || this.state.is(STATES.TRANSITION)) {
      if (this.worldTracking.enabled) {
        const pose = this.tracking.getCameraPose();
        const live = Boolean(this.tracking.hasPose);
        this.worldTracking.update(pose, live, now);
        debugState.cameraUpdateTimestamp = formatTimestamp();
      }
      this.exhibition.tick(now);
    }
    if (this.exhibition.locked) this.exhibition.enforceLock();
    this._updateFreezeHud(now);
    this.updateDebug();
  }

  afterRender(_now) {
    if (!this.slamReady) return;
    if (!this.tracking.tracker?.running) return;
    if (this._slamBusy) return;
    this._slamBusy = true;
    const video = this.session.video;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    setTimeout(() => {
      try {
        if (!this.tracking.tracker?.running) return;
        const t0 = performance.now();
        this.tracking.update(t0, width, height);
        this._slamMs = performance.now() - t0;
        debugState.trackingUpdateTimestamp = formatTimestamp();
      } catch (err) {
        arWarn('AlvaAR update failed', err);
        recordLastError(err, 'AlvaAR.update');
      } finally {
        this._slamBusy = false;
      }
    }, 0);
  }

  handleTargetFound(data) {
    if (this.placementStarted || this.transitioning) return;
    if (!this.state.is(STATES.SCAN)) return;
    this.placementStarted = true;
    this.anchor.capture({
      worldMatrix: data?.worldMatrix,
      camera: this.session.camera,
    });
    this.recognition.lockAfterFound();
    this.recognition.detach();
    debugState.mindar = 'STOPPED';
    debugState.target = 'DETACHED';
    debugState.targetState = 'DETACHED';
    debugState.targetVisible = 'DETACHED';
    if (this.slamReady && !this.tracking.tracker?.running) {
      this.tracking.start(this.session.video);
    }
    arLog('MindAR FOUND — snapshot anchor locked, recognition detached, AlvaAR continues');
    this.beginTransition();
  }

  handleTargetLost() {
    if (this.placementStarted) return;
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
    debugState.effect = 'NONE';
    debugState.modelMode = 'WORLD LOCKED';
    debugState.modelVisible = 'VISIBLE';
    debugState.placementStatus = 'FIXED';
    this.state.set(STATES.EXHIBITION);
    this.transitioning = false;
    this.arUI.setScaleMode('huge');
    arLog('AR_VIEW — frozen exhibition, MindAR off, AlvaAR camera tracking');
  }

  prepareExhibition() {
    if (this.exhibition.locked) return;
    this.session.showExhibition(this.exhibition.scene);
    this.resetCameraForExhibition();
    this.exhibition.placeStatic();
    this.anchor.bindExhibition(this.exhibition.anchor);
    if (this.cameraWanted) this.worldTracking.enable();
    this.arUI.setViewpoints(this.exhibition.viewpoints);
    this.arUI.setActiveViewpoint('front');
    debugState.placementStatus = 'FIXED';
    debugState.placementMode = 'EXHIBITION';
    debugState.modelTransformUpdates = this.exhibition.transformUpdates;
    debugState.modelMode = 'WORLD LOCKED';
    debugState.anchor = 'LOCKED';
    arLog('Exhibition model placed and world-locked');
  }

  goToViewpoint(id) {
    const view = this.exhibition.getViewpoint(id);
    if (!view) return;
    if (!this.worldTracking.enabled) {
      this.resetCameraForExhibition();
      this.session.camera.position.copy(view.position);
      this.session.camera.updateMatrixWorld(true);
    } else {
      this.worldTracking.teleportTo(view.position);
    }
    this.arUI.setActiveViewpoint(id);
    arLog(`Viewpoint ${id}`);
  }

  onExhibitionPointer(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!this.state.is(STATES.EXHIBITION) || this.transitioning) return;
    if (!this.exhibition.pads) return;
    const canvas = this.session.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this._pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.session.camera);
    const hits = this._raycaster.intersectObjects(this.exhibition.pads.children, true);
    const id = hits[0]?.object?.userData?.viewpointId;
    if (id) this.goToViewpoint(id);
  }

  resetCameraToOrigin() {
    const camera = this.session.camera;
    camera.matrixAutoUpdate = true;
    if (camera.parent) camera.parent.remove(camera);
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.scale.set(1, 1, 1);
    camera.updateMatrixWorld(true);
  }

  resetCameraForExhibition() {
    const camera = this.session.camera;
    camera.matrixAutoUpdate = true;
    if (camera.parent) camera.parent.remove(camera);
    camera.position.set(0, CONFIG.exhibition.eyeHeight, 0);
    camera.lookAt(0, CONFIG.exhibition.lookY, -CONFIG.exhibition.lookDistance);
    camera.scale.set(1, 1, 1);
    camera.updateMatrixWorld(true);
  }

  async toggleCamera() {
    this.cameraWanted = !this.cameraWanted;
    if (this.state.is(STATES.EXHIBITION) && this.cameraWanted) {
      this.worldTracking.enable();
      if (this.slamReady && !this.tracking.tracker?.running) this.tracking.start(this.session.video);
      arLog('Exhibition camera ON');
    } else {
      this.worldTracking.disable();
      if (this.state.is(STATES.EXHIBITION)) this.resetCameraForExhibition();
      arLog('Exhibition camera OFF');
    }
    debugState.worldTracking = this.cameraWanted
      ? (this.worldTracking.enabled ? 'ACTIVE' : 'INACTIVE')
      : 'OFF';
    this.debugPanel.setWorldTrackingLabel(this.cameraWanted);
    if (DEBUG) this.debugPanel.update();
  }

  simulateTargetFound() {
    if (!DEBUG) return;
    if (!this.state.is(STATES.SCAN) || this.placementStarted) return;
    arLog('Debug: simulating target found');
    debugState.target = 'FOUND';
    debugState.targetState = 'FOUND';
    debugState.lastFoundAt = formatTimestamp();
    debugState.targetFoundAtMs = performance.now();
    debugState.targetFoundCount += 1;
    debugState.targetEventCount += 1;
    debugState.lastTargetEvent = `FOUND ${debugState.lastFoundAt} (simulate)`;
    this.handleTargetFound({});
  }

  async backToScan() {
    arLog('Back to scan');
    this.placementStarted = false;
    this.transitioning = false;
    this.hyperspace.stop();
    this.worldTracking.disable();
    this.tracking.stop();
    try {
      await this.tracking.reset();
    } catch (err) {
      arWarn('AlvaAR reset failed', err);
    }
    this.anchor.clear();
    this.exhibition.hide();
    this.arUI.setScaleMode('huge');
    this.resetCameraToOrigin();
    await this.session.ensureCamera();
    this.session.showLiveCamera();
    this.resetDebugPlacement();
    debugState.mindar = 'SCANNING';
    debugState.target = 'LOST';
    this.scanUI.setTitle(MESSAGES.scan);
    this.state.set(STATES.SCAN);
    if (this.slamReady) this.tracking.start(this.session.video);
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
    debugState.worldTracking = this.cameraWanted ? 'INACTIVE' : 'OFF';
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
    debugState.scaleMode = 'huge';
    debugState.targetVisible = 'NO';
    debugState.cameraGain = 'N/A';
    debugState.cameraTrackingActive = 'NO';
    debugState.renderLoopFps = 'N/A';
    debugState.lastRenderTimestamp = 'N/A';
    debugState.alvaStatus = this.tracking.tracker?.slamStatus
      || (this.slamReady ? 'READY' : 'OFF');
    debugState.alvaInstance = this.slamReady ? 'CREATED' : 'NOT CREATED';
    debugState.alvaRunning = this.tracking.tracker?.running ? 'YES' : 'NO';
    debugState.cameraProvider = 'NONE';
    debugState.cameraSixDof = 'NO';
    debugState.anchor = 'NONE';
    debugState.mindar = 'SCANNING';
    debugState.cameraTracking = 'OFF';
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
    debugState.renderLoopFps = debugState.fps;
    debugState.lastRenderTimestamp = formatTimestamp();
    debugState.alvaFrames = this.tracking.tracker?.framesProcessed ?? 0;
    debugState.alvaRunning = this.tracking.tracker?.running ? 'YES' : 'NO';
    debugState.alvaVideoReady = video ? String(video.readyState) : 'N/A';
    debugState.alvaVideoSize = video && video.videoWidth
      ? `${video.videoWidth}x${video.videoHeight}`
      : 'N/A';
    if (this.slamReady && this.tracking.tracker) {
      debugState.alvaStatus = this.tracking.tracker.slamStatus || debugState.alvaStatus;
    }

    const exhibition = this.state.is(STATES.EXHIBITION) || this.state.is(STATES.TRANSITION);
    debugState.appState = exhibition ? 'AR_VIEW' : (this.state.is(STATES.SCAN) ? 'SCAN' : this.state.value);
    debugState.frameCount = String(this.session.frameTotal);
    if (this.recognition.detached || this.recognition.exhibitionLocked || exhibition) {
      debugState.mindar = 'STOPPED';
      debugState.targetState = 'DETACHED';
      debugState.target = 'DETACHED';
      debugState.targetVisible = 'DETACHED';
      debugState.recognitionState = 'STOPPED';
    } else {
      debugState.mindar = this.recognition.active ? 'LIVE' : 'STOPPED';
      debugState.targetState = this.recognition.found ? 'FOUND' : 'LOST';
      debugState.target = debugState.targetState;
      debugState.targetVisible = this.recognition.found ? 'YES' : 'NO';
    }
    debugState.timeSinceTargetFound = formatAgeSince(debugState.targetFoundAtMs);
    debugState.timeSinceTargetLost = formatAgeSince(debugState.targetLostAtMs);

    const gyro = this.worldTracking.device;
    debugState.gyroSample = gyro.hasSample ? 'YES' : 'NO';
    debugState.gyroAge = formatAgeSince(gyro.lastSampleAt);

    if (this.worldTracking.enabled) {
      const slamLive = Boolean(this.tracking.hasPose);
      const alva = this.tracking.tracker?.slamStatus || (slamLive ? 'TRACKING' : 'LOST');
      debugState.cameraProvider = this.slamReady ? 'alva' : 'none';
      debugState.cameraSixDof = slamLive ? 'YES' : 'NO';
      debugState.cameraGain = slamLive ? 'alva relative pose' : 'HOLD LAST POSE';
      debugState.cameraTrackingActive = slamLive ? 'ACTIVE' : 'HOLD';
      debugState.cameraTracking = slamLive ? 'ACTIVE' : 'HOLD';
      debugState.worldTracking = slamLive ? 'TRACKING' : 'HOLD';
      debugState.referencePose = this.worldTracking.referenceSet ? 'SET' : 'WAITING';
      debugState.cameraPoseValid = slamLive ? 'VALID' : 'INVALID';
      debugState.cameraMoved = this.worldTracking.moved ? 'YES' : 'NO';
      debugState.poseDelta = formatVec3(this.worldTracking.lastDelta);
      debugState.cameraMode = slamLive ? 'ACTIVE' : 'HOLD';
      debugState.alvaStatus = alva === 'TRACKING' ? 'TRACKING' : (alva === 'LOST' ? 'LOST' : alva);
      debugState.lastValidPose = slamLive ? 'CURRENT' : 'HOLD';
      debugState.trackingLost = slamLive ? 'NO' : 'YES';
      debugState.trackingRecovered = slamLive ? 'YES' : 'NO';
    } else {
      debugState.cameraProvider = 'NONE';
      debugState.cameraSixDof = 'NO';
      debugState.cameraTrackingActive = 'NO';
      debugState.cameraTracking = 'OFF';
      debugState.cameraGain = 'N/A';
      debugState.worldTracking = this.cameraWanted ? 'INACTIVE' : 'OFF';
      debugState.cameraPoseValid = 'INVALID';
      debugState.cameraMoved = 'NO';
      debugState.poseDelta = 'N/A';
      debugState.cameraMode = this.state.is(STATES.SCAN) ? 'SCAN' : debugState.cameraMode;
    }

    this.session.camera.updateMatrixWorld(true);
    this.session.camera.matrixWorld.decompose(this._scratchPos, this._scratchQuat, this._scratchScale);
    debugState.cameraPosition = formatVec3(this._scratchPos);
    debugState.cameraWorldPosition = formatVec3(this._scratchPos);
    debugState.finalPosition = debugState.cameraWorldPosition;
    this._euler.setFromQuaternion(this._scratchQuat, 'YXZ');
    debugState.cameraRotation = formatEuler(this._euler);
    debugState.cameraWorldRotation = formatEuler(this._euler);
    const rawPose = this.tracking.getCameraPose();
    if (rawPose) {
      alvaPoseToThreeCamera(
        rawPose,
        this._rawPos,
        this._rawQuat,
        this._rawMat,
        this._rawScratchQuat,
        this._rawVec,
      );
      debugState.rawPosition = formatVec3(this._rawPos);
    } else {
      debugState.rawPosition = 'N/A';
    }

    debugState.modelVisible = this.rig.root.visible ? 'VISIBLE' : 'HIDDEN';
    debugState.modelMode = this.exhibition.locked ? 'WORLD LOCKED' : debugState.modelMode;
    debugState.modelTransformUpdates = this.exhibition.transformUpdates;
    debugState.scaleMode = this.exhibition.scaleMode;
    debugState.anchor = this.anchor.locked ? 'LOCKED' : 'NONE';

    if (this.exhibition.locked) {
      this.exhibition.anchor.matrixWorld.decompose(this._scratchPos, this._scratchQuat, this._scratchScale);
      debugState.modelX = formatScalar(this._scratchPos.x);
      debugState.modelY = formatScalar(this._scratchPos.y);
      debugState.modelZ = formatScalar(this._scratchPos.z);
      debugState.modelWorldPosition = formatVec3(this._scratchPos);
      debugState.modelWorldScale = formatVec3(this._scratchScale);
      this._euler.setFromQuaternion(this._scratchQuat, 'YXZ');
      debugState.modelRotation = formatEuler(this._euler);
      debugState.modelScale = formatScalar(this._scratchScale.y);
      this.session.camera.getWorldPosition(this._camWorld);
      debugState.modelCameraDistance = formatScalar(this._camWorld.distanceTo(this._scratchPos));
    }
    this.debugPanel.update();
    paintFreezeHud();
  }

  _updateFreezeHud(_now) {
    paintFreezeHud();
  }

  fail(message) {
    this.loading.hide();
    this.scanUI.hide();
    this.arUI.hide();
    this.errorUI.show(message);
  }
}
