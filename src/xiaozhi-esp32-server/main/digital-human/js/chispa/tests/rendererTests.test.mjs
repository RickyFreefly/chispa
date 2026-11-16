import test from 'node:test';
import assert from 'node:assert/strict';
import { ChispaFace } from '../avatar/ChispaFace.js';
import { ChispaExpressionEngine } from '../engine/ChispaExpressionEngine.js';
import { rasterize, countPixels, bitmapToAscii } from '../avatar/ChispaRasterizer.js';
import { RENDER_PROFILES } from '../config/renderProfiles.js';
import { LAYOUT } from '../config/faceGeometry.js';
import { catalog, seeded } from './helpers.mjs';

const eng = new ChispaExpressionEngine(catalog);
const ids = Object.keys(catalog.expressions);
function face(id, { warm = 1.2, ctx = {}, level } = {}) {
  const f = new ChispaFace({ rng: seeded(3), segments: 48 });
  f.setTarget(eng.resolveStatic(id), { snap: true });
  for (let i = 0; i < Math.round(warm * 60); i++) f.update(1 / 60, { audioAvailable: false, ...ctx });
  return f;
}
const frame = (f, o) => f.frame(o).prims;
const eyes = (p) => p.filter((x) => x.part && x.part.startsWith('eye'));
const bbox = (pts) => ({ x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) });

