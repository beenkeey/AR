import * as THREE from 'three';
import { assetUrl, CONFIG } from '../config.js';
import { arDiag, arError, arLog, arWarn } from '../logger.js';
import { bufferByteLength, debugState, formatTimestamp } from '../debugState.js';

async function loadMindImage() {
  if (!window.MINDAR?.IMAGE?.Controller) {
    const url = new URL(assetUrl('vendor/mindar-image.prod.js'), window.location.origin).href;
    await import(/* @vite-ignore */ url);
  }
  const api = window.MINDAR?.IMAGE;
  if (!api?.Controller) {
    throw new Error('MindAR Controller is not available');
  }
  return api;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load target image: ${url}`));
    img.src = url;
  });
}

export class TargetRecognition {
  constructor({ onFound, onLost, onProgress }) {
    this.onFound = onFound;
    this.onLost = onLost;
    this.onProgress = onProgress;
    this.controller = null;
    this.api = null;
    this.video = null;
    this.active = false;
    this.lockRequested = false;
    this.exhibitionLocked = false;
    this.triggerConsumed = false;
    this.detached = false;
    this.found = false;
    this.lastMatrix = null;
    this.postMatrix = new THREE.Matrix4();
    this.mindBuffer = null;
    this.precompiledMindUrl = null;
    this._resetRecognitionCounters();
  }

  _resetRecognitionCounters() {
    this.processVideoCalls = 0;
    this.framesProcessed = 0;
    this.matchFrames = 0;
    this.nullMatrixFrames = 0;
    debugState.processVideoCalls = 0;
    debugState.recognitionFrames = 0;
    debugState.matchFrames = 0;
    debugState.nullMatrixFrames = 0;
    debugState.recognitionState = 'IDLE';
    debugState.targetState = 'LOST';
    debugState.targetFoundCount = 0;
    debugState.targetLostCount = 0;
    debugState.targetEventCount = 0;
    debugState.lastTargetEvent = 'NONE';
    debugState.lastFoundAt = 'N/A';
    debugState.lastLostAt = 'N/A';
    debugState.targetFoundAtMs = null;
    debugState.targetLostAtMs = null;
    debugState.timeSinceTargetFound = 'N/A';
    debugState.timeSinceTargetLost = 'N/A';
  }

  _syncRecognitionDebug() {
    debugState.processVideoCalls = this.processVideoCalls;
    debugState.recognitionFrames = this.framesProcessed;
    debugState.matchFrames = this.matchFrames;
    debugState.nullMatrixFrames = this.nullMatrixFrames;
    debugState.target = this.found ? 'FOUND' : 'LOST';
    if (!this.detached) debugState.targetState = debugState.target;
  }

  async prepare() {
    const precompiled = CONFIG.target.mode === 'PRECOMPILED';
    debugState.targetMode = CONFIG.target.mode;
    debugState.targetImageUrl = precompiled ? CONFIG.target.mindUrl : CONFIG.target.imageUrl;
    debugState.targetStatus = 'N/A';
    debugState.targetImageSize = 'N/A';
    debugState.compilerStatus = precompiled ? 'SKIPPED' : 'IDLE';
    debugState.compilerError = 'N/A';
    debugState.mindBufferSize = 'N/A';
    debugState.compileMs = 'N/A';
    debugState.controllerStatus = 'NOT_READY';
    debugState.controllerError = 'N/A';

    arDiag('TARGET', `mode=${CONFIG.target.mode} image URL ${CONFIG.target.imageUrl}`);
    try {
      this.api = await loadMindImage();
      const image = await loadImage(CONFIG.target.imageUrl);
      debugState.targetStatus = 'LOADED';
      debugState.targetImageSize = `${image.naturalWidth}x${image.naturalHeight}`;
      arDiag('TARGET', `image loaded naturalWidth=${image.naturalWidth} naturalHeight=${image.naturalHeight}`);
      this.onProgress?.('target-loaded', 0);

      if (precompiled) {
        const mindUrl = CONFIG.target.mindUrl;
        arDiag('TARGET', `precompiled mind URL ${mindUrl}`);
        const response = await fetch(mindUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch .mind: ${response.status} ${mindUrl}`);
        }
        const buffer = await response.arrayBuffer();
        debugState.mindBufferSize = `${buffer.byteLength} B`;
        debugState.compilerStatus = 'SKIPPED';
        arDiag('COMPILER', 'compile skipped (precompiled .mind)');
        arDiag('TARGET', `precompiled .mind loaded bytes=${buffer.byteLength}`);
        this.mindBuffer = null;
        this.precompiledMindUrl = mindUrl;
        return;
      }

      if (!this.api.Compiler) {
        throw new Error('MindAR Compiler is not available');
      }

      debugState.compilerStatus = 'RUNNING';
      arDiag('COMPILER', 'compile started');
      this.onProgress?.('compiling', 0);
      const startedAt = performance.now();
      const compiler = new this.api.Compiler();
      await compiler.compileImageTargets([image], (progress) => {
        this.onProgress?.('compiling', progress);
      });
      this.mindBuffer = await compiler.exportData();
      this.precompiledMindUrl = null;
      const elapsed = Math.round(performance.now() - startedAt);
      const bytes = bufferByteLength(this.mindBuffer);
      debugState.compilerStatus = 'DONE';
      debugState.compileMs = `${elapsed} ms`;
      debugState.mindBufferSize = `${bytes} B`;
      arDiag('COMPILER', `compile finished bytes=${bytes} durationMs=${elapsed}`);
      arLog('Image target compiled');
    } catch (err) {
      if (debugState.targetStatus !== 'LOADED') {
        debugState.targetStatus = 'ERROR';
        arDiag('TARGET', `image load failed: ${err?.message || err}`);
      } else if (precompiled) {
        debugState.targetStatus = 'ERROR';
        debugState.compilerStatus = 'SKIPPED';
        debugState.compilerError = String(err?.message || err);
        arDiag('TARGET', `precompiled .mind load failed: ${err?.message || err}`, err);
      } else {
        debugState.compilerStatus = 'ERROR';
        debugState.compilerError = String(err?.message || err);
        arDiag('COMPILER', `compile exception: ${err?.message || err}`, err);
      }
      throw err;
    }
  }

  async start(video) {
    const precompiled = CONFIG.target.mode === 'PRECOMPILED';
    if (!this.api || (!precompiled && !this.mindBuffer) || (precompiled && !this.precompiledMindUrl)) {
      throw new Error('TargetRecognition.prepare() must run first');
    }

    this.video = video;
    this.lockRequested = false;
    this.exhibitionLocked = false;
    this.triggerConsumed = false;
    this.detached = false;
    this.found = false;
    this.lastMatrix = null;
    this._resetRecognitionCounters();
    debugState.mindar = 'SCANNING';
    debugState.target = 'LOST';
    debugState.targetState = 'LOST';
    debugState.targetVisible = 'NO';
    debugState.controllerStatus = 'NOT_READY';
    debugState.controllerError = 'N/A';
    debugState.recognitionState = 'STARTING';
    this._logVideo('controller start');

    if (this.controller) {
      try {
        this.controller.stopProcessVideo();
      } catch {
        /* ignore */
      }
    }

    try {
      this.controller = new this.api.Controller({
        inputWidth: video.videoWidth,
        inputHeight: video.videoHeight,
        warmupTolerance: 4,
        missTolerance: 8,
        maxTrack: 1,
        onUpdate: (data) => this._onUpdate(data),
      });

      let dimensions;
      if (precompiled) {
        arDiag('CONTROLLER', `addImageTargets started url=${this.precompiledMindUrl}`);
        const result = await this.controller.addImageTargets(this.precompiledMindUrl);
        dimensions = result.dimensions;
        arDiag('CONTROLLER', `addImageTargets finished dimensions=${JSON.stringify(dimensions)}`);
      } else {
        arDiag('CONTROLLER', 'addImageTargetsFromBuffer started');
        const result = this.controller.addImageTargetsFromBuffer(this.mindBuffer);
        dimensions = result.dimensions;
        arDiag('CONTROLLER', `addImageTargetsFromBuffer finished dimensions=${JSON.stringify(dimensions)}`);
      }

      const [markerWidth, markerHeight] = dimensions[0];
      const position = new THREE.Vector3(
        markerWidth / 2,
        markerWidth / 2 + (markerHeight - markerWidth) / 2,
        0,
      );
      const scale = new THREE.Vector3(markerWidth, markerWidth, markerWidth);
      this.postMatrix.compose(position, new THREE.Quaternion(), scale);

      try {
        await this.controller.dummyRun(video);
        arDiag('CONTROLLER', 'dummyRun success');
      } catch (err) {
        arWarn('MindAR dummyRun skipped', err);
        arDiag('CONTROLLER', `dummyRun failed: ${err?.message || err}`);
      }

      this.active = true;
      this.processVideoCalls += 1;
      this.controller.processVideo(video);
      debugState.controllerStatus = 'READY';
      debugState.recognitionState = 'PROCESSING';
      this._syncRecognitionDebug();
      arDiag('CONTROLLER', `start success processVideoCalls=${this.processVideoCalls} input=${video.videoWidth}x${video.videoHeight}`);
      arLog('Target recognition started');
    } catch (err) {
      debugState.controllerStatus = 'ERROR';
      debugState.controllerError = String(err?.message || err);
      debugState.recognitionState = 'ERROR';
      arDiag('CONTROLLER', `start failure: ${err?.message || err}`, err);
      throw err;
    }
  }

  getProjectionMatrix() {
    return this.controller?.getProjectionMatrix?.() ?? null;
  }

  lockAfterFound() {
    this.lockRequested = true;
    this.exhibitionLocked = true;
    debugState.recognitionState = 'LOCKED';
  }

  /**
   * One-shot trigger is done. Kill processVideo + worker so Exhibition
   * no longer shares the main thread / GPU / video with MindAR.
   */
  detach() {
    this.active = false;
    this.exhibitionLocked = true;
    this.detached = true;
    debugState.mindar = 'STOPPED';
    debugState.target = 'DETACHED';
    debugState.targetState = 'DETACHED';
    debugState.targetVisible = 'DETACHED';
    debugState.recognitionState = 'STOPPED';
    debugState.controllerStatus = 'STOPPED';
    const controller = this.controller;
    this.controller = null;
    if (!controller) return;
    try {
      controller.onUpdate = () => {};
    } catch {
      /* ignore */
    }
    try {
      controller.stopProcessVideo();
    } catch (err) {
      arWarn('Failed to stop target recognition', err);
    }
    setTimeout(() => {
      try {
        controller.dispose?.();
      } catch (err) {
        arWarn('Failed to dispose MindAR controller', err);
      }
    }, 0);
  }

  stop() {
    this.active = false;
    this.exhibitionLocked = this.exhibitionLocked || this.lockRequested;
    debugState.recognitionState = this.found ? 'FOUND_STOPPED' : 'STOPPED';
    try {
      this.controller?.stopProcessVideo();
    } catch (err) {
      arWarn('Failed to stop target recognition', err);
    }
  }

  _onUpdate(data) {
    if (this.detached || this.exhibitionLocked) return;
    if (data.type === 'processDone') {
      this.framesProcessed += 1;
      debugState.recognitionFrames = this.framesProcessed;
      if (this.framesProcessed === 1 || this.framesProcessed % 30 === 0) {
        arDiag(
          'RECOGNITION',
          `processVideo loop frames=${this.framesProcessed} matches=${this.matchFrames} nullMatrix=${this.nullMatrixFrames} state=${debugState.recognitionState}`,
        );
      }
      return;
    }

    if (!this.active || data.type !== 'updateMatrix') return;
    if (this.lockRequested && this.found) return;

    const { worldMatrix } = data;
    if (worldMatrix) {
      this.matchFrames += 1;
      debugState.matchFrames = this.matchFrames;
      debugState.targetVisible = 'YES';
      this.lastMatrix = worldMatrix.slice();
      if (!this.found) {
        this.found = true;
        debugState.target = 'FOUND';
        debugState.targetState = 'FOUND';
        debugState.recognitionState = 'FOUND';
        debugState.lastFoundAt = formatTimestamp();
        debugState.targetFoundAtMs = performance.now();
        debugState.targetFoundCount += 1;
        debugState.targetEventCount += 1;
        debugState.lastTargetEvent = `FOUND ${debugState.lastFoundAt}`;
        debugState.timeSinceTargetFound = '0.00s';
        arDiag('RECOGNITION', `FOUND at ${debugState.lastFoundAt} matchFrames=${this.matchFrames}`);
        arLog('MindAR target found');
        if (!this.triggerConsumed) {
          this.triggerConsumed = true;
          this.onFound?.({
            worldMatrix: this.lastMatrix,
            postMatrix: this.postMatrix.clone(),
          });
        }
      }
    } else {
      this.nullMatrixFrames += 1;
      debugState.nullMatrixFrames = this.nullMatrixFrames;
      debugState.targetVisible = 'NO';
      if (this.found) {
        this.found = false;
        debugState.target = 'LOST';
        debugState.targetState = 'LOST';
        debugState.recognitionState = 'LOST';
        debugState.lastLostAt = formatTimestamp();
        debugState.targetLostAtMs = performance.now();
        debugState.targetLostCount += 1;
        debugState.targetEventCount += 1;
        debugState.lastTargetEvent = `LOST ${debugState.lastLostAt}`;
        debugState.timeSinceTargetLost = '0.00s';
        arDiag('RECOGNITION', `LOST at ${debugState.lastLostAt} nullMatrixFrames=${this.nullMatrixFrames}`);
        arLog('MindAR target lost');
        if (!this.triggerConsumed) this.onLost?.();
      }
    }
  }

  _logVideo(reason) {
    const video = this.video;
    if (!video) {
      arDiag('VIDEO', `${reason} video=null`);
      return;
    }
    const stream = video.srcObject;
    const active = Boolean(stream?.active ?? stream?.getTracks?.().some((track) => track.readyState === 'live'));
    arDiag(
      'VIDEO',
      `${reason} videoWidth=${video.videoWidth} videoHeight=${video.videoHeight} readyState=${video.readyState} streamActive=${active}`,
    );
  }

  dispose() {
    this.stop();
    try {
      this.controller?.dispose?.();
    } catch (err) {
      arError('TargetRecognition dispose failed', err);
    }
    this.controller = null;
  }
}
