import { assetUrl, CONFIG, MESSAGES } from '../config.js';

export class ScanUI {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-scan';
    this.el.innerHTML = `
      <div class="scan-card">
        <img class="scan-marker" alt="Маркер для сканирования" data-scan-marker />
        <p class="overlay-title" data-scan-title></p>
        <p class="scan-hint" data-scan-hint></p>
      </div>
    `;
    this.title = this.el.querySelector('[data-scan-title]');
    this.hint = this.el.querySelector('[data-scan-hint]');
    this.marker = this.el.querySelector('[data-scan-marker]');
    this.marker.src = CONFIG.target.imageUrl || assetUrl('assets/targets/mindar-card-test.png');
    this.setTitle(MESSAGES.scan);
    this.hint.textContent = MESSAGES.scanHint;
    this.hide();
  }

  setTitle(text) {
    this.title.textContent = text;
  }

  show() {
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
