// Tokens de animación: tiempos de transición y constantes de movimiento (datos puros).
export const TOKENS = {
  defaultTransitionMs: 240,
  transitionMs: { surprised: 90, shocked: 70, angry: 140, sad: 450, offline: 600, idle: 300, listening: 220, thinking: 260, speaking: 160, oops: 110, laugh: 140 },
  blink: { durationS: 0.22, minGapS: 1.8, maxExtraGapS: 4.5, doubleChance: 0.15, eyeOffsetMaxS: 0.04 },
  saccadeRange: { idle: [0.5, 0.25], listening: [0.12, 0.06], thinking: [0.1, 0.1], speaking: [0.2, 0.1], teaching: [0.15, 0.08], error: [0.3, 0.15], offline: [0, 0] },
  gazeOffset: { x: 3.4, y: 2.6 },
  reducedMotionFactor: 0.25,
  audio: { attackPerS: 18, releasePerS: 7, noiseFloor: 0.04, scale: 1.6, silentOpen: 0.04, noSignalOpen: 0.28 },
  processingTimeoutMs: 25000,
  errorDefaultMs: 3500
};
