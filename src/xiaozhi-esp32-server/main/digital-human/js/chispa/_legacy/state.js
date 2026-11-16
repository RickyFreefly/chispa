// Máquina de estados de Chispa + controlador de emociones.
// Capa 1 (actividad, derivada de HECHOS reales): offline | idle | listening | thinking | speaking
// Capa 2 (ánimo/gesto transitorio): none | happy | surprised | teaching | encouraging | error
// El estado visible (los 10 de la especificación) se obtiene combinando ambas capas.

export const ACTIVITIES = ['offline', 'idle', 'listening', 'thinking', 'speaking'];
export const MOODS = ['happy', 'surprised', 'teaching', 'encouraging', 'error'];
export const ALL_STATES = ['idle', 'listening', 'thinking', 'speaking', 'happy', 'surprised', 'teaching', 'encouraging', 'error', 'offline'];

export const LABELS = {
  offline: 'Desconectada', idle: 'Disponible', listening: 'Escuchando', thinking: 'Pensando', speaking: 'Hablando',
  happy: 'Feliz', surprised: 'Sorprendida', teaching: 'Enseñando', encouraging: 'Animando', error: 'Confundida'
};
const MOOD_PRIORITY = { error: 4, surprised: 3, happy: 2, encouraging: 2, teaching: 1 };
// Transiciones permitidas entre actividades (cualquier otra se redirige a 'idle' como paso intermedio).
const ALLOWED = {
  offline: ['offline', 'idle', 'listening'],
  idle: ['idle', 'listening', 'thinking', 'speaking', 'offline'],
  listening: ['listening', 'idle', 'thinking', 'speaking', 'offline'],
  thinking: ['thinking', 'speaking', 'listening', 'idle', 'offline'],
  speaking: ['speaking', 'listening', 'idle', 'thinking', 'offline']
};
const MIN_DWELL_MS = 220;

export class ChispaStateMachine extends EventTarget {
  constructor() {
    super();
    this.facts = { connected: false, mic: false, processing: false, speaking: false };
    this.activity = 'offline';
    this.mood = null; this.moodUntil = 0; this.moodSticky = false;
    this.since = performance.now();
    this.demo = null;          // { state } cuando el modo demo fuerza un estado
    this.timer = null;
  }
  // ---- hechos reales (los alimenta la app, nunca el modo demo) ----
  setFact(key, value) {
    if (this.facts[key] === value) return;
    this.facts[key] = value;
    if (key === 'processing') { clearTimeout(this._pt); if (value) this._pt = setTimeout(() => this.setFact('processing', false), 25000); }  // seguro anti-bloqueo
    if (key === 'connected' && !value) { this.facts.mic = false; this.facts.processing = false; this.facts.speaking = false; }
    if (key === 'connected' && value) this.pulse('happy', 1800);       // saludo al conectar (evento real)
    if (key === 'processing' && value) this.clearMood('happy');
    this._recompute();
  }
  pulse(mood, ms = 2500) {
    if (!MOODS.includes(mood)) return;
    const cur = this.mood ? MOOD_PRIORITY[this.mood] : -1;
    if (this.moodSticky || MOOD_PRIORITY[mood] < cur && performance.now() < this.moodUntil) return;
    this.mood = mood; this.moodUntil = performance.now() + ms; this.moodSticky = false;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.mood = null; this._emit(); }, ms);
    this._emit();
  }
  clearMood(only) { if (!this.mood || (only && this.mood !== only)) return; this.mood = null; clearTimeout(this.timer); this._emit(); }
  // ---- demo (claramente separado de la operación real) ----
  setDemo(state) { this.demo = state ? { state } : null; this._emit(); }
  get demoActive() { return !!this.demo; }
  _derive() {
    const f = this.facts;
    if (!f.connected) return 'offline';
    if (f.speaking) return 'speaking';
    if (f.processing) return 'thinking';
    if (f.mic) return 'listening';
    return 'idle';
  }
  _recompute() {
    const want = this._derive(), now = performance.now();
    if (want === this.activity) return;
    if (now - this.since < MIN_DWELL_MS && this.activity !== 'offline' && want !== 'offline') {   // evita parpadeos de estado
      clearTimeout(this._rt); this._rt = setTimeout(() => this._recompute(), MIN_DWELL_MS); return;
    }
    this.activity = ALLOWED[this.activity].includes(want) ? want : 'idle';
    this.since = now;
    this._emit();
    if (this.activity !== want) this._recompute();
  }
  // Estado efectivo: { activity, mood, label, demo }
  get state() {
    if (this.demo) {
      const s = this.demo.state;
      return MOODS.includes(s)
        ? { activity: 'idle', mood: s, name: s, label: LABELS[s], demo: true }
        : { activity: s, mood: null, name: s, label: LABELS[s], demo: true };
    }
    const name = this.mood || this.activity;
    return { activity: this.activity, mood: this.mood, name, label: this.mood ? LABELS[this.mood] : LABELS[this.activity], demo: false };
  }
  _emit() { this.dispatchEvent(new CustomEvent('change', { detail: this.state })); }
}

