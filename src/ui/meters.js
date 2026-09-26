export class Meter {
  constructor(canvas, opts) {
    const o = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.label = o.label || '';
    this.color = o.color || '#4cc9f0';
    this.peak = -100; this.rms = -100; this.clipUntil = 0;
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width; this.h = rect.height;
  }
  update(data) {
    const toDb = (v) => (v <= 0 ? -100 : Math.max(-100, 20 * Math.log10(v)));
    const peakDb = toDb(data.peak);
    const rmsDb = toDb(data.rms);
    this.peak = Math.max(peakDb, this.peak - 1.5);
    this.rms = Math.max(rmsDb, this.rms - 2.0);
    if (data.clip) this.clipUntil = performance.now() + 1500;
  }
  _tick() {
    const c = this.ctx; const w = this.w; const h = this.h;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#0b1220'; c.fillRect(0, 0, w, h);
    const dbMin = -60; const dbMax = 0;
    const yForDb = (db) => {
      let t = (db - dbMin) / (dbMax - dbMin);
      if (t < 0) t = 0; if (t > 1) t = 1;
      return h - t * h;
    };
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
    const lines = [-60, -48, -36, -24, -12, -6, -3];
    for (let i = 0; i < lines.length; i++) {
      const y = yForDb(lines[i]);
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    if (this.rms > -100) {
      const y = yForDb(this.rms);
      const g = c.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, this.color); g.addColorStop(1, '#a2d2ff');
      c.fillStyle = g; c.fillRect(0, y, w, h - y);
    }
    if (this.peak > -100) {
      const y = yForDb(this.peak);
      c.fillStyle = this.peak >= -0.1 ? '#ff5d5d' : '#e0fbff';
      c.fillRect(0, Math.max(0, y - 2), w, 2);
    }
    if (performance.now() < this.clipUntil) {
      c.fillStyle = 'rgba(255, 60, 60, 0.9)';
      c.fillRect(0, 0, 6, h);
    }
    requestAnimationFrame(this._tick);
  }
}