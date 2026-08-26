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
      <div class="debug-row"><span>MINDAR</span><strong data-k="target">N/A</strong></div>
      <div class="debug-row"><span>EFFECT</span><strong data-k="effect">N/A</strong></div>
      <div class="debug-row"><span>MODEL MODE</span><strong data-k="modelMode">N/A</strong></div>
      <div class="debug-row"><span>MODEL UPDATES</span><strong data-k="modelTransformUpdates">N/A</strong></div>
      <div class="debug-row"><span>CAMERA</span><strong data-k="cameraMode">N/A</strong></div>
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
