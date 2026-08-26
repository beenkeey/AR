export class ScanUI {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-scan';
    this.el.innerHTML = `
      <p class="overlay-title" data-scan-title></p>
    `;
    this.title = this.el.querySelector('[data-scan-title]');
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
