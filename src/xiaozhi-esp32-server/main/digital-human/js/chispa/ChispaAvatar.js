// ChispaAvatar: fachada que une máquina de estados + motor de expresiones + cara + audio + render.
// Mantiene la API heredada (initializeLive2D, startTalking, triggerEmotionAction...) que usa el resto de la página.
import { ChispaStateMachine } from './engine/ChispaStateMachine.js';
import { ChispaExpressionEngine } from './engine/ChispaExpressionEngine.js';
import { ChispaAnimationEngine } from './engine/ChispaAnimationEngine.js';
import { ChispaAudioReactive } from './engine/ChispaAudioReactive.js';
import { ChispaEventAdapter } from './engine/ChispaEventAdapter.js?v=4';
import { toFaceUpdate } from './engine/ChispaFaceProtocol.js';
import { ChispaFace } from './avatar/ChispaFace.js';
import { ChispaFaceRenderer } from './avatar/ChispaFaceRenderer.js';
import { ChispaPersonaConfig } from './config/personalityProfiles.js';
import { paletteFor, RENDER_PROFILES } from './config/renderProfiles.js';
import { TOKENS } from './config/animationTokens.js';

export async function loadCatalog(url = new URL('./config/expressions.json', import.meta.url)) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('No se pudo cargar expressions.json');
  return r.json();
}

export class ChispaAvatar {
  constructor({ catalog = null, hostId = 'chispa-stage' } = {}) {
    this.catalog = catalog; this.hostId = hostId;
    this.persona = new ChispaPersonaConfig();
    this.live2dModel = null; this.isTalking = false;
    this.options = { speed: 1, effects: true, intensity: 1, mono: false, renderProfile: 'desktop' };
    this.reposo = false;
    this.demo = null;                                   // { fs } cuando se previsualiza una expresión (no es un evento real)
    this.listeners = new Set(); this._lastKey = '';
    this.reduced = (typeof matchMedia !== 'undefined') ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  }
  async initializeLive2D() {                            // nombre heredado: monta el avatar
    if (!this.catalog) this.catalog = await loadCatalog();
    this.host = document.getElementById(this.hostId);
    if (!this.host) throw new Error(`No existe #${this.hostId}`);
    this.machine = new ChispaStateMachine({ catalog: this.catalog, processingTimeoutMs: TOKENS.processingTimeoutMs });
    this.engine = new ChispaExpressionEngine(this.catalog);
    this.audio = new ChispaAudioReactive();
    this.adapter = new ChispaEventAdapter(this);
    this.face = new ChispaFace({ segments: RENDER_PROFILES.desktop.segments });
    this.renderer = new ChispaFaceRenderer(this.host, { palette: paletteFor(this.catalog.design, false), background: this.catalog.design.background });
    this.loop = new ChispaAnimationEngine((dt, now) => this._frame(dt, now));
    this._applyRenderProfile();
    this.face.setTarget(this._resolve(), { snap: true });
    this.live2dModel = true;
    this.loop.start();
    return true;
  }
  // ---- eventos reales (los llaman controller.js y websocket.js) ----
  setFact(k, v) { this.machine.setFact(k, v); }
  // Reposo por voz («adiós chispa» / «hola chispa»): la conexión sigue abierta pero Chispa no responde hasta que la llamen.
  setReposo(v) {
    v = !!v; if (v === this.reposo) return;
    this.reposo = v;
    if (v) this.machine.setAux('sleep');                                                // cara durmiendo con «z z z»
    else { if (this.machine.aux === 'sleep') this.machine.setAux(null); this.pulse('happy', 1400); }   // despierta con una sonrisa
    this.listeners.forEach((fn) => fn(this.snapshot()));
  }
  pulse(mode, ms) { if (mode === 'error') this.machine.raiseError(ms || TOKENS.errorDefaultMs); else if (this.catalog.expressions[mode]) this.machine.express(mode, { durationMs: ms }); }
  startTalking() { if (this.isTalking) return; this.isTalking = true; this.initializeAudioAnalyzer(); this.machine.setFact('speaking', true); }
  stopTalking() { this.isTalking = false; this.machine.setFact('speaking', false); this.machine.setFact('processing', false); }
  triggerEmotionAction(emotion) { return this.adapter.fromEmoji(emotion); }
  handleBackendMessage(msg) { return this.adapter.fromBackend(msg); }
  initializeAudioAnalyzer() {
    try {
      const an = window.chatApp?.audioPlayer?.streamingContext?.getAnalyser?.();
      return this.audio.attach(an || null);
    } catch (e) { return false; }
  }
  async switchModel() { return true; }
  // ---- demo / Expression Lab (no son eventos reales) ----
  demoExpress(id) { this.demo = { fs: this.engine.resolveStatic(id, { intensity: this.options.intensity }), id, restart: true }; }
  endDemo() { this.demo = null; this.audio.setManual(null); }
  get demoActive() { return !!this.demo; }
  setOption(k, v) { this.options[k] = v; if (k === 'mono' || k === 'renderProfile') this._applyRenderProfile(); if (k === 'intensity' && this.demo) this.demoExpress(this.demo.id); }
  onFaceUpdate(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  snapshot() { return this.demo ? { demo: true, id: this.demo.id } : this.machine.snapshot(); }
  destroy() { this.loop && this.loop.stop(); this.renderer && this.renderer.destroy(); this.listeners.clear(); this.live2dModel = null; }

  _applyRenderProfile() {
    const rp = RENDER_PROFILES[this.options.renderProfile] || RENDER_PROFILES.desktop;
    this.rp = rp;
    this.renderer.setPalette(paletteFor(this.catalog.design, this.options.mono || rp.mono));
    this.face.segments = rp.segments;
  }
  _resolve() {
    if (this.demo) return this.demo.fs;
    return this.engine.resolve(this.machine.snapshot(), { intensity: this.options.intensity, expressiveness: this.persona.profile.expressiveness });
  }
  _frame(dt, now) {
    this.machine.tick(now);
    const fs = this._resolve();
    const key = `${fs.expression}|${fs.operationalState}|${fs.intensity.toFixed(2)}|${fs.epoch}|${this.demo ? this.demo.fs.mouth : ''}`;
    if (key !== this._lastKey || (this.demo && this.demo.restart)) {
      this._lastKey = key;
      this.face.setTarget(fs, { restart: !!(this.demo && this.demo.restart) });
      if (this.demo) this.demo.restart = false;
      if (this.listeners.size) { const msg = toFaceUpdate(fs); this.listeners.forEach((fn) => fn(msg)); }
    }
    const speaking = fs.operationalState === 'speaking' || fs.mouth === 'talking';
    const level = speaking || this.audio.manual != null ? this.audio.update(dt) : (this.audio.level = 0);
    this.face.update(dt, { level, audioAvailable: this.audio.available, reduced: !!this.reduced.matches, effects: this.options.effects && this.persona.profile.effects, speed: this.options.speed });
    this.renderer.render(this.face.frame({ simplify: this.rp.simplify }));
    if (this.host) this.host.dataset.state = fs.operationalState;
    if (this.host) this.host.dataset.expression = fs.expression;
  }
}
