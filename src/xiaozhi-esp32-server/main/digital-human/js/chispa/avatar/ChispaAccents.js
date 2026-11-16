// Efectos (rubor, lágrimas, destellos...) como primitivas. Aparecen/desaparecen por alfa, nunca por saltos.
import { ballPos, sheepPos, discoverPos } from '../engine/scenes.js';
const circ = (cx, cy, r, color, alpha, extra) => Object.assign({ type: 'circle', cx, cy, r, color, alpha, fill: true }, extra);
const line = (points, color, width, alpha) => ({ type: 'line', points, color, width, alpha });
const poly = (points, color, alpha) => ({ type: 'poly', points, color, alpha });
const ellipse = (cx, cy, rx, ry, n = 16) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const drop = (cx, cy, s) => { const pts = [[cx, cy - 2.6 * s]]; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.15 + 0.7 * (i / 10)) ; pts.push([cx + 1.6 * s * Math.cos(a + Math.PI * 0.0) * (i < 5 ? 1 : 1), cy + 0.4 * s + 1.7 * s * Math.sin(a)]); } return [[cx, cy - 2.8 * s], [cx + 1.7 * s, cy], [cx + 1.5 * s, cy + 1.2 * s], [cx, cy + 1.9 * s], [cx - 1.5 * s, cy + 1.2 * s], [cx - 1.7 * s, cy]]; };
const star = (cx, cy, r) => { const pts = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return pts; };
const EYE_Y = 31, LX = 30, RX = 70;