test('las 20 expresiones producen dos ojos finitos dentro del lienzo lógico', () => {
  for (const id of ids) {
    const p = frame(face(id)); const e = eyes(p);
    assert.equal(e.length, 2, id);
    for (const pr of p) for (const pt of pr.points || []) { assert.ok(pt.every(isFinite), id); }
    for (const x of e) { const b = bbox(x.points); assert.ok(b.x0 > 0 && b.x1 < 100 && b.y0 > 0 && b.y1 < 75, `${id} ojo fuera: ${JSON.stringify(b)}`); }
  }
});
test('ojos simétricos en expresiones simétricas', () => {
  for (const id of ['idle', 'happy', 'surprised', 'sad', 'angry', 'listening']) {
    const [l, r] = eyes(frame(face(id, { ctx: {}, warm: 1.5 })));
    const bl = bbox(l.points), br = bbox(r.points);
    assert.ok(Math.abs((bl.y1 - bl.y0) - (br.y1 - br.y0)) < 0.8, `${id} alto`);
    assert.ok(Math.abs((50 - bl.x0) - (br.x1 - 50)) < 4.5, `${id} posición`);
  }
});
test('formas clave: arco feliz es media luna; ojos grandes > neutro; plano casi cerrado', () => {
  const h = (id) => { const e = eyes(frame(face(id, { warm: 2 })))[0]; const b = bbox(e.points); return b.y1 - b.y0; };
  assert.ok(h('happy') < h('idle') * 0.85, 'arco más bajo que óvalo');
  assert.ok(h('shocked') > h('idle'), 'impactado más grande'); assert.ok(h('offline') < 3, 'offline casi cerrado');
  const sq = eyes(frame(face('happy', { warm: 2 })))[0]; const b = bbox(sq.points);
  const cy = (b.y0 + b.y1) / 2; const below = sq.points.filter((p) => p[1] > cy + 0.3).length; assert.ok(below > 0);
});
test('enfado inclina los párpados: borde interior más bajo que el exterior', () => {
  const [l] = eyes(frame(face('angry', { warm: 2 }))); const pts = l.points, b = bbox(pts);
  const topAt = (x) => Math.min(...pts.filter((p) => Math.abs(p[0] - x) < 1.8).map((p) => p[1]));
  assert.ok(topAt(b.x1 - 1.2) > topAt(b.x0 + 1.2) + 1, 'interior (derecha del ojo izq) más bajo');
});
test('tristeza: pendiente contraria al enfado', () => {
  const [l] = eyes(frame(face('sad', { warm: 2 }))); const pts = l.points, b = bbox(pts);
  const topAt = (x) => Math.min(...pts.filter((p) => Math.abs(p[0] - x) < 1.8).map((p) => p[1]));
  assert.ok(topAt(b.x1 - 1.2) < topAt(b.x0 + 1.2) - 0.5);
});
test('parpadeo: ocurre, es natural (intervalos variables) y es determinista con rng fijo', () => {
  const run = (seed) => { const f = new ChispaFace({ rng: seeded(seed) }); f.setTarget(eng.resolveStatic('idle'), { snap: true }); const starts = []; let prev = false;
    for (let i = 0; i < 60 * 40; i++) { f.update(1 / 60, {}); const cl = f.blinkT >= 0; if (cl && !prev) starts.push(i / 60); prev = cl; } return starts; };
  const a = run(5), b = run(5), c = run(9);
  assert.deepEqual(a, b); assert.ok(a.length >= 5 && a.length <= 25, `parpadeos en 40 s: ${a.length}`);
  const gaps = a.slice(1).map((v, i) => v - a[i]); assert.ok(Math.max(...gaps) - Math.min(...gaps) > 1, 'intervalos variables');
  assert.notDeepEqual(a, c);
  assert.ok(gaps.some((g) => g < 0.6), 'hay dobles parpadeos ocasionales (con esa semilla)') ;
});
test('durante el parpadeo el ojo se cierra y luego recupera', () => {
  const f = face('idle', { warm: 0.2 }); f.blinkT = 0.11; const mid = bbox(frame(f).find((p) => p.part === 'eyeL').points); f.blinkT = -1;
  const open = bbox(frame(f).find((p) => p.part === 'eyeL').points); assert.ok((mid.y1 - mid.y0) < (open.y1 - open.y0) * 0.3);
});
test('arcos felices no parpadean (sin salto visual)', () => { const f = face('happy', { warm: 8 }); assert.equal(f.blinkT, -1); });
test('transición suave óvalo -> arco: monótona y sin saltos grandes', () => {
  const f = face('idle'); f.setTarget(eng.resolveStatic('happy')); let prev = null, maxJump = 0;
  for (let i = 0; i < 40; i++) { f.update(1 / 60, {}); const b = bbox(frame(f).find((p) => p.part === 'eyeL').points); const h = b.y1 - b.y0; if (prev != null) maxJump = Math.max(maxJump, Math.abs(h - prev)); prev = h; }
  assert.ok(maxJump < 4, `salto de alto por cuadro: ${maxJump}`);
});
test('boca: guiada por audio real, sin señal queda fija (no aleatoria)', () => {
  const speaking = { ...eng.resolveStatic('speaking') };
  const mk = () => { const f = new ChispaFace({ rng: seeded(1) }); f.setTarget(speaking, { snap: true }); return f; };
  const noSig = mk(); const opens = new Set(); for (let i = 0; i < 120; i++) { noSig.update(1 / 60, { audioAvailable: false, level: 0 }); if (i > 60) opens.add(noSig.mouth.open.toFixed(3)); }
  assert.equal(opens.size, 1, 'sin señal: valor constante');
  const loud = mk(), quiet = mk(); for (let i = 0; i < 60; i++) { loud.update(1 / 60, { audioAvailable: true, level: 0.9 }); quiet.update(1 / 60, { audioAvailable: true, level: 0 }); }
  assert.ok(loud.mouth.open > quiet.mouth.open + 0.5); assert.ok(quiet.mouth.open < 0.12);
});
test('reduced-motion: sin sacádicas, sin doble parpadeo y movimiento atenuado', () => {
  const f = new ChispaFace({ rng: seeded(2) }); f.setTarget(eng.resolveStatic('laugh'), { snap: true }); let maxDy = 0, maxDyN = 0;
  for (let i = 0; i < 300; i++) { f.update(1 / 60, { reduced: true }); maxDy = Math.max(maxDy, Math.abs(f.mods.dy)); }
  const g = new ChispaFace({ rng: seeded(2) }); g.setTarget(eng.resolveStatic('laugh'), { snap: true }); for (let i = 0; i < 300; i++) { g.update(1 / 60, {}); maxDyN = Math.max(maxDyN, Math.abs(g.mods.dy)); }
  assert.ok(maxDy < maxDyN * 0.4); assert.deepEqual(f.sac, { x: 0, y: 0 });
});
test('efectos: aparecen, se pueden desactivar y no quedan colgados', () => {
  const f = face('shyLaugh', { warm: 1 }); assert.ok(f.accents.has('blushAndSweat'));
  assert.ok(frame(f).some((p) => p.color === 'blush'));
  f.setTarget(eng.resolveStatic('idle')); for (let i = 0; i < 120; i++) f.update(1 / 60, {}); assert.equal(f.accents.size, 0, 'acento anterior eliminado');
  const g = face('sad', { warm: 1, ctx: { effects: false } }); assert.equal(g.accents.size, 0); assert.ok(!frame(g).some((p) => p.color === 'tear'));
  for (const id of ids) { const x = face(id, { warm: 0.8 }); x.setTarget(eng.resolveStatic('idle')); for (let i = 0; i < 90; i++) x.update(1 / 60, {}); assert.equal(x.accents.size, 0, `fuga de acento tras ${id}`); }
});
test('cambios rápidos de expresión: sin estado corrupto ni NaN', () => {
  const f = new ChispaFace({ rng: seeded(4) }); f.setTarget(eng.resolveStatic('idle'), { snap: true });
  for (let i = 0; i < 600; i++) { if (i % 7 === 0) f.setTarget(eng.resolveStatic(ids[(i / 7) % ids.length | 0]), { restart: true }); f.update(1 / 60, { level: Math.random() }); }
  for (const pr of frame(f)) for (const pt of pr.points || []) assert.ok(pt.every(isFinite));
  assert.ok(f.accents.size <= 5);
});
test('dt enorme (pestaña oculta) no rompe la animación', () => { const f = face('idle'); f.update(30, {}); for (const pr of frame(f)) for (const pt of pr.points || []) assert.ok(pt.every(isFinite)); });

