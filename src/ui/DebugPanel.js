import { DEBUG, WORLD_TRACKING_ENABLED } from '../config.js';
import { debugState } from '../debugState.js';

const TEST_COPY = `SCAN → HYPERSPACE → EXHIBITION
1. Scan the target.
2. Watch the jump.
3. Walk around the tower.
4. Model must stay still.
5. Back → scan again.

PASS: static model, moving camera.
FAIL: shake / follow / disappear.`;

export class DebugPanel {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'debug-root';
    this.el.hidden = !DEBUG;

    this.test = document.createElement('pre');
    this.test.className = 'debug-test';
    this.test.textContent = TEST_COPY;

    this.panel = document.createElement('div');
    this.panel.className = 'debug-panel';
    this.panel.innerHTML = `
      <div class="debug-row"><span>STATE</span><strong data-k="appState">N/A</strong></div>
      <div class="debug-row"><span>MINDAR</span><strong data-k="mindar">N/A</strong></div>
      <div class="debug-row"><span>TARGET</span><strong data-k="targetVisible">N/A</strong></div>
      <div class="debug-row"><span>ALVA</span><strong data-k="alvaStatus">N/A</strong></div>
      <div class="debug-row"><span>POSE</span><strong data-k="cameraPoseValid">N/A</strong></div>
      <div class="debug-row"><span>ANCHOR</span><strong data-k="anchor">N/A</strong></div>
      <div class="debug-row"><span>CAMERA</span><strong data-k="cameraTracking">N/A</strong></div>
      <div class="debug-row"><span>CAMERA PROVIDER</span><strong data-k="cameraProvider">N/A</strong></div>
      <div class="debug-row"><span>6DoF</span><strong data-k="cameraSixDof">N/A</strong></div>
      <div class="debug-row"><span>WORLD</span><strong data-k="modelMode">N/A</strong></div>
      <div class="debug-row"><span>MODEL TRANSFORM UPDATES</span><strong data-k="modelTransformUpdates">N/A</strong></div>
      <div class="debug-row"><span>CAMERA POSITION</span><strong data-k="cameraWorldPosition">N/A</strong></div>
      <div class="debug-row"><span>CAMERA ROTATION</span><strong data-k="cameraWorldRotation">N/A</strong></div>
      <div class="debug-row"><span>FPS</span><strong data-k="renderLoopFps">N/A</strong></div>
      <div class="debug-row"><span>FRAME COUNT</span><strong data-k="frameCount">N/A</strong></div>
      <div class="debug-row"><span>LAST RENDER</span><strong data-k="lastRenderTimestamp">N/A</strong></div>
      <div class="debug-row"><span>CAMERA UPDATE</span><strong data-k="cameraUpdateTimestamp">N/A</strong></div>
      <div class="debug-row"><span>TRACKING UPDATE</span><strong data-k="trackingUpdateTimestamp">N/A</strong></div>
      <div class="debug-row"><span>LAST VALID POSE</span><strong data-k="lastValidPose">N/A</strong></div>
      <div class="debug-row"><span>TRACKING LOST</span><strong data-k="trackingLost">N/A</strong></div>
      <div class="debug-row"><span>TRACKING RECOVERED</span><strong data-k="trackingRecovered">N/A</strong></div>
      <div class="debug-row"><span>VIDEO TIME</span><strong data-k="videoCurrentTime">N/A</strong></div>
      <div class="debug-h">APIS</div>
      <div class="debug-row"><span>WEBXR AVAILABLE</span><strong data-k="webxrAvailable">N/A</strong></div>
      <div class="debug-row"><span>IMMERSIVE AR</span><strong data-k="immersiveAR">N/A</strong></div>
      <div class="debug-row"><span>DEVICE ORIENTATION</span><strong data-k="deviceOrientationAvailable">N/A</strong></div>
      <div class="debug-row"><span>DEVICE MOTION</span><strong data-k="deviceMotionAvailable">N/A</strong></div>
      <div class="debug-row"><span>CAMERA AVAILABLE</span><strong data-k="cameraAvailable">N/A</strong></div>
      <div class="debug-row"><span>ORIENTATION PERMISSION</span><strong data-k="orientationPermission">N/A</strong></div>
      <div class="debug-row"><span>MOTION PERMISSION</span><strong data-k="motionPermission">N/A</strong></div>
      <div class="debug-h">RIG</div>
      <div class="debug-row"><span>RIG</span><strong data-k="rigSource">N/A</strong></div>
      <div class="debug-row"><span>TRIANGLES</span><strong data-k="rigTriangles">N/A</strong></div>
      <div class="debug-row"><span>HEIGHT</span><strong data-k="rigHeight">N/A</strong></div>
      <div class="debug-h">SCAN</div>
      <div class="debug-row"><span>TARGET MODE</span><strong data-k="targetMode">N/A</strong></div>
      <div class="debug-row"><span>FRAMES</span><strong data-k="recognitionFrames">N/A</strong></div>
      <div class="debug-row"><span>MATCHES</span><strong data-k="matchFrames">N/A</strong></div>
      <div class="debug-row"><span>CONTROLLER</span><strong data-k="controllerStatus">N/A</strong></div>
      <div class="debug-h">EXHIBITION MODEL</div>
      <div class="debug-row"><span>visible</span><strong data-k="modelVisible">N/A</strong></div>
      <div class="debug-row"><span>POSITION</span><strong data-k="modelWorldPosition">N/A</strong></div>
      <div class="debug-row"><span>ROTATION</span><strong data-k="modelRotation">N/A</strong></div>
      <div class="debug-row"><span>SCALE</span><strong data-k="modelWorldScale">N/A</strong></div>
      <div class="debug-row"><span>DISTANCE</span><strong data-k="modelCameraDistance">N/A</strong></div>
      <div class="debug-h">CAMERA</div>
      <div class="debug-row"><span>ALVAAR</span><strong data-k="alvaStatus">N/A</strong></div>
      <div class="debug-row"><span>FRAMES</span><strong data-k="alvaFrames">N/A</strong></div>
      <div class="debug-row"><span>POSE</span><strong data-k="cameraPoseValid">N/A</strong></div>
      <div class="debug-row"><span>MOVED</span><strong data-k="cameraMoved">N/A</strong></div>
      <div class="debug-row"><span>POSITION</span><strong data-k="cameraWorldPosition">N/A</strong></div>
      <div class="debug-row"><span>ROTATION</span><strong data-k="cameraWorldRotation">N/A</strong></div>
      <div class="debug-row"><span>FPS</span><strong data-k="fps">N/A</strong></div>
      <div class="debug-h">MINDAR DETAIL</div>
      <div class="debug-row"><span>image URL</span><strong data-k="targetImageUrl">N/A</strong></div>
      <div class="debug-row"><span>compiler</span><strong data-k="compilerStatus">N/A</strong></div>
      <div class="debug-row"><span>VIDEO ATTR</span><strong data-k="videoAttrSize">N/A</strong></div>
      <div class="debug-row"><span>VIDEO REAL</span><strong data-k="videoRealSize">N/A</strong></div>
    `;