const DRAW = {
  joyLines(T, I, a) {
    const out = [], d = 0.8 * Math.sin(T * 7);
    for (const side of [-1, 1]) for (const ang of [-75, -45, -15]) {
      const t = (side === 1 ? ang : 180 - ang) * Math.PI / 180, cx = 50 + side * 36, cy = 16;
      const r1 = 4 + d, r2 = 7.5 + d;
      out.push(line([[cx + r1 * Math.cos(t), cy + r1 * Math.sin(t)], [cx + r2 * Math.cos(t), cy + r2 * Math.sin(t)]], 'accent', 1.4, a * 0.9));
    }
    return out;
  },
  threeDots(T, I, a) { return [42, 50, 58].map((x, i) => circ(x, 65, 1.5, 'accent', a * (0.45 + 0.55 * Math.max(0, Math.sin(T * 4 - i * 0.8))))); },
  blush(T, I, a) { const al = a * 0.6 * Math.min(1, I) * (0.92 + 0.08 * Math.sin(T * 2)); return [poly(ellipse(21, 47, 7, 3.2), 'blush', al), poly(ellipse(79, 47, 7, 3.2), 'blush', al)]; },
  blushAndSweat(T, I, a) { return DRAW.blush(T, I, a).concat([poly(drop(86, 20 + 0.8 * Math.sin(T * 3), 1.2), 'tear', a * 0.9)]); },
  exclamation(T, I, a) { const s = 1 + 0.08 * Math.sin(T * 9); return [line([[50, 3], [50, 3 + 8 * s]], 'alert', 2.4, a), circ(50, 16.5, 1.5, 'alert', a)]; },
  angerMark(T, I, a) {
    const s = 1 + 0.15 * Math.sin(T * 10), cx = 83, cy = 12, out = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) out.push(line([[cx + sx * 1.3 * s, cy + sy * 4.5 * s], [cx + sx * 1.3 * s, cy + sy * 1.3 * s], [cx + sx * 4.5 * s, cy + sy * 1.3 * s]], 'alert', 1.5, a));
    return out;
  },
  tears(T, I, a) {
    const out = [];
    for (const [x, dir] of [[LX - 2, -1], [RX + 2, 1]]) for (const ph of [0, 0.5]) {
      const p = ((T / 1.6) + ph) % 1, y = EYE_Y + 11 + p * 20, al = a * Math.sin(Math.min(1, p * 1.2) * Math.PI) ;
      out.push(poly(drop(x + dir * 0.5, y, 1.5), 'tear', Math.max(0, al) * 0.95));
    }
    return out;
  },
  listeningPulse(T, I, a) { return [0, 0.5].map((ph) => { const p = ((T / 1.8) + ph) % 1; return circ(50, 37, 46 + p * 8, 'accent', a * (1 - p) * 0.45, { fill: false, width: 0.9 }); }); },
  thinkingDots(T, I, a) { return [74, 80, 86].map((x, i) => circ(x, 12 - 2.2 * Math.max(0, Math.sin(T * 5 - i * 0.9)), 1.7, 'accent', a * 0.95)); },
  sparkles(T, I, a) { return [[13, 12, 0], [88, 20, 2], [80, 62, 4]].map(([x, y, ph]) => { const s = 0.5 + 0.5 * Math.sin(T * 4 + ph); return poly(star(x, y, 2 + 3 * s), 'accent', a * (0.35 + 0.65 * s)); }); },
  ball(T, I, a) {
    const b = ballPos(T), r = 3.8, ang = b.spin;
    const shadow = poly(ellipse(b.x, 68.5, 3.6 - 1.6 * b.h, 0.9), 'accent', a * (0.35 - 0.2 * b.h));
    const seam = (k) => line([[b.x - r * Math.cos(ang + k), b.y - r * Math.sin(ang + k)], [b.x + r * Math.cos(ang + k), b.y + r * Math.sin(ang + k)]], 'accent', 0.8, a * 0.9);
    return [shadow, circ(b.x, b.y, r, 'accent', a, { fill: false, width: 1.5 }), seam(0), seam(Math.PI / 2)];   // contorno + costuras que giran
  },
  sheep(T, I, a) {
    const s = sheepPos(T), out = [];
    out.push(line([[4, 69.2], [96, 69.2]], 'accent', 0.5, a * 0.45));                                   // suelo
    for (const x of [46, 54]) out.push(line([[x, 69], [x, 58]], 'accent', 1.4, a));                  // cerca
    out.push(line([[44, 61], [56, 61]], 'accent', 1, a), line([[44, 65.5], [56, 65.5]], 'accent', 1, a));
    const x = s.x, y = s.y, leg = s.air ? 1.2 : 3;
    out.push(line([[x - 1.5, y - 3], [x - 1.5, y - 3 + leg]], 'eye', 0.9, a), line([[x + 2.2, y - 3], [x + 2.2, y - 3 + leg]], 'eye', 0.9, a));
    for (const dx of [-2, 0.4, 2.6]) out.push(circ(x + dx, y - (dx === 0.4 ? 6 : 5.2), 2.5, 'eye', a));
    out.push(poly(ellipse(x + 5.6, y - 4.6, 1.8, 1.6), 'accent', a));
    for (let k = 0; k < 3; k++) {                                                                      // zzz que suben
      const p = ((T / 2.4) + k / 3) % 1, zx = 70 + p * 14, zy = 22 - p * 12, z = 2 + p * 2.6;
      out.push(line([[zx, zy], [zx + z, zy], [zx, zy + z], [zx + z, zy + z]], 'accent', 1.2, a * Math.sin(p * Math.PI)));
    }
    return out;
  },
  // «z z z» que suben despacio: Chispa en reposo (durmiendo)
  zzz(T, I, a) {
    const out = [];
    for (let k = 0; k < 3; k++) {
      const p = ((T / 3.2) + k / 3) % 1, zx = 66 + p * 16, zy = 26 - p * 16, z = 3 + p * 4;
      out.push(line([[zx, zy], [zx + z, zy], [zx, zy + z], [zx + z, zy + z]], 'accent', 1.4, a * Math.sin(p * Math.PI)));
    }
    return out;
  },
  discover(T, I, a, t = T) {
    const m = discoverPos(t), out = [];
    out.push(circ(m.x, m.y, 5.5, 'accent', a, { fill: false, width: 1.5 }), line([[m.x + 3.9, m.y + 3.9], [m.x + 9.5, m.y + 9.5]], 'accent', 2.2, a));
    if (m.found > 0) {                                                                                 // ¡idea!
      const bx = 84, by = 13, al = a * m.found, glow = 0.7 + 0.3 * Math.sin(T * 9);
      out.push(circ(bx, by, 4, 'alert', al, { fill: true }), line([[bx - 1.7, by + 4.6], [bx + 1.7, by + 4.6]], 'accent', 1.2, al), line([[bx - 1.2, by + 6.2], [bx + 1.2, by + 6.2]], 'accent', 1.2, al));
      for (let i = 0; i < 6; i++) { const ang = (-150 + i * 24) * Math.PI / 180, r1 = 6.5 + glow, r2 = 9.5 + 1.5 * glow; out.push(line([[bx + r1 * Math.cos(ang), by + r1 * Math.sin(ang)], [bx + r2 * Math.cos(ang), by + r2 * Math.sin(ang)]], 'alert', 1.1, al * 0.9)); }
    }
    return out;
  },
  questionMark(T, I, a) {
    const sw = 0.5 * Math.sin(T * 2);
    return [line([[80, 10], [80.4, 7.5], [82.5, 6], [85, 6.2], [87, 8], [86.6, 10.4], [84.6, 12.2], [84, 14.5], [84, 16.5]].map(([x, y]) => [x + sw, y]), 'accent', 1.8, a), circ(84 + sw, 20.5, 1.2, 'accent', a)];
  }
};
export function accentPrims(id, T, I, alpha, t = T) { const f = DRAW[id]; return f && alpha > 0.01 ? f(T, I, alpha, t) : []; }