// ---- hardware: rasterizado 320x240 y 128x64 mono ----
test('visual 320x240: ojos blancos separados, sin cruzar el centro', () => {
  const rp = RENDER_PROFILES.small; const bm = rasterize(frame(face('idle', { warm: 0.3 }), { simplify: true }), rp.w, rp.h);
  const L = countPixels(bm, { x0: 0, y0: 0, x1: 160, y1: 240 }), R = countPixels(bm, { x0: 160, y0: 0, x1: 320, y1: 240 });
  assert.ok(L > 900 && R > 900, `píxeles ${L}/${R}`); assert.ok(Math.abs(L - R) / Math.max(L, R) < 0.1);
});
test('visual 128x64 monocromo: los 20 estados son legibles y distintos', () => {
  const rp = RENDER_PROFILES.oled, maps = {};
  for (const id of ids) {
    const f = face(id, { warm: 1.4, ctx: { level: 0 } }); const bm = rasterize(frame(f, { simplify: true, segments: rp.segments }), rp.w, rp.h, { mono: true });
    assert.ok([...bm.data].every((v) => v === 0 || v === 1), 'solo 0/1');
    const n = countPixels(bm); assert.ok(n > 25, `${id}: casi vacío (${n})`); assert.ok(n < 128 * 64 * 0.45, `${id}: demasiado lleno (${n})`);
    maps[id] = bitmapToAscii(bm);
  }
  const seen = new Map(); for (const [id, a] of Object.entries(maps)) { if (seen.has(a)) assert.fail(`${id} idéntico a ${seen.get(a)} en 128x64`); seen.set(a, id); }
});
test('128x64: la cara cabe en el alto y queda centrada', () => {
  const rp = RENDER_PROFILES.oled; const bm = rasterize(frame(face('idle', { warm: 0.3 }), { simplify: true, segments: rp.segments }), rp.w, rp.h, { mono: true });
  const L = countPixels(bm, { x0: 0, y0: 0, x1: 64, y1: 64 }), R = countPixels(bm, { x0: 64, y0: 0, x1: 128, y1: 64 }); assert.ok(Math.abs(L - R) <= 6, `${L}/${R}`);
  const top = countPixels(bm, { x0: 0, y0: 0, x1: 128, y1: 3 }), bottom = countPixels(bm, { x0: 0, y0: 61, x1: 128, y1: 64 }); assert.equal(top + bottom, 0, 'sin recortes');
});
test('simplificación OLED descarta efectos decorativos pero conserva los esenciales', () => {
  const f = face('shyLaugh', { warm: 1 }); const decor = (o) => frame(f, o).some((p) => p.color === 'blush');
  assert.ok(decor({ simplify: false })); assert.ok(!decor({ simplify: true }));
  const s = face('shocked', { warm: 1 }); assert.ok(frame(s, { simplify: true }).some((p) => p.color === 'alert'), 'la exclamación se conserva');
});
test('el diseño no tiene nariz, piel, pelo ni cuerpo: solo ojos, boca opcional y efectos', () => {
  for (const id of ids) for (const p of frame(face(id))) assert.ok(['eye', 'mouth', 'accent', 'blush', 'tear', 'alert'].includes(p.color), `${id}: color ${p.color}`);
  assert.ok(LAYOUT.eyeY < LAYOUT.mouthY);
});
