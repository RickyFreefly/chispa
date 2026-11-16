import test from 'node:test';
import assert from 'node:assert/strict';
import { ChispaStateMachine } from '../engine/ChispaStateMachine.js';
import { ChispaIdleDistraction } from '../engine/ChispaIdleDistraction.js';
import { catalog } from './helpers.mjs';

const MIN = 60e3;
function setup({ effects = true, busy = false } = {}) {
  const machine = new ChispaStateMachine({ catalog }); machine.setFact('connected', true, 0);
  const avatar = { machine, demoActive: false, options: { effects: true }, persona: { profile: { effects } },
    pulse(id, ms) { this.last = { id, ms }; machine.express(id, { durationMs: ms, now: 0 }); } };
  const flags = { busy };
  const idle = new ChispaIdleDistraction({ avatar, now: () => 0, isBusy: () => flags.busy, rng: () => 0, minMs: 3 * MIN, maxMs: 8 * MIN, quietMs: 2 * MIN });
  return { machine, avatar, idle, flags };
}
test('no hace nada antes del intervalo y juega después', () => {
  const { idle, avatar } = setup();
  assert.equal(idle.tick(1 * MIN), null);
  assert.equal(idle.tick(3 * MIN + 1), 'ball');
  assert.deepEqual(avatar.last, { id: 'ball', ms: 6000 });
});
test('sin efectos (perfil sobrio) solo mira alrededor, sin pelota', () => {
  const { idle } = setup({ effects: false });
  assert.equal(idle.tick(4 * MIN), 'discover');
});
test('no interrumpe: con aviso o concentración se pospone', () => {
  const { idle, flags, avatar } = setup({ busy: true });
  assert.equal(idle.tick(4 * MIN), null);
  assert.equal(avatar.last, undefined);
  flags.busy = false;
  assert.equal(idle.tick(5 * MIN), null, 'espera el tiempo de calma tras la ocupación');
  assert.equal(idle.tick(6 * MIN + 1), 'ball');
});
test('si la persona habla en medio de la escena, se cancela y vuelve al reposo', () => {
  const { idle, machine } = setup();
  idle.tick(4 * MIN);
  machine.setFact('mic', true, 0);
  idle.tick(4 * MIN + 1000);
  assert.equal(machine.snapshot().emotion, null);
  assert.equal(idle.tick(4 * MIN + 2000), null);
});
test('no lanza nada si está desconectada u hablando', () => {
  const { idle, machine } = setup();
  machine.setFact('connected', false, 0);
  assert.equal(idle.tick(10 * MIN), null);
});

test('dormida: sueña con ovejas o se asoma con duda, con ritmo más corto que despierta', () => {
  const { idle, avatar, machine } = setup();
  avatar.reposo = true; machine.setAux('sleep');
  assert.equal(idle.tick(1000), null, 'al dormirse reprograma, no lanza nada de inmediato');
  assert.equal(idle.tick(41 * 1000 + 1000), 'sheep', 'primera escena de sueño tras ~40 s');
  assert.deepEqual(avatar.last, { id: 'sheep', ms: 8000 });
});
test('dormida usa solo escenas de sueño (nunca la pelota)', () => {
  const { idle, avatar, machine } = setup();
  avatar.reposo = true; machine.setAux('sleep');
  idle.tick(0);
  const vistas = new Set();
  for (let i = 1; i <= 40; i++) { const r = idle.tick(i * 3 * MIN); if (r) vistas.add(r); machine.clearExpression(); idle.active = null; }
  assert.ok(vistas.size >= 1);
  for (const v of vistas) assert.ok(['sheep', 'curious'].includes(v), v);
});
test('al despertar vuelve al ritmo normal y cancela lo pendiente', () => {
  const { idle, avatar, machine } = setup();
  avatar.reposo = true; machine.setAux('sleep'); idle.tick(0);
  avatar.reposo = false; machine.setAux(null);
  assert.equal(idle.tick(60 * 1000), null, 'despierta: el siguiente juego tarda minutos, no segundos');
});
