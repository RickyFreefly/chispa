import test from 'node:test';
import assert from 'node:assert/strict';
import { ChispaStateMachine, deriveOperational, PRIORITY } from '../engine/ChispaStateMachine.js';
import { ChispaExpressionEngine } from '../engine/ChispaExpressionEngine.js';
import { ChispaEventAdapter } from '../engine/ChispaEventAdapter.js';
import { PROFILES, ChispaPersonaConfig } from '../config/personalityProfiles.js';
import { catalog } from './helpers.mjs';

const mk = () => new ChispaStateMachine({ catalog });
const on = (m, now = 0) => { m.setFact('connected', true, now); return m; };

test('prioridad pedida: offline > error > speaking > listening > thinking > idle', () => {
  assert.deepEqual(PRIORITY, ['offline', 'error', 'speaking', 'listening', 'thinking', 'idle']);
  assert.deepEqual(catalog.operationalPriority, PRIORITY);
  const f = { connected: true, mic: true, processing: false, speaking: true, error: true };
  assert.equal(deriveOperational({ ...f, connected: false }), 'offline');
  assert.equal(deriveOperational(f), 'error');
  assert.equal(deriveOperational({ ...f, error: false }), 'speaking');
  assert.equal(deriveOperational({ ...f, error: false, speaking: false }), 'listening');
  assert.equal(deriveOperational({ connected: true, mic: false, processing: true, speaking: false, error: false }), 'thinking');
  assert.equal(deriveOperational({ connected: true, mic: false, processing: false, speaking: false, error: false }), 'idle');
});
test('micrófono abierto + turno en proceso => pensando (no se queda en escuchando)', () => {
  const m = on(mk()); m.setFact('mic', true);
  assert.equal(m.snapshot().operational, 'listening');
  m.setFact('processing', true);
  assert.equal(m.snapshot().operational, 'thinking');
  m.setFact('speaking', true);
  assert.equal(m.snapshot().operational, 'speaking');
  assert.equal(m.facts.processing, false, 'al empezar a hablar termina el procesamiento');
});
test('la expresión temporal vuelve al estado operacional actual', () => {
  const m = on(mk()); m.setFact('mic', true);
  m.express('happy', { now: 0, durationMs: 1000 });
  assert.equal(m.snapshot().visible, 'happy');
  m.tick(500); assert.equal(m.snapshot().visible, 'happy');
  m.setFact('mic', false, 600);                       // el estado cambia mientras dura la emoción
  m.tick(1000); assert.equal(m.snapshot().visible, 'idle');
});
test('teaching se superpone a speaking y se apaga', () => {
  const m = on(mk()); m.setFact('speaking', true); m.setAux('teaching');
  const s = m.snapshot(); assert.equal(s.operational, 'speaking'); assert.equal(s.aux, 'teaching'); assert.equal(s.visible, 'teaching');
  const fs = new ChispaExpressionEngine(catalog).resolve(s);
  assert.equal(fs.mouth, 'talking', 'al hablar la boca sigue la voz');
  m.setAux(null); assert.equal(m.snapshot().visible, 'speaking');
});
test('offline y error bloquean expresiones y auxiliares', () => {
  const m = on(mk()); m.setAux('teaching'); m.express('happy', { now: 0, durationMs: 5000 });
  m.setFact('connected', false);
  assert.deepEqual([m.snapshot().visible, m.snapshot().emotion, m.snapshot().aux], ['offline', null, null]);
  m.setFact('connected', true);
  m.raiseError(1000, 0);
  assert.equal(m.snapshot().visible, 'error');
  m.tick(1001); assert.notEqual(m.snapshot().visible, 'error', 'el error expira solo');
});
test('desconectar limpia mic/procesando/hablando', () => {
  const m = on(mk()); m.setFact('mic', true); m.setFact('processing', true); m.setFact('connected', false);
  assert.deepEqual([m.facts.mic, m.facts.processing, m.facts.speaking], [false, false, false]);
});
test('processing con timeout para no quedarse pensando eternamente', () => {
  const m = new ChispaStateMachine({ catalog, processingTimeoutMs: 1000 }); on(m);
  m.setFact('processing', true, 0); m.tick(999); assert.equal(m.snapshot().operational, 'thinking');
  m.tick(1001); assert.equal(m.snapshot().operational, 'idle');
});
test('sin duplicados: el mismo estado no emite dos veces', () => {
  const m = mk(); let n = 0; m.subscribe(() => n++);
  m.setFact('connected', true); m.setFact('connected', true); m.setFact('mic', false);
  assert.equal(n, 1);
});
test('sin fugas de oyentes al cancelar suscripción', () => {
  const m = mk(); const off = m.subscribe(() => {}); assert.equal(m.listeners.size, 1); off(); assert.equal(m.listeners.size, 0);
});
test('hechos y expresiones desconocidas se rechazan', () => {
  const m = mk(); assert.throws(() => m.setFact('nada', true)); assert.equal(m.express('idle'), false); assert.equal(m.express('inventada'), false);
});

