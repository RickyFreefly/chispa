// ChispaStateMachine: estado OPERACIONAL (derivado de hechos reales) separado de la EXPRESIÓN emocional (temporal).
// Sin timers: el tiempo avanza con tick(now), lo que evita carreras y la hace determinista y testeable.
export const OPERATIONAL = ['idle', 'listening', 'thinking', 'speaking', 'offline', 'error'];
export const AUXILIARY = ['teaching', 'sleep'];
export const EMOTIONAL = ['happy', 'laugh', 'eyeLaugh', 'playful', 'confident', 'oops', 'embarrassed', 'shyLaugh', 'surprised', 'shocked', 'angry', 'sad', 'encouraging', 'curious', 'ball', 'sheep', 'discover'];
// Prioridad pedida: offline > error > speaking > listening > thinking > idle.
export const PRIORITY = ['offline', 'error', 'speaking', 'listening', 'thinking', 'idle'];
// 'listening' = micrófono activo SIN un turno en proceso. El micrófono sigue abierto mientras el modelo piensa,
// así que sin esta condición la prioridad listening > thinking impediría ver "pensando" en la conversación real.
const PREDICATE = {
  offline: (f) => !f.connected,
  error: (f) => f.error,
  speaking: (f) => f.speaking,
  listening: (f) => f.mic && !f.processing,
  thinking: (f) => f.processing,
  idle: () => true
};
export function deriveOperational(facts) {
  for (const s of PRIORITY) if (PREDICATE[s](facts)) return s;
  return 'idle';
}
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class ChispaStateMachine {
  constructor({ catalog = null, processingTimeoutMs = 25000 } = {}) {
    this.catalog = catalog; this.processingTimeoutMs = processingTimeoutMs;
    this.facts = { connected: false, mic: false, processing: false, speaking: false, error: false };
    this.aux = null; this.emotion = null; this.errorUntil = 0; this.processingSince = 0;
    this.listeners = new Set(); this._key = '';
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  setFact(key, value, now = nowMs()) {
    if (!(key in this.facts)) throw new Error(`Hecho desconocido: ${key}`);
    value = !!value;
    if (this.facts[key] === value) return;
    this.facts[key] = value;
    if (key === 'processing' && value) this.processingSince = now;
    if (key === 'speaking' && value) this.facts.processing = false;       // la respuesta ya empezó
    if (key === 'connected' && !value) Object.assign(this.facts, { mic: false, processing: false, speaking: false });
    this._emit();
  }
  raiseError(durationMs = 3500, now = nowMs()) { this.errorUntil = now + durationMs; this.setFact('error', true, now); }
  clearError() { this.errorUntil = 0; this.setFact('error', false); }
  setAux(name) { name = AUXILIARY.includes(name) ? name : null; if (this.aux !== name) { this.aux = name; this._emit(); } }
  express(id, { intensity = 1, durationMs, now = nowMs() } = {}) {
    if (!EMOTIONAL.includes(id)) return false;
    const def = this.catalog && this.catalog.expressions[id];
    const dur = durationMs != null ? durationMs : (def ? def.durationMs : 1200);
    this.emotion = { id, intensity: Math.max(0, Math.min(1.5, intensity)), startedAt: now, endsAt: now + dur, durationMs: dur };
    this._emit();
    return true;
  }
  clearExpression() { if (this.emotion) { this.emotion = null; this._emit(); } }
  tick(now = nowMs()) {
    if (this.emotion && now >= this.emotion.endsAt) { this.emotion = null; this._emit(); }
    if (this.facts.error && this.errorUntil && now >= this.errorUntil) { this.errorUntil = 0; this.setFact('error', false, now); }
    if (this.facts.processing && now - this.processingSince > this.processingTimeoutMs) this.setFact('processing', false, now);
  }
  snapshot() {
    const operational = deriveOperational(this.facts);
    const blocked = operational === 'offline' || operational === 'error';    // en estos estados no hay expresiones ni auxiliares
    const emotion = !blocked && this.emotion ? { id: this.emotion.id, intensity: this.emotion.intensity, durationMs: this.emotion.durationMs, startedAt: this.emotion.startedAt } : null;
    const aux = !blocked ? this.aux : null;
    const auxVisible = aux === 'sleep' && operational !== 'idle' ? null : aux;           // dormida solo se ve en reposo; al hablar o escuchar manda lo operativo
    return { operational, aux, emotion, visible: emotion ? emotion.id : (auxVisible || operational) };
  }
  _emit() {
    const s = this.snapshot();
    const key = `${s.operational}|${s.aux}|${s.emotion ? s.emotion.id + s.emotion.intensity : ''}`;
    if (key === this._key) return;
    this._key = key;
    this.listeners.forEach((fn) => fn(s));
  }
}