    this.reset = document.createElement('button');
    this.reset.type = 'button';
    this.reset.textContent = 'RESET TEST';
    this.panel.appendChild(this.reset);

    this.simulate = document.createElement('button');
    this.simulate.type = 'button';
    this.simulate.textContent = 'Simulate target found';
    this.panel.appendChild(this.simulate);

    this.wtToggle = document.createElement('button');
    this.wtToggle.type = 'button';
    this.wtToggle.textContent = WORLD_TRACKING_ENABLED ? 'WORLD TRACKING OFF' : 'WORLD TRACKING ON';
    this.panel.appendChild(this.wtToggle);

    this.el.appendChild(this.test);
    this.el.appendChild(this.panel);
  }

  onReset(fn) {
    this.reset.addEventListener('click', fn);
  }

  onSimulate(fn) {
    this.simulate.addEventListener('click', fn);
  }

  onToggleWorldTracking(fn) {
    this.wtToggle.addEventListener('click', fn);
  }

  setWorldTrackingLabel(enabled) {
    this.wtToggle.textContent = enabled ? 'WORLD TRACKING OFF' : 'WORLD TRACKING ON';
  }

  update() {
    if (this.el.hidden) return;
    for (const node of this.panel.querySelectorAll('[data-k]')) {
      const key = node.getAttribute('data-k');
      node.textContent = String(debugState[key] ?? 'N/A');
    }
  }
}