// --- backend: lista permitida ---
const fakeAvatar = (profile = 'student') => { const a = { machine: mk(), persona: new ChispaPersonaConfig({ getItem: () => profile, setItem() {} }) }; on(a.machine); return a; };
test('backend: sad y angry están fuera de la lista por defecto', () => {
  for (const p of Object.values(PROFILES)) { assert.ok(!p.backendAllowed.includes('sad')); assert.ok(!p.backendAllowed.includes('angry')); }
  const ad = new ChispaEventAdapter(fakeAvatar());
  assert.equal(ad.fromBackend({ intent: 'sad' }).ok, false);
  assert.equal(ad.fromBackend({ intent: 'angry' }).ok, false);
});
test('backend: texto libre, ids inventados y tipos raros no disparan nada', () => {
  const a = fakeAvatar(), ad = new ChispaEventAdapter(a);
  for (const bad of [null, 5, {}, { intent: 5 }, { intent: 'HAPPY' }, { intent: 'happy; rm -rf' }, { intent: 'offline' }, { intent: 'error' }, { intent: '__proto__' }, { intent: 'Estoy muy feliz!' }]) assert.equal(ad.fromBackend(bad).ok, false, JSON.stringify(bad));
  assert.equal(a.machine.snapshot().emotion, null);
});
test('backend: intents válidos, intensidad y duración acotadas, duplicados ignorados', () => {
  const a = fakeAvatar(), ad = new ChispaEventAdapter(a);
  assert.equal(ad.fromBackend({ intent: 'encouraging', intensity: 9, durationMs: 999999 }, 0).ok, true);
  const e = a.machine.snapshot().emotion; assert.equal(e.id, 'encouraging'); assert.ok(e.intensity <= 1); assert.ok(e.durationMs <= 8000);
  assert.equal(ad.fromBackend({ intent: 'encouraging' }).ok, false, 'repetición inmediata');
});
test('backend: perfil profesional restringe aún más', () => {
  const ad = new ChispaEventAdapter(fakeAvatar('professional'));
  assert.equal(ad.fromBackend({ intent: 'playful' }).ok, false);
  assert.equal(ad.fromBackend({ intent: 'confident' }).ok, true);
});
test('backend: teaching activa/desactiva el auxiliar', () => {
  const a = fakeAvatar(), ad = new ChispaEventAdapter(a);
  ad.fromBackend({ intent: 'teaching' }); assert.equal(a.machine.aux, 'teaching');
  ad.fromBackend({ intent: 'teaching', active: false }); assert.equal(a.machine.aux, null);
});
test('emoji del servidor: mapeo conocido; sad/angry sin mapeo', () => {
  const ad = new ChispaEventAdapter(fakeAvatar());
  assert.equal(ad.fromEmoji('laughing').ok, true);
  assert.equal(ad.fromEmoji('sad').ok, false); assert.equal(ad.fromEmoji('angry').ok, false);
});
test('emoji del servidor: todas las emociones del prompt llegan a una expresión (estudiante)', () => {
  const names = ['happy', 'laughing', 'funny', 'loving', 'surprised', 'shocked', 'embarrassed', 'confused', 'cool', 'winking', 'relaxed', 'delicious', 'thinking'];
  for (const n of names) { const a = fakeAvatar(), ad = new ChispaEventAdapter(a); assert.equal(ad.fromEmoji(n).ok, true, n); assert.ok(a.machine.snapshot().emotion, n); }
});
test('emoji del servidor: neutral/thinking sin expresión; profesional bloquea las no permitidas', () => {
  const ad = new ChispaEventAdapter(fakeAvatar());
  for (const n of ['neutral', 'sleepy', 'crying']) assert.equal(ad.fromEmoji(n).ok, false, n);
  const pro = new ChispaEventAdapter(fakeAvatar('professional'));
  assert.equal(pro.fromEmoji('cool').ok, true); assert.equal(pro.fromEmoji('laughing').ok, false);
});
