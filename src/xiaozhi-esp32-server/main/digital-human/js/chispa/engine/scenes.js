// Coreografía de las escenas por voz (pelota, ovejas, descubre): funciones puras del tiempo, sin DOM.
// Las usan tanto el dibujo (ChispaAccents) como la mirada (animations), así los ojos siguen lo que se ve.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Pelota que rebota de lado a lado: vaivén horizontal (6,4 s) con botes cada 0,8 s.
export function ballPos(T) {
  const p = (T % 6.4) / 6.4, dir = p < 0.5 ? p * 2 : 2 - p * 2;
  const b = (T * 1.25) % 1, h = 4 * b * (1 - b);
  return { x: 14 + 72 * dir, y: 66 - 26 * h, h, spin: T * 7 };
}

// Oveja que salta la cerca (en x=50) y vuelve a empezar cada 2,6 s.
export function sheepPos(T) {
  const x = 6 + 88 * ((T % 2.6) / 2.6), d = (x - 50) / 17;
  const lift = Math.abs(d) < 1 ? 13 * (1 - d * d) : 0;
  return { x, y: 68 - lift, air: lift > 0.8 };
}

// Lupa que busca (0–2,4 s), se detiene y aparece la idea (desde 2,9 s).
export function discoverPos(t) {
  if (t < 2.4) return { x: 50 + 28 * Math.sin(t * 2.6), y: 63 + 3 * Math.sin(t * 5.2), found: 0 };
  const k = clamp((t - 2.4) / 0.5, 0, 1), e = k * k * (3 - 2 * k);
  return { x: (50 + 28 * Math.sin(2.4 * 2.6)) * (1 - e) + 50 * e, y: 63 * (1 - e) + 61 * e + 0.6 * Math.sin(t * 6) * e, found: clamp((t - 2.9) / 0.25, 0, 1) };
}
export const gazeToward = (x, range = 36) => clamp((x - 50) / range, -1, 1);
