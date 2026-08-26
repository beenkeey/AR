export class LoadingUI {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-loading';
    this.el.innerHTML = `<p class="overlay-title" data-loading-text></p>`;
    this.text = this.el.querySelector('[data-loading-text]');
    this.hide();
  }

  show(message) {
    this.text.textContent = message;
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
