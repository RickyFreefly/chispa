// Rasterizador sin DOM: referencia para hardware (OLED 128x64, TFT 320x240) y para las pruebas visuales.
// Devuelve un mapa de brillo 0..1 (mono=true -> umbral 0/1). No usa canvas.
import { LOGICAL } from '../config/faceGeometry.js';

function fillPoly(buf, w, h, pts, val) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(w - 1, Math.floor(xs[i + 1] - 0.5)); x++) buf[y * w + x] = Math.max(buf[y * w + x], val);
  }
}
function strokeLine(buf, w, h, pts, width, val) {
  const r = Math.max(0.5, width / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) disc(buf, w, h, x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps, r, val);
  }
}
function disc(buf, w, h, cx, cy, r, val) {
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++)
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) buf[y * w + x] = Math.max(buf[y * w + x], val);
}
export function rasterize(prims, w, h, { mono = false, threshold = 0.45 } = {}) {
  const s = Math.min(w / LOGICAL.w, h / LOGICAL.h), ox = (w - LOGICAL.w * s) / 2, oy = (h - LOGICAL.h * s) / 2;
  const T = (p) => [ox + p[0] * s, oy + p[1] * s];
  const buf = new Float32Array(w * h);
  for (const pr of prims) {
    const v = Math.max(0, Math.min(1, pr.alpha));
    if (v < 0.02) continue;
    if (pr.type === 'poly') fillPoly(buf, w, h, pr.points.map(T), v);
    else if (pr.type === 'line') strokeLine(buf, w, h, pr.points.map(T), pr.width * s, v);
    else if (pr.fill) disc(buf, w, h, ox + pr.cx * s, oy + pr.cy * s, pr.r * s, v);
    else { const n = 40, ring = []; for (let i = 0; i <= n; i++) ring.push([pr.cx + pr.r * Math.cos(i / n * Math.PI * 2), pr.cy + pr.r * Math.sin(i / n * Math.PI * 2)].map((q, k) => q)); strokeLine(buf, w, h, ring.map(T), (pr.width || 1) * s, v); }
  }
  if (mono) for (let i = 0; i < buf.length; i++) buf[i] = buf[i] >= threshold ? 1 : 0;
  return { w, h, data: buf };
}
export function bitmapToAscii(bm, rows = bm.h, cols = bm.w) {
  let out = '';
  for (let y = 0; y < bm.h; y++) { let line = ''; for (let x = 0; x < bm.w; x++) line += bm.data[y * bm.w + x] > 0.45 ? '#' : '.'; out += line + '\n'; }
  return out;
}
export function countPixels(bm, region) {   // region {x0,y0,x1,y1} en píxeles; sin region = todo
  const r = region || { x0: 0, y0: 0, x1: bm.w, y1: bm.h }; let n = 0;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (bm.data[y * bm.w + x] > 0.45) n++;
  return n;
}
