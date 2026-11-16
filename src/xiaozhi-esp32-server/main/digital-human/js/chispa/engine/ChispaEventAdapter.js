// ChispaEventAdapter: traduce eventos VERIFICABLES (conexión, micro, STT, TTS, errores, intents del backend) a la máquina.
// Texto libre del usuario o del modelo NUNCA dispara expresiones: solo ids exactos de una lista permitida.
import { EMOTIONAL } from './ChispaStateMachine.js';

// Emociones que el servidor ya envía (campo emotion del mensaje llm) -> expresión Chispa. sad/angry no se mapean.
export const EMOJI_MAP = {
  happy: 'happy', laughing: 'laugh', funny: 'playful', silly: 'playful', winking: 'playful',
  loving: 'shyLaugh', kissy: 'shyLaugh', delicious: 'eyeLaugh', cool: 'confident', confident: 'confident',
  relaxed: 'encouraging', thinking: 'curious', surprised: 'surprised', shocked: 'shocked', confused: 'oops', embarrassed: 'embarrassed' };
// Sin expresión (se queda el estado operativo): neutral, sleepy, sad, crying, angry. sad/angry solo en Expression Lab.
const MIN_REPEAT_MS = 400;

export class ChispaEventAdapter {
  constructor(avatar) { this.avatar = avatar; this.last = { id: null, at: 0 }; }
  _allowed() { return this.avatar.persona.profile.backendAllowed; }
  _fire(id, { intensity = 1, durationMs, now = performance.now() } = {}) {
    if (this.last.id === id && now - this.last.at < MIN_REPEAT_MS) return { ok: false, reason: 'duplicado' };
    this.last = { id, at: now };
    return this.avatar.machine.express(id, { intensity, durationMs, now }) ? { ok: true } : { ok: false, reason: 'id no emocional' };
  }
  // Evento ya conocido (emoji del servidor). Solo ids de la tabla y permitidos por el perfil.
  fromEmoji(name) {
    const id = EMOJI_MAP[name];
    if (!id) return { ok: false, reason: `sin expresión asignada (${name})` };
    if (!this._allowed().includes(id)) return { ok: false, reason: `no permitido por el perfil (${id})` };
    return this._fire(id, { intensity: 0.9 });
  }
  // Mensaje del backend: { type:'chispa', intent:'encouraging', intensity?:0..1, durationMs?:300..8000 }
  fromBackend(msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.intent !== 'string') return { ok: false, reason: 'formato' };
    const intent = msg.intent;
    if (!this._allowed().includes(intent)) return { ok: false, reason: `intent no permitido: ${intent}` };
    if (intent === 'teaching') { this.avatar.machine.setAux(msg.active === false ? null : 'teaching'); return { ok: true }; }
    if (!EMOTIONAL.includes(intent)) return { ok: false, reason: 'intent no emocional' };
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
    return this._fire(intent, { intensity: num(msg.intensity, 0, 1, 1), durationMs: msg.durationMs == null ? undefined : num(msg.durationMs, 300, 8000, 1200) });
  }
}
