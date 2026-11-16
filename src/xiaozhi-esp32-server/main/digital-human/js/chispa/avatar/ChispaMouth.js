// Boca: trazo superior (sonrisa) + relleno opcional (abierta). Misma geometría para sonreír y hablar.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function mouthPrims(m, cx, cy, segments = 20, alphaMul = 1) {
  const a = m.alpha * alphaMul;
  if (a < 0.02) return [];
  const n = Math.max(6, segments >> 1), w = m.w;
  const top = [];
  for (let i = 0; i <= n; i++) {
    const x = -w + (2 * w * i) / n, u = x / w, bow = 1 - u * u;
    top.push([cx + x, cy + m.smile * 2.2 * bow - m.smile]);
  }
  const prims = [];
  const h = m.open * 7;
  if (h > 0.15) {
    const poly = top.slice();
    for (let i = n; i >= 0; i--) { const x = -w + (2 * w * i) / n, u = x / w; poly.push([cx + x, top[i][1] + h * Math.pow(Math.max(0, 1 - u * u), 0.9)]); }
    prims.push({ type: 'poly', points: poly, color: 'mouth', alpha: a * clamp(m.open * 8, 0, 1) });
  }
  prims.push({ type: 'line', points: top, color: 'mouth', width: 1.1, alpha: a });
  return prims;
}
