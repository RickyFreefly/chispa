// Perfiles de render: misma geometría lógica, distinta fidelidad. El motor no cambia; solo cómo se dibuja.
export const RENDER_PROFILES = {
  desktop: { id: 'desktop', label: 'Escritorio', w: 640, h: 480, mono: false, segments: 56, simplify: false },
  small:   { id: 'small',   label: 'Pantalla 320×240', w: 320, h: 240, mono: false, segments: 28, simplify: true },
  oled:    { id: 'oled',    label: 'OLED 128×64 (mono)', w: 128, h: 64, mono: true, segments: 18, simplify: true }
};
// Acentos que sobreviven a la simplificación (los que cambian el significado, no los decorativos).
export const ESSENTIAL_ACCENTS = ['exclamation', 'angerMark', 'tears', 'thinkingDots', 'questionMark', 'threeDots', 'ball', 'sheep', 'discover', 'zzz'];
export function paletteFor(design, mono) {
  if (mono) return { eye: '#FFFFFF', mouth: '#FFFFFF', accent: '#FFFFFF', blush: '#FFFFFF', tear: '#FFFFFF', alert: '#FFFFFF', bg: '#000000' };
  return { eye: design.eyeColor, mouth: design.mouthColor, accent: design.accentColor, blush: design.blushColor, tear: design.tearColor, alert: design.alertColor, bg: design.background };
}
