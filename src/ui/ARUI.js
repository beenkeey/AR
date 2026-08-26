export class BackButton {
  constructor({ onClick }) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'back-button';
    this.button.textContent = '← Назад к сканированию';
    this.button.addEventListener('click', onClick);
  }
}

export class ARUI {
  constructor({ onBack }) {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-ar';
    this.back = new BackButton({ onClick: onBack });
    this.el.appendChild(this.back.button);
    this.hide();
  }

  show() {
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
