import { CONFIG } from '../config.js';

/**
 * Fullscreen 2D hyperspace jump. Covers the SCAN → EXHIBITION cut.
 * No extra dependencies; sized for iPhone Safari.
 */
export class HyperSpeedEffect {
  constructor(container) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hyperspace-overlay';
    this.canvas.hidden = true;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.stars = [];
    this.running = false;
    this._raf = 0;
    this._onResize = () => this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const height = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  _spawn(count) {
    this.stars.length = 0;
    for (let i = 0; i < count; i += 1) {
      this.stars.push(this._star(true));
    }
  }

  _star(randomRadius) {
    return {
      angle: Math.random() * Math.PI * 2,
      radius: randomRadius ? Math.random() * 0.22 : Math.random() * 0.04,
      speed: 0.55 + Math.random() * 1.35,
      length: 0.018 + Math.random() * 0.07,
      width: 0.8 + Math.random() * 2.4,
      shade: Math.random() < 0.62 ? 0 : 1,
    };
  }

  play({ durationMs = 1900, onPrepare, onPeak, prepareAt = 0.07, peakAt = 0.74 } = {}) {
    this.stop();
    this.running = true;
    this.resize();
    window.addEventListener('resize', this._onResize);
    const count = CONFIG.performance.weak ? 72 : 150;
    this._spawn(count);
    this.canvas.hidden = false;
    this.canvas.style.opacity = '1';

    const start = performance.now();
    let prepared = false;
    let peaked = false;

    return new Promise((resolve) => {
      const tick = (now) => {
        if (!this.running) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - start) / durationMs);
        if (!prepared && t >= prepareAt) {
          prepared = true;
          onPrepare?.();
        }
        if (!peaked && t >= peakAt) {
          peaked = true;
          onPeak?.();
        }
        this._draw(t);
        if (t < 1) {
          this._raf = requestAnimationFrame(tick);
        } else {
          this.running = false;
          this.canvas.hidden = true;
          window.removeEventListener('resize', this._onResize);
          resolve();
        }
      };
      this._raf = requestAnimationFrame(tick);
    });
  }

  _draw(t) {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const diag = Math.hypot(cx, cy);
    const accel = 1 + t * t * 14;
    const black = smoothstep(0.58, 1, t);

    ctx.fillStyle = `rgba(0, 2, 10, ${0.18 + black * 0.82})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const star of this.stars) {
      star.radius += star.speed * accel * 0.016;
      if (star.radius > 1.35) Object.assign(star, this._star(false));

      const r0 = star.radius * diag;
      const r1 = (star.radius + star.length * (1 + t * 3)) * diag;
      const x0 = cx + Math.cos(star.angle) * r0;
      const y0 = cy + Math.sin(star.angle) * r0;
      const x1 = cx + Math.cos(star.angle) * r1;
      const y1 = cy + Math.sin(star.angle) * r1;
      const alpha = Math.min(1, 0.25 + star.radius * 0.9) * (1 - black * 0.15);
      ctx.strokeStyle = star.shade ? `rgba(180, 220, 255, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = star.width * (1 + t * 1.8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();

    const flash = Math.sin(Math.min(1, t / 0.55) * Math.PI) * 0.22;
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(210, 235, 255, ${flash * (1 - black)})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (black > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${black})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    window.removeEventListener('resize', this._onResize);
    this.canvas.hidden = true;
  }
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
