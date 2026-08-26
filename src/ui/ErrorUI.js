export class ErrorUI {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-error';
    this.el.innerHTML = `<p class="overlay-title" data-error-text></p>`;
    this.text = this.el.querySelector('[data-error-text]');
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
