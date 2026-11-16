// Nivel de voz real vía Web Audio (AnalyserNode). Sin señal NO se simula con aleatorios: se informa available=false.
import { TOKENS } from '../config/animationTokens.js';
const A = TOKENS.audio;

export class ChispaAudioReactive {
  constructor() { this.analyser = null; this.data = null; this.level = 0; this.manual = null; }
  attach(analyser) {
    this.analyser = analyser || null;
    this.data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    return !!analyser;
  }
  detach() { this.analyser = null; this.data = null; }
  setManual(v) { this.manual = v == null ? null : Math.max(0, Math.min(1, v)); }   // solo Expression Lab
  get available() { return this.manual != null || !!this.analyser; }
  read() {
    if (this.manual != null) return this.manual;
    if (!this.analyser) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let s = 0, n = 0;
    const end = Math.min(48, this.data.length);
    for (let i = 2; i < end; i++) { s += this.data[i]; n++; }
    const raw = n ? s / n / 255 : 0;
    return raw < A.noiseFloor ? 0 : Math.min(1, raw * A.scale);
  }
  // Envolvente con ataque rápido y caída suave, independiente de la tasa de cuadros.
  update(dt) {
    const target = this.read();
    const rate = target > this.level ? A.attackPerS : A.releasePerS;
    this.level += (target - this.level) * (1 - Math.exp(-rate * dt));
    return this.level;
  }
}
