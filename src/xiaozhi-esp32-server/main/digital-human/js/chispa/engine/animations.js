// Microanimaciones: cada id del catálogo devuelve modificadores sobre la pose base.
// ctx: { t: segundos desde que empezó la expresión, T: reloj absoluto, I: intensidad, level: audio 0..1, dur: segundos }
// Salida: { dx, dy (unidades lógicas), rot (grados), sx, sy (escala), gx, gy (mirada -1..1), blinkBlock }
import { ballPos, sheepPos, discoverPos, gazeToward } from './scenes.js';
const decay = (t, k) => Math.exp(-t * k);
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const pulse = (T, period, width) => { const p = (T % period) / period; return p < width ? Math.sin((p / width) * Math.PI) : 0; };

export const ANIMATIONS = {
  softBounce:      ({ t, I }) => ({ dy: -Math.abs(Math.sin(t * 6)) * 1.2 * I * decay(t, 1.5) }),
  laughBounce:     ({ t, I }) => ({ dy: -Math.abs(Math.sin(t * 10)) * 2.2 * I, rot: Math.sin(t * 5) * 1.5 * I }),
  eyeSquint:       ({ t, I }) => ({ sy: 1 - 0.07 * Math.sin(t * 5) * I, dy: Math.sin(t * 5) * 0.4 * I }),
  sideGlance:      ({ t, I }) => ({ gx: 0.9 * ease(t / 0.35) * I, rot: -2 * ease(t / 0.35) * I }),
  steadyLook:      ({ T, I }) => ({ gx: Math.sin(T * 0.5) * 0.06, gy: 0.02 * I }),
  quickFreeze:     ({ t, I }) => ({ sx: 1 + 0.12 * decay(t, 8) * I, sy: 1 + 0.12 * decay(t, 8) * I, blinkBlock: true }),
  lookDown:        ({ t, I }) => ({ gy: 0.85 * ease(t / 0.5) * I, dy: 0.8 * ease(t / 0.5) * I, gx: -0.2 * ease(t / 0.5) }),
  nervousBounce:   ({ t, I }) => ({ dx: Math.sin(t * 25) * 0.5 * I, dy: -Math.abs(Math.sin(t * 8)) * 1.2 * I }),
  eyeExpand:       ({ t, I }) => ({ sx: 1 + 0.18 * decay(t, 3) * I, sy: 1 + 0.18 * decay(t, 3) * I, blinkBlock: true }),
  shortShake:      ({ t, I }) => ({ dx: Math.sin(t * 40) * 1.2 * decay(t, 4) * I, blinkBlock: true }),
  sharpSquint:     ({ t, I }) => ({ sy: 1 - 0.07 * ease(t / 0.2) * I, dy: 0.3 * I, blinkBlock: true }),
  slowLower:       ({ t, I }) => ({ dy: 1.5 * ease(t / 1.2) * I, gy: 0.3 * ease(t / 1.2) }),
  naturalBlink:    () => ({}),
  attentiveMotion: ({ T }) => ({ gx: Math.sin(T * 0.9) * 0.25, gy: Math.sin(T * 0.6 + 1) * 0.12, dy: -0.4, sy: 1 + 0.02 * Math.sin(T * 1.7) }),
  thoughtGlance:   ({ T }) => ({ gx: 0.8 + 0.2 * Math.sin(T * 0.8), gy: -0.6 + 0.12 * Math.sin(T * 1.1) }),
  audioReactive:   ({ level, I }) => ({ dy: -level * 0.8 * I, sy: 1 + level * 0.06 * I }),
  gentleNod:       ({ T, I }) => ({ dy: pulse(T, 2.4, 0.4) * 1.0 * I, gx: Math.sin(T * 0.5) * 0.1 }),
  positiveBounce:  ({ t, I }) => ({ dy: -Math.abs(Math.sin(t * 7)) * 1.8 * I * decay(t, 0.6) }),
  confusedTilt:    ({ T, I }) => ({ rot: Math.sin(T * 1.4) * 5 * I, gx: Math.sin(T * 3) * 0.3 }),
  followBall:      ({ T, I }) => { const b = ballPos(T); return { gx: gazeToward(b.x) * Math.min(1, I), gy: 0.1 + 0.6 * (1 - b.h) }; },
  sleepyWatch:     ({ T }) => { const s = sheepPos(T); return { gx: gazeToward(s.x, 44) * 0.8, gy: 0.45, sy: 1 + Math.sin(T * 1.2) * 0.03, dy: 0.5 + Math.sin(T * 0.8) * 0.4, blinkBlock: true }; },
  discoverLook:    ({ t, I }) => t < 2.4 ? { gx: Math.sin(t * 2.6) * 0.9, gy: 0.45 } : { gx: 0, gy: 0, sx: 1 + 0.18 * decay(t - 2.4, 3) * I, sy: 1 + 0.18 * decay(t - 2.4, 3) * I, blinkBlock: true },
  sleepIdle:       ({ T }) => ({ sy: 1 + Math.sin(T * 1.2) * 0.03, dy: Math.sin(T * 0.8) * 0.4, blinkBlock: true })
};
