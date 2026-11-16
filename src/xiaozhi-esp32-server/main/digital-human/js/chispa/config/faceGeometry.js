// Geometría facial en espacio lógico normalizado: x 0..100, y 0..75 (4:3, referencia 320x240).
// Todo lo que sigue es datos puros (sin DOM) para poder usarse en web, pruebas y hardware.
export const LOGICAL = { w: 100, h: 75, refW: 320, refH: 240 };
export const LAYOUT = { eyeY: 31, eyeLX: 30, eyeRX: 70, mouthX: 50, mouthY: 55, centerX: 50, centerY: 37 };

// Parámetros de un ojo. n = exponente de superelipse (2 = óvalo); arc 0..1 = óvalo -> arco "^";
// tau = grosor del arco; lidTop/lidBottom = fracción cubierta por párpado; lidSlope>0 = enfado (interior bajo),
// <0 = tristeza; rot = giro en grados; open = apertura vertical (parpadeo).
export const DEFAULT_EYE = { rx: 10, ry: 13, n: 2, arc: 0, tau: 0.3, lidTop: 0, lidSlope: 0, lidBottom: 0, rot: 0, open: 1 };
export const EYE_KEYS = Object.keys(DEFAULT_EYE);

export const EYE_PRESETS = {
  neutralOval:        { rx: 10, ry: 13 },
  attentiveOval:      { rx: 10.5, ry: 14.5 },
  expressiveOval:     { rx: 10, ry: 13.5 },
  focusedOval:        { rx: 10, ry: 12, lidTop: 0.14, lidSlope: 0.12 },
  relaxedOval:        { rx: 10.5, ry: 11.5, n: 2.4, lidTop: 0.2 },
  wideOval:           { rx: 11, ry: 15 },
  largeOval:          { rx: 12, ry: 17 },
  extraLargeOval:     { rx: 13.5, ry: 19.5 },
  loweredOval:        { rx: 10, ry: 12, lidTop: 0.26 },
  sideLookingOval:    { rx: 9.5, ry: 12.5 },
  happyArc:           { rx: 10.5, ry: 10, arc: 1, tau: 0.3 },
  closedHappyArc:     { rx: 11, ry: 9, arc: 1, tau: 0.22 },
  raisedHappyArc:     { rx: 10.5, ry: 10.5, arc: 0.85, tau: 0.42, lidBottom: 0.1 },
  smallHappyArc:      { rx: 8.5, ry: 8, arc: 1, tau: 0.3 },
  asymmetricHalfLid:  { rx: 10, ry: 12.5, L: { lidTop: 0.45, lidSlope: 0.1 }, R: { lidTop: 0.2, lidSlope: -0.05 } },
  angledEyes:         { rx: 10.5, ry: 12, lidTop: 0.3, lidSlope: 0.95 },
  sadTilt:            { rx: 10, ry: 13, lidTop: 0.3, lidSlope: -0.9 },
  confusedAsymmetric: { rx: 10, ry: 14, lidTop: 0.12, L: { ry: 14.5 }, R: { rx: 8.5, ry: 9.5, rot: -9 } },
  closedFlat:         { rx: 10, ry: 1.2, open: 1 }
};

export const DEFAULT_MOUTH = { w: 6, open: 0, smile: 0, alpha: 0, fill: 0 };
export const MOUTH_KEYS = Object.keys(DEFAULT_MOUTH);
export const MOUTH_PRESETS = {
  none:       { alpha: 0 },
  openSmile:  { w: 9, open: 0.7, smile: 1, alpha: 1, fill: 1 },
  talking:    { w: 5.5, open: 0.3, smile: 0.12, alpha: 1, fill: 1 },
  smallSmile: { w: 5.5, open: 0, smile: 0.85, alpha: 1, fill: 0 },
  smallFlat:  { w: 4.5, open: 0, smile: 0, alpha: 1, fill: 0 }
};

export const ACCENT_IDS = ['joyLines', 'threeDots', 'blush', 'blushAndSweat', 'exclamation', 'angerMark', 'tears', 'listeningPulse', 'thinkingDots', 'sparkles', 'questionMark', 'ball', 'sheep', 'discover', 'zzz'];

export function eyePreset(id, side /* 'L' | 'R' */) {
  const p = EYE_PRESETS[id];
  if (!p) throw new Error(`Ojo desconocido: ${id}`);
  const { L, R, ...common } = p;
  return Object.assign({}, DEFAULT_EYE, common, (side === 'L' ? L : R) || {});
}
export function mouthPreset(id) {
  const p = MOUTH_PRESETS[id];
  if (!p) throw new Error(`Boca desconocida: ${id}`);
  return Object.assign({}, DEFAULT_MOUTH, p);
}
