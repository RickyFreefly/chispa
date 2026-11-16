// Párpados: recorte de polígonos con semiplanos (Sutherland-Hodgman). Datos puros, sin DOM.
export function clipHalfPlane(pts, a, b, c) {            // conserva a*x + b*y + c >= 0
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dp = a * p[0] + b * p[1] + c, dq = a * q[0] + b * q[1] + c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
// inner: +1 si el lado interior del ojo está hacia +x (ojo izquierdo), -1 en el derecho.
export function applyLids(pts, { rx, ry, lidTop, lidBottom, lidSlope }, inner) {
  let out = pts;
  if (lidTop > 0.001 || Math.abs(lidSlope) > 0.001) {
    const yt = -ry + 2 * ry * lidTop;
    const k = (lidSlope * 0.6 * ry / rx) * inner;           // pendiente del párpado superior
    out = clipHalfPlane(out, -k, 1, -yt);
  }
  if (lidBottom > 0.001 && out.length) out = clipHalfPlane(out, 0, -1, ry - 2 * ry * lidBottom);
  return out;
}