// ---- ChispaEmotionController: estado -> pose objetivo (parámetros del rostro/cuerpo) ----
const BASE = {
  eyeScale: 1, lidTop: 0, cheek: 0, gazeX: 0, gazeY: 0,
  browYL: 0, browYR: 0, browRL: 0, browRR: 0,
  mouthOpen: 0, smile: 0.3, mouthW: 1, blush: 0.15,
  armL: 4, armR: 4, tilt: 0, lean: 0, glow: 1, bolt: 0.7, floatAmp: 1,
  dots: 0, zzz: 0, question: 0
};
const ACT = {
  offline: { glow: 0.22, lidTop: 0.88, smile: 0.05, floatAmp: 0.25, bolt: 0.1, zzz: 1, blush: 0, tilt: 4, armL: 0, armR: 0 },
  idle: {},
  listening: { eyeScale: 1.12, browYL: -4, browYR: -4, tilt: -6, lean: 1, smile: 0.2, bolt: 0.9 },
  thinking: { eyeScale: 0.95, gazeX: 0.7, gazeY: -0.8, browYL: 3, browYR: -5, browRL: 0.4, browRR: 0.6, smile: -0.05, mouthOpen: 0.08, mouthW: 0.55, tilt: 6, dots: 1, bolt: 1 },
  speaking: { smile: 0.25, bolt: 0.85 }
};
const MOOD = {
  happy: { cheek: 0.8, smile: 1, blush: 0.75, browYL: -3, browYR: -3, armL: 150, armR: 150, bolt: 1, eyeScale: 1.05 },
  surprised: { eyeScale: 1.3, browYL: -10, browYR: -10, mouthOpen: 0.7, mouthW: 0.5, smile: 0, lean: -1, armL: 40, armR: 40, blush: 0 },
  teaching: { smile: 0.55, browYL: -2, browYR: -2, armR: 100, bolt: 1 },
  encouraging: { smile: 0.95, blush: 0.4, armL: 140, tilt: 4, bolt: 1, browYL: -3, browYR: -3 },
  error: { browYL: -6, browYR: 3, browRL: 0.7, browRR: -0.2, smile: -0.4, mouthW: 0.7, tilt: -6, glow: 0.85, gazeX: -0.4, question: 1, blush: 0 }
};

export class ChispaEmotionController {
  poseFor(stateInfo, profile) {
    const p = Object.assign({}, BASE, ACT[stateInfo.activity] || {}, stateInfo.mood ? MOOD[stateInfo.mood] : {});
    const k = profile.intensity;
    p.armL = p.armL * (p.armL > 20 ? Math.max(0.6, k) : 1);
    p.armR = p.armR * (p.armR > 20 ? Math.max(0.6, k) : 1);
    p.smile *= (0.5 + 0.5 * profile.playful + 0.3);
    return p;
  }
}
