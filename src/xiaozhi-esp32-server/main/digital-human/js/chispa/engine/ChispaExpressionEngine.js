// ChispaExpressionEngine: combina estado operacional + expresión + perfil y produce un FaceState serializable.
import { TOKENS } from '../config/animationTokens.js';

export class ChispaExpressionEngine {
  constructor(catalog) { this.catalog = catalog; }
  _def(id) {
    const d = this.catalog.expressions[id];
    if (!d) throw new Error(`Expresión desconocida: ${id}`);
    return d;
  }
  resolve(snapshot, { intensity = 1, expressiveness = 1 } = {}) {
    const def = this._def(snapshot.visible);
    const speaking = snapshot.operational === 'speaking';
    const emoIntensity = snapshot.emotion ? snapshot.emotion.intensity : 1;
    return {
      event: 'face.update',
      expression: snapshot.visible,
      operationalState: snapshot.operational,
      aux: snapshot.aux,
      emotion: snapshot.emotion ? snapshot.emotion.id : null,
      eyes: def.eyes,
      mouth: speaking ? 'talking' : def.mouth,            // al hablar, la boca siempre sigue la voz
      accent: def.accent,
      animation: def.animation,
      intensity: Math.max(0, Math.min(1.5, intensity * expressiveness * emoIntensity)),
      transitionMs: TOKENS.transitionMs[snapshot.visible] || TOKENS.defaultTransitionMs,
      epoch: snapshot.emotion ? snapshot.emotion.startedAt : 0,
      durationMs: snapshot.emotion ? snapshot.emotion.durationMs : def.durationMs
    };
  }
  // Para vistas previas de la galería: una expresión fija, sin máquina de estados.
  resolveStatic(id, { intensity = 1 } = {}) {
    const kind = this._def(id).kind;
    const snap = { operational: kind === 'operational' ? id : 'idle', aux: kind === 'auxiliary' ? id : null, emotion: kind === 'emotion' ? { id, intensity: 1, durationMs: this._def(id).durationMs } : null, visible: id };
    return this.resolve(snap, { intensity });
  }
}
