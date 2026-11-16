// Ojo como polígono en coordenadas lógicas. Un solo modelo cubre óvalo, arco feliz, mirada baja, etc.
import { applyLids } from './ChispaEyelids.js';
const sgn = (v) => (v < 0 ? -1 : 1);

export function eyePolygon(p, cx, cy, side, segments = 48) {
  const rx = Math.max(0.2, p.rx * (p.sx || 1));
  const ry = Math.max(0.15, p.ry * (p.sy || 1) * Math.max(0.04, p.open));
  const ex = 2 / Math.max(1, p.n);
  const k = 1 - p.arc * (2 - p.tau);                         // mitad inferior: óvalo -> arco
  let pts = [];
  for (let i = 0; i < segments; i++) {
    const th = (i / segments) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const x = rx * sgn(c) * Math.pow(Math.abs(c), ex);
    const m = Math.pow(Math.abs(s), ex);
    pts.push([x, s > 0 ? ry * m * k : -ry * m]);
  }
  pts = applyLids(pts, { rx, ry, lidTop: p.lidTop, lidBottom: p.lidBottom, lidSlope: p.lidSlope }, side === 'L' ? 1 : -1);
  if (pts.length < 3) return [];
  const a = (p.rot || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  return pts.map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca]);
}
