// Playground: avatar principal + controles (intensidad, velocidad, efectos, audio simulado, vista y color).
import { ChispaAvatar } from '../ChispaAvatar.js';
import { ChispaAnimationEngine } from '../engine/ChispaAnimationEngine.js';
import { rasterize } from '../avatar/ChispaRasterizer.js';
import { RENDER_PROFILES } from '../config/renderProfiles.js';

export class ExpressionPlayground {
  constructor({ catalog, hostId = 'lab-stage', pixelId = 'lab-pixels', controls }) {
    this.catalog = catalog; this.controls = controls;
    this.avatar = new ChispaAvatar({ catalog, hostId });
    this.pixel = document.getElementById(pixelId); this.pctx = this.pixel.getContext('2d');
    this.current = 'happy';
  }
  async init() {
    await this.avatar.initializeLive2D();
    this.avatar.audio.setManual(null);
    this.pixelLoop = new ChispaAnimationEngine(() => this._drawPixels()); this.pixelLoop.start();
    this._bind(); this.select('happy');
    return this;
  }
  select(id) { this.current = id; this.avatar.demoExpress(id); this.onSelect && this.onSelect(id); this._info(); }
  _info() {
    const d = this.catalog.expressions[this.current], el = document.getElementById('lab-info');
    if (el) el.innerHTML = `<b>${d.label}</b> <code>${this.current}</code> · tipo: ${{ emotion: 'emocional', operational: 'operativa', auxiliary: 'auxiliar' }[d.kind]}<br>ojos <code>${d.eyes}</code> · boca <code>${d.mouth}</code> · efecto <code>${d.accent}</code> · animación <code>${d.animation}</code>`;
    const j = document.getElementById('lab-json');
    if (j) j.textContent = JSON.stringify(this.lastMsg || {}, null, 2);
  }
  _bind() {
    const $ = (id) => document.getElementById(id), a = this.avatar;
    a.onFaceUpdate((m) => { this.lastMsg = m; const j = $('lab-json'); if (j) j.textContent = JSON.stringify(m, null, 2); });
    $('c-intensity').addEventListener('input', (e) => { a.setOption('intensity', e.target.value / 100); $('v-intensity').textContent = e.target.value + '%'; });
    $('c-speed').addEventListener('input', (e) => { a.setOption('speed', e.target.value / 100); $('v-speed').textContent = (e.target.value / 100).toFixed(2) + '×'; });
    $('c-effects').addEventListener('change', (e) => a.setOption('effects', e.target.checked));
    $('c-audio-on').addEventListener('change', (e) => { a.audio.setManual(e.target.checked ? $('c-audio').value / 100 : null); $('c-audio').disabled = !e.target.checked; });
    $('c-audio').addEventListener('input', (e) => { if ($('c-audio-on').checked) a.audio.setManual(e.target.value / 100); $('v-audio').textContent = e.target.value + '%'; });
    $('c-view').addEventListener('change', (e) => this._view(e.target.value));
    $('c-mono').addEventListener('change', (e) => a.setOption('mono', e.target.checked));
    $('c-replay').addEventListener('click', () => this.select(this.current));
    this._view('desktop');
  }
  _view(id) {
    this.avatar.setOption('renderProfile', id);
    const rp = RENDER_PROFILES[id], small = id !== 'desktop';
    document.getElementById('lab-stage').hidden = small; this.pixel.hidden = !small;
    document.getElementById('lab-view-label').textContent = small ? `${rp.w}×${rp.h}${rp.mono ? ' · monocromo' : ''} · píxeles reales` : 'Escritorio (vectorial)';
    if (small) { this.pixel.width = rp.w; this.pixel.height = rp.h; }
    this.view = id;
  }
  _drawPixels() {
    if (this.view === 'desktop') return;
    const rp = RENDER_PROFILES[this.view], a = this.avatar, mono = rp.mono || a.options.mono;
    const bm = rasterize(a.face.frame({ simplify: rp.simplify, segments: rp.segments }).prims, rp.w, rp.h, { mono });
    const img = this.pctx.createImageData(rp.w, rp.h), pal = a.renderer.palette;
    // color: reproyecta por tinte según primitiva dominante no es necesario en la vista de píxeles: se muestra en blanco/mono
    for (let i = 0; i < bm.data.length; i++) { const v = Math.round(bm.data[i] * 255); img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    this.pctx.putImageData(img, 0, 0);
  }
  destroy() { this.pixelLoop && this.pixelLoop.stop(); this.avatar.destroy(); }
}
