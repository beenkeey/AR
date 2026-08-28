import { DEBUG } from './config.js';
import { debugState, formatAgeSince, formatTimestamp } from './debugState.js';

let freezeEl = null;
let heartbeatTimer = null;

export function recordLastError(err, source) {
  const msg = err?.stack || err?.message || String(err || 'unknown');
  debugState.lastError = `${formatTimestamp()} ${source}: ${String(msg).replace(/\s+/g, ' ')}`.slice(0, 220);
}

export function startWatchdog(el) {
  freezeEl = el;
  if (!DEBUG || heartbeatTimer) return;
  heartbeatTimer = window.setInterval(() => {
    debugState.heartbeat = (Number(debugState.heartbeat) || 0) + 1;
    if (debugState.alvaBusy === 'YES') {
      debugState.alvaBusyAge = formatAgeSince(debugState.alvaBusySince);
    }
    debugState.timeSinceTargetFound = formatAgeSince(debugState.targetFoundAtMs);
    debugState.timeSinceTargetLost = formatAgeSince(debugState.targetLostAtMs);
    paintFreezeHud();
  }, 500);
}

export function paintFreezeHud() {
  if (!DEBUG || !freezeEl) return;
  freezeEl.hidden = false;
  freezeEl.textContent = [
    `HEARTBEAT ${debugState.heartbeat}`,
    `FRAME ${debugState.frameCount}  FPS ${debugState.renderLoopFps}`,
    `VIDEO TIME ${debugState.videoCurrentTime}  FRAME ${debugState.videoFrameCount}`,
    `VIDEO PAUSED ${debugState.videoPaused}  ENDED ${debugState.videoEnded}  READY ${debugState.videoReady}`,
    `TARGET STATE ${debugState.targetState}`,
    `TARGET FOUND ${debugState.targetFoundCount}  LOST ${debugState.targetLostCount}  EVENTS ${debugState.targetEventCount}`,
    `LAST TARGET EVENT ${debugState.lastTargetEvent}`,
    `SINCE FOUND ${debugState.timeSinceTargetFound}  SINCE LOST ${debugState.timeSinceTargetLost}`,
    `ALVA STATE ${debugState.alvaStatus}  LAST RESULT ${debugState.alvaLastResult}`,
    `ALVA RUNNING ${debugState.alvaRunning}`,
    `ALVA POINTS ${debugState.alvaPoints}`,
    `ALVA VIDEO READY ${debugState.alvaVideoReady}`,
    `ALVA VIDEO SIZE ${debugState.alvaVideoSize}`,
    `ALVA BUSY ${debugState.alvaBusy}  BUSY AGE ${debugState.alvaBusyAge}`,
    `ALVA CALLS ${debugState.alvaCalls}  START ${debugState.lastAlvaStart}  END ${debugState.lastAlvaEnd}`,
    `LAST ALVA DUR ${debugState.lastAlvaDuration}  MAX ${debugState.maxAlvaDuration}`,
    `POSE VALID ${debugState.cameraPoseValid}`,
    `CAMERA POS ${debugState.cameraWorldPosition}`,
    `CAMERA ROT ${debugState.cameraWorldRotation}`,
    `RAW POS ${debugState.rawPosition}`,
    `FINAL POS ${debugState.finalPosition}`,
    `GYRO SAMPLE ${debugState.gyroSample}  GYRO AGE ${debugState.gyroAge}`,
    `GYRO PERMISSION ${debugState.gyroPermission}  LISTENER ${debugState.gyroListener}  EVENT ${debugState.gyroEvent}`,
    `LAST ONFRAME ${debugState.lastOnFrame}`,
    `LAST RENDER ${debugState.lastRender}`,
    `RENDER ENTER ${debugState.renderEnter}  EXIT ${debugState.renderExit}`,
    `MODEL TRANSFORM UPDATES ${debugState.modelTransformUpdates}`,
    `LAST ERROR ${debugState.lastError}`,
  ].join('\n');
}
