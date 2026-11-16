// Distracción breve en reposo: de vez en cuando Chispa juega un momento (pelota o "descubrir") y vuelve a la tarea.
// Nunca interrumpe: solo actúa si está en reposo, sin avisos ni modo concentración, y se cancela apenas hay actividad.
// Sin DOM y con reloj/azar inyectables para poder probarla.
export const IDLE_DEFAULTS = { minMs: 3 * 60e3, maxMs: 8 * 60e3, quietMs: 2 * 60e3, pollMs: 5000, sleepMinMs: 40e3, sleepMaxMs: 2 * 60e3 };
const SCENES = [{ id: 'ball', ms: 6000, needsEffects: true }, { id: 'discover', ms: 5000, needsEffects: false }];
// Mientras duerme (reposo por voz): sueña con ovejas o se despierta un instante, mira de lado con duda y vuelve a dormir.
const SLEEP_SCENES = [{ id: 'sheep', ms: 8000, needsEffects: false }, { id: 'curious', ms: 2200, needsEffects: false }];

export class ChispaIdleDistraction {
  constructor({ avatar, isBusy = () => false, now = () => Date.now(), rng = Math.random, ...opts } = {}) {
    this.avatar = avatar; this.isBusy = isBusy; this.now = now; this.rng = rng;
    this.o = { ...IDLE_DEFAULTS, ...opts };
    this.active = null; this.timer = null; this.dormida = !!avatar.reposo; this.nextAt = this._schedule(this.now());
  }
  _schedule(t) {
    const [lo, hi] = this.dormida ? [this.o.sleepMinMs, this.o.sleepMaxMs] : [this.o.minMs, this.o.maxMs];
    return t + lo + this.rng() * (hi - lo);
  }
  start() { if (!this.timer && typeof setInterval !== 'undefined') this.timer = setInterval(() => this.tick(), this.o.pollMs); return this; }
  stop() { clearInterval(this.timer); this.timer = null; }

  // Devuelve el id de la escena lanzada, o null.
  tick(t = this.now()) {
    const m = this.avatar.machine; if (!m) return null;
    if (!!this.avatar.reposo !== this.dormida) {            // se durmió o despertó: cambia el ritmo y se descarta lo programado
      this.dormida = !!this.avatar.reposo; this.active = null; this.nextAt = this._schedule(t);
    }
    const s = m.snapshot(), reposo = s.operational === 'idle' && !this.avatar.demoActive && !this.isBusy();
    if (this.active) {
      if (!reposo) { m.clearExpression(); this.active = null; this.nextAt = Math.max(this.nextAt, t + this.o.quietMs); }
      else if (t >= this.active.until) this.active = null;
      return null;
    }
    if (!reposo || s.emotion) { this.nextAt = Math.max(this.nextAt, t + this.o.quietMs); return null; }
    if (t < this.nextAt) return null;
    const fx = !!(this.avatar.persona?.profile?.effects) && this.avatar.options?.effects !== false;
    const pool = (this.dormida ? SLEEP_SCENES : SCENES).filter((x) => fx || !x.needsEffects);
    const sc = pool[Math.floor(this.rng() * pool.length)];
    this.avatar.pulse(sc.id, sc.ms);
    this.active = { id: sc.id, until: t + sc.ms };
    this.nextAt = this._schedule(t + sc.ms);
    return sc.id;
  }
}
