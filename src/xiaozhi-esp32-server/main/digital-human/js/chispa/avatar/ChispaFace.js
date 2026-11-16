// ChispaFace: pose animada de la cara. Independiente del renderer: update(dt, ctx) y frame() -> primitivas.
import { eyePreset, mouthPreset, LAYOUT, EYE_KEYS, MOUTH_KEYS } from '../config/faceGeometry.js';
import { TOKENS } from '../config/animationTokens.js';
import { ANIMATIONS } from '../engine/animations.js';
import { ESSENTIAL_ACCENTS } from '../config/renderProfiles.js';
import { eyePolygon } from './ChispaEyes.js';
import { mouthPrims } from './ChispaMouth.js';
import { accentPrims } from './ChispaAccents.js';

const MOD_KEYS = ['dx', 'dy', 'rot', 'sx', 'sy', 'gx', 'gy'];
const MOD_DEF = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, gx: 0, gy: 0 };
const A = TOKENS.audio, B = TOKENS.blink;
const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));

export class ChispaFace {
  constructor({ rng = Math.random, segments = 48 } = {}) {
    this.rng = rng; this.segments = segments;
    this.T = 0; this.t = 0;
    this.target = null; this.animId = 'naturalBlink'; this.I = 1;
    this.tEyes = { L: eyePreset('neutralOval', 'L'), R: eyePreset('neutralOval', 'R') };
    this.cur = { L: { ...this.tEyes.L }, R: { ...this.tEyes.R } };
    this.tMouth = mouthPreset('none'); this.mouth = { ...this.tMouth };
    this.mods = { ...MOD_DEF }; this.gaze = { x: 0, y: 0 }; this.sac = { x: 0, y: 0 };
    this.nextSac = 1; this.blinkT = -1; this.nextBlink = 1.2; this.pendingDouble = false; this.eyeOffset = 0.02;
    this.accents = new Map();           // id -> alfa actual (se elimina al apagarse: sin animaciones colgadas)
    this.activeAccent = 'none'; this.lastEpoch = null; this.key = '';
  }
  setTarget(fs, { restart = false, snap = false } = {}) {
    const key = `${fs.expression}|${fs.emotion}|${fs.mouth}`;
    if (restart || key !== this.key || fs.epoch !== this.lastEpoch) this.t = 0;
    this.key = key; this.lastEpoch = fs.epoch;
    this.target = fs; this.animId = fs.animation; this.I = fs.intensity; this.activeAccent = fs.accent;
    this.tEyes = { L: eyePreset(fs.eyes, 'L'), R: eyePreset(fs.eyes, 'R') };
    this.tMouth = mouthPreset(fs.mouth);
    if (snap) { this.cur = { L: { ...this.tEyes.L }, R: { ...this.tEyes.R } }; this.mouth = { ...this.tMouth }; }
  }
  _blocksBlink() {
    return !!(this.target && (this.target.operationalState === 'offline' || this.tEyes.L.arc > 0.5 || this.tEyes.L.ry < 3)) ||
      !!(ANIMATIONS[this.animId] && ANIMATIONS[this.animId]({ t: this.t, T: this.T, I: this.I, level: 0 }).blinkBlock);
  }
  _blink(dt, reduced) {
    if (this._blocksBlink()) { this.blinkT = -1; this.nextBlink = Math.max(this.nextBlink, 0.6); return; }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      if (this.blinkT >= B.durationS + B.eyeOffsetMaxS) {
        this.blinkT = -1;
        if (this.pendingDouble) { this.pendingDouble = false; this.nextBlink = 0.14; }
        else this.nextBlink = B.minGapS + this.rng() * B.maxExtraGapS;
      }
    } else if ((this.nextBlink -= dt) <= 0) {
      this.blinkT = 0; this.eyeOffset = this.rng() * B.eyeOffsetMaxS;
      this.pendingDouble = !reduced && this.rng() < B.doubleChance;
    }
  }
  _blinkOpen(side) {
    if (this.blinkT < 0) return 1;
    const off = side === 'R' ? this.eyeOffset : 0;
    return 1 - 0.95 * bump((this.blinkT - off) / B.durationS);
  }
  update(dt, ctx = {}) {
    dt = Math.min(Math.max(dt, 0), 0.1);                          // un cuadro largo (pestaña oculta) no debe saltar
    const { level = 0, audioAvailable = false, reduced = false, effects = true, speed = 1 } = ctx;
    this.T += dt; this.t += dt;
    const fs = this.target; if (!fs) return;
    const tau = Math.max(0.015, (fs.transitionMs / 3000) / Math.max(0.1, speed));
    const k = 1 - Math.exp(-dt / tau);
    for (const side of ['L', 'R']) for (const key of EYE_KEYS) this.cur[side][key] += (this.tEyes[side][key] - this.cur[side][key]) * k;
    for (const key of MOUTH_KEYS) this.mouth[key] += (this.tMouth[key] - this.mouth[key]) * k;
    if (fs.mouth === 'talking') {                                 // boca guiada por voz real; sin señal = abierta fija, sin aleatorio
      const km = 1 - Math.exp(-dt / 0.035);
      const open = audioAvailable ? A.silentOpen + level * 0.95 : A.noSignalOpen;
      this.mouth.open += (open - this.mouth.open) * km;
      this.mouth.w += ((5.2 + (audioAvailable ? level * 1.6 : 0)) - this.mouth.w) * km;
    }
    this._blink(dt, reduced);
    // animación (con intensidad y reduced-motion) -> mods suavizados
    const amp = reduced ? TOKENS.reducedMotionFactor : 1;
    const fn = ANIMATIONS[this.animId];
    const raw = fn ? fn({ t: this.t, T: this.T, I: this.I * amp, level, dur: (fs.durationMs || 1000) / 1000 }) : {};
    const km2 = 1 - Math.exp(-dt / 0.04);
    for (const key of MOD_KEYS) {
      let tv = raw[key] != null ? raw[key] : MOD_DEF[key];
      if (reduced && (key === 'sx' || key === 'sy')) tv = 1 + (tv - 1) * amp;
      this.mods[key] += (tv - this.mods[key]) * km2;
    }
    // sacádicos solo si no hay reduced-motion
    const range = TOKENS.saccadeRange[fs.operationalState] || [0.15, 0.1];
    if (!reduced && (this.nextSac -= dt) <= 0) {
      this.sac = { x: (this.rng() * 2 - 1) * range[0], y: (this.rng() * 2 - 1) * range[1] };
      this.nextSac = 0.9 + this.rng() * 2.4;
    }
    if (reduced) this.sac = { x: 0, y: 0 };
    const kg = 1 - Math.exp(-dt / 0.09);
    this.gaze.x += ((this.sac.x + this.mods.gx) - this.gaze.x) * kg;
    this.gaze.y += ((this.sac.y + this.mods.gy) - this.gaze.y) * kg;
    // efectos: el activo sube a 1, los demás bajan; el que llega a ~0 se borra
    const want = effects ? this.activeAccent : 'none';
    if (want !== 'none' && !this.accents.has(want)) this.accents.set(want, 0);
    const ka = 1 - Math.exp(-dt / 0.12);
    for (const [id, al] of this.accents) {
      const next = al + ((id === want ? 1 : 0) - al) * ka;
      if (id !== want && next < 0.01) this.accents.delete(id); else this.accents.set(id, next);
    }
  }
  // Devuelve primitivas en coordenadas lógicas. opts.simplify descarta efectos decorativos.
  frame({ simplify = false, segments = this.segments } = {}) {
    const prims = [], m = this.mods, g = TOKENS.gazeOffset;
    const base = this.target ? this.target.operationalState : 'idle';
    for (const side of ['L', 'R']) {
      const e = this.cur[side];
      const p = { ...e, sx: m.sx, sy: m.sy, open: e.open * this._blinkOpen(side), rot: e.rot + m.rot };
      const cx = (side === 'L' ? LAYOUT.eyeLX : LAYOUT.eyeRX) + m.dx + this.gaze.x * g.x;
      const cy = LAYOUT.eyeY + m.dy + this.gaze.y * g.y;
      const pts = eyePolygon(p, cx, cy, side, segments);
      if (pts.length >= 3) prims.push({ type: 'poly', points: pts, color: 'eye', alpha: 1, part: 'eye' + side });
    }
    for (const pr of mouthPrims(this.mouth, LAYOUT.mouthX + m.dx * 0.6, LAYOUT.mouthY + m.dy * 0.6, segments)) prims.push(pr);
    for (const [id, al] of this.accents) {
      if (simplify && !ESSENTIAL_ACCENTS.includes(id)) continue;
      for (const pr of accentPrims(id, this.T, this.I, al, this.t)) prims.push(pr);
    }
    return { prims, meta: this.target ? { expression: this.target.expression, operationalState: base } : null };
  }
}
