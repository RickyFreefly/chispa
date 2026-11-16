// ChispaAnimationEngine: bucle de cuadros. Un único rAF, dt acotado, pausa con la pestaña oculta, destroy() limpia todo.
export class ChispaAnimationEngine {
  constructor(onFrame, { raf = (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame.bind(globalThis) : null), caf = (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame.bind(globalThis) : null), now = () => performance.now() } = {}) {
    this.onFrame = onFrame; this.raf = raf; this.caf = caf; this.now = now;
    this.id = 0; this.running = false; this.last = 0;
    this._vis = () => { if (typeof document !== 'undefined' && !document.hidden) this.last = this.now(); };
    this._loop = (t) => {
      if (!this.running) return;
      const n = this.now(); const dt = (n - this.last) / 1000; this.last = n;
      this.onFrame(dt, n);
      this.id = this.raf(this._loop);
    };
  }
  start() {
    if (this.running || !this.raf) return;
    this.running = true; this.last = this.now();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._vis);
    this.id = this.raf(this._loop);
  }
  stop() {
    this.running = false;
    if (this.id && this.caf) this.caf(this.id);
    this.id = 0;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._vis);
  }
}
