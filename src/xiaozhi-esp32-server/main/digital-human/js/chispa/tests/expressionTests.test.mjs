import test from 'node:test';
import assert from 'node:assert/strict';
import { EYE_PRESETS, MOUTH_PRESETS, ACCENT_IDS } from '../config/faceGeometry.js';
import { ANIMATIONS } from '../engine/animations.js';
import { ChispaExpressionEngine } from '../engine/ChispaExpressionEngine.js';
import { toFaceUpdate, validateFaceUpdate } from '../engine/ChispaFaceProtocol.js';
import { ChispaAudioReactive } from '../engine/ChispaAudioReactive.js';
import { EMOTIONAL } from '../engine/ChispaStateMachine.js';
import { catalog } from './helpers.mjs';
import { ballPos, sheepPos, discoverPos } from '../engine/scenes.js';
import { accentPrims } from '../avatar/ChispaAccents.js';

const ids = Object.keys(catalog.expressions);
test('catálogo: 25 expresiones (17 emocionales + 2 auxiliares + 6 operacionales) y grupos coherentes', () => {
  assert.equal(ids.length, 25);
  const g = catalog.groups;
  assert.deepEqual([...g.operational, ...g.auxiliary, ...g.emotional].sort(), [...ids].sort());
  assert.deepEqual(EMOTIONAL, g.emotional);
});
test('todo id de ojo, boca, acento y animación del catálogo está implementado', () => {
  for (const [id, d] of Object.entries(catalog.expressions)) {
    assert.ok(EYE_PRESETS[d.eyes], `${id}: ojos ${d.eyes}`);
    assert.ok(MOUTH_PRESETS[d.mouth], `${id}: boca ${d.mouth}`);
    assert.ok(d.accent === 'none' || ACCENT_IDS.includes(d.accent), `${id}: acento ${d.accent}`);
    assert.ok(ANIMATIONS[d.animation], `${id}: animación ${d.animation}`);
    assert.ok(d.label && d.durationMs >= 0 && (d.kind === 'operational' || d.kind === 'auxiliary' || d.durationMs > 0), id);
  }
});
test('no hay ids huérfanos: todo lo implementado se usa', () => {
  const used = (k) => new Set(ids.map((i) => catalog.expressions[i][k]));
  for (const e of Object.keys(EYE_PRESETS)) assert.ok(used('eyes').has(e), `ojo sin uso: ${e}`);
  for (const a of ACCENT_IDS) assert.ok(used('accent').has(a), `acento sin uso: ${a}`);
  for (const a of Object.keys(ANIMATIONS)) assert.ok(used('animation').has(a), `animación sin uso: ${a}`);
});
test('diseño: colores de la especificación', () => {
  const d = catalog.design;
  assert.deepEqual([d.background, d.eyeColor, d.accentColor, d.blushColor, d.tearColor, d.alertColor], ['#000000', '#FFFFFF', '#B6FF39', '#FF5C9A', '#39A9FF', '#FF4D4D']);
});
test('animaciones: salida finita y acotada para cualquier t', () => {
  for (const [id, fn] of Object.entries(ANIMATIONS)) for (const t of [0, 0.1, 0.5, 1, 3, 10, 100]) {
    const o = fn({ t, T: t, I: 1.5, level: 1, dur: 1 });
    for (const [k, v] of Object.entries(o)) if (typeof v === 'number') { assert.ok(isFinite(v), `${id}.${k}`); assert.ok(Math.abs(v) < 12, `${id}.${k}=${v}`); }
  }
});
test('motor: resuelve las 24 expresiones a un FaceState válido', () => {
  const eng = new ChispaExpressionEngine(catalog);
  for (const id of ids) { const fs = eng.resolveStatic(id); assert.equal(fs.expression, id); assert.equal(validateFaceUpdate(toFaceUpdate(fs), catalog).ok, true, id); }
});
test('protocolo face.update: formato de la especificación y validación', () => {
  const m = { event: 'face.update', expression: 'happy', operationalState: 'speaking', intensity: 0.8, transitionMs: 250, durationMs: 1000 };
  assert.equal(validateFaceUpdate(m, catalog).ok, true);
  assert.equal(validateFaceUpdate(JSON.parse(JSON.stringify(m)), catalog).ok, true, 'serializable');
  for (const bad of [null, {}, { ...m, event: 'x' }, { ...m, expression: 'zzz' }, { ...m, operationalState: 'happy' }, { ...m, intensity: 9 }, { ...m, durationMs: -1 }, { ...m, transitionMs: NaN }]) assert.equal(validateFaceUpdate(bad, catalog).ok, false);
});
test('audio: sin analizador no hay señal inventada; con analizador sigue el nivel', () => {
  const a = new ChispaAudioReactive();
  assert.equal(a.available, false); assert.equal(a.update(0.016), 0);
  let v = 0; const fake = { frequencyBinCount: 64, getByteFrequencyData: (d) => d.fill(v) };
  a.attach(fake); assert.equal(a.available, true);
  v = 0; for (let i = 0; i < 30; i++) a.update(0.016); assert.ok(a.level < 0.02, 'silencio => boca cerrada');
  v = 200; for (let i = 0; i < 30; i++) a.update(0.016); assert.ok(a.level > 0.8, 'voz fuerte => boca abierta');
  v = 0; const peak = a.level; for (let i = 0; i < 3; i++) a.update(0.016); assert.ok(a.level < peak && a.level > 0, 'caída suave');
  a.detach(); assert.equal(a.available, false);
});

test('escenas: la pelota, la oveja y la lupa se mantienen dentro de la pantalla y se mueven', () => {
  const xs = new Set();
  for (let T = 0; T < 14; T += 0.05) {
    const b = ballPos(T), s = sheepPos(T), d = discoverPos(T);
    assert.ok(b.x >= 13 && b.x <= 87 && b.y >= 38 && b.y <= 67, `pelota ${b.x},${b.y}`);
    assert.ok(s.x >= 5 && s.x <= 95 && s.y >= 54 && s.y <= 68, `oveja ${s.x},${s.y}`);
    assert.ok(d.x >= 20 && d.x <= 80 && d.y >= 58 && d.y <= 67, `lupa ${d.x},${d.y}`);
    xs.add(Math.round(b.x));
  }
  assert.ok(xs.size > 40, 'la pelota recorre la pantalla');
  assert.ok(sheepPos(1.3).y < 60 && sheepPos(0.1).y === 68, 'la oveja salta solo sobre la cerca');
  assert.equal(discoverPos(1).found, 0); assert.equal(discoverPos(4).found, 1);
});
test('escenas: cada acento dibuja primitivas finitas; la idea solo aparece al final de descubre', () => {
  for (const id of ['ball', 'sheep', 'discover']) for (const t of [0, 1, 2.5, 3.5, 5]) {
    const prims = accentPrims(id, t, 1, 1, t); assert.ok(prims.length > 0, id);
    for (const p of prims) for (const pt of (p.points || [[p.cx, p.cy]])) assert.ok(pt.every(Number.isFinite), `${id} t=${t}`);
  }
  const alerts = (t) => accentPrims('discover', t, 1, 1, t).filter((p) => p.color === 'alert').length;
  assert.equal(alerts(1), 0); assert.ok(alerts(4) > 0);
});
