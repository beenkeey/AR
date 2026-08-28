export class BackButton {
  constructor({ onClick }) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'back-button';
    this.button.textContent = 'НАЗАД';
    this.button.addEventListener('click', onClick);
  }
}

const VIEW_META = {
  front: { icon: '▲' },
  right: { icon: '▶' },
  back: { icon: '▼' },
  left: { icon: '◀' },
  balcony: { icon: '▣' },
};

export class ARUI {
  constructor({ onBack, onViewpoint }) {
    this.el = document.createElement('div');
    this.el.className = 'overlay overlay-ar';
    this._onViewpoint = onViewpoint;
    this._activeId = null;

    this.back = new BackButton({ onClick: onBack });
    this.el.appendChild(this.back.button);

    this.dock = document.createElement('nav');
    this.dock.className = 'viewpoint-dock';
    this.bar = document.createElement('div');
    this.bar.className = 'viewpoint-bar';
    this.dock.appendChild(this.bar);
    this.el.appendChild(this.dock);

    this.hide();
  }

  setViewpoints(items) {
    this.bar.replaceChildren();
    this._activeId = null;
    for (const item of items || []) {
      const meta = VIEW_META[item.id] || { icon: '●' };
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `viewpoint-button${item.id === 'balcony' ? ' is-balcony' : ''}`;
      btn.dataset.id = item.id;
      const icon = document.createElement('span');
      icon.className = 'viewpoint-icon';
      icon.textContent = meta.icon;
      const label = document.createElement('span');
      label.className = 'viewpoint-label';
      label.textContent = item.label;
      btn.append(icon, label);
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        this._onViewpoint?.(item.id);
      });
      this.bar.appendChild(btn);
    }
  }

  setActiveViewpoint(id) {
    this._activeId = id;
    for (const btn of this.bar.querySelectorAll('.viewpoint-button')) {
      btn.classList.toggle('is-active', btn.dataset.id === id);
    }
  }

  setScaleMode(_mode) {}

  setScaleBusy(_busy) {}

  show() {
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
