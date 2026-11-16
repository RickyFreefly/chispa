import test from 'node:test';
import assert from 'node:assert/strict';
import { ChispaStateMachine } from '../engine/ChispaStateMachine.js';
import { ChispaExpressionEngine } from '../engine/ChispaExpressionEngine.js';
import { accentPrims } from '../avatar/ChispaAccents.js';
import { catalog } from './helpers.mjs';

const on = () => { const m = new ChispaStateMachine({ catalog }); m.setFact('connected', true, 0); return m; };

test('en reposo la cara es la dormida (ojos cerrados y zzz)', () => {
  const m = on(); m.setAux('sleep');
  const s = m.snapshot(); assert.equal(s.visible, 'sleep');
  const f = new ChispaExpressionEngine(catalog).resolve(s);
  assert.equal(f.eyes, 'closedFlat'); assert.equal(f.accent, 'zzz'); assert.equal(f.mouth, 'none');
});
test('dormida solo se ve en reposo: al hablar o escuchar manda lo operativo', () => {
  const m = on(); m.setAux('sleep');
  m.setFact('speaking', true); assert.equal(m.snapshot().visible, 'speaking');
  m.setFact('speaking', false); m.setFact('mic', true); assert.equal(m.snapshot().visible, 'listening');
  m.setFact('mic', false); assert.equal(m.snapshot().visible, 'sleep');
});
test('sin conexión no se muestra dormida (offline manda)', () => {
  const m = on(); m.setAux('sleep'); m.setFact('connected', false, 1);
  assert.equal(m.snapshot().visible, 'offline');
});
test('los zzz se dibujan y suben', () => {
  const a = accentPrims('zzz', 0, 1, 1), b = accentPrims('zzz', 1.5, 1, 1);
  assert.ok(a.length >= 1 && b.length >= 1);
  assert.notDeepEqual(a, b);
});
