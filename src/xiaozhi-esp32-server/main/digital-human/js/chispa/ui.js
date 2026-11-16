import { ChispaIdleDistraction } from './engine/ChispaIdleDistraction.js';
// UI de Chispa en la página principal: estado, perfil y vista previa de expresiones (demo).
// El demo solo cambia la apariencia; los eventos reales siguen su curso por debajo y se retoman al salir.
const STATE_LABEL = { offline: 'Desconectada', error: 'Error de conexión', speaking: 'Hablando', listening: 'Escuchando', thinking: 'Pensando…', idle: 'Lista' };

export function mountChispaUI(avatar) {
  const { machine, persona, catalog } = avatar;
  const panel = document.getElementById('stagePanel');
  const label = document.getElementById('connectionStatus');
  const dot = document.querySelector('.status-indicator .status-dot');
  const badge = document.getElementById('demoBadge');
  const note = document.getElementById('chispaVoiceNote');

  const render = () => {
    const demo = avatar.demoActive, s = machine.snapshot();
    const op = s.operational;
    if (op === 'offline' && avatar.reposo) avatar.reposo = false;     // al reconectar el servidor arranca despierto
    if (panel) panel.dataset.state = op;
    if (label) label.textContent = demo ? `Demo · ${catalog.expressions[avatar.demo.id].label}` : (avatar.reposo && op === 'idle' ? 'En reposo · di «hola chispa»' : s.aux === 'teaching' && op !== 'offline' ? 'Enseñando' : STATE_LABEL[op]);
    if (dot) dot.className = 'status-dot ' + (op === 'offline' || op === 'error' ? 'status-disconnected' : op === 'thinking' ? 'status-connecting' : 'status-connected');
    if (badge) badge.hidden = !demo;
    document.querySelectorAll('#demoStates button[data-id]').forEach((b) => b.setAttribute('aria-pressed', String(demo && b.dataset.id === avatar.demo.id)));
    if (note) note.textContent = (!demo && op === 'speaking' && !avatar.audio.available) ? 'Sin análisis de audio: la boca queda en posición fija' : '';
  };
  machine.subscribe(render);
  avatar.onFaceUpdate(render);
  render();

  const sel = document.getElementById('chispaProfile'), desc = document.getElementById('chispaProfileDesc');
  if (sel) {
    sel.innerHTML = persona.list().map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
    sel.value = persona.id;
    sel.addEventListener('change', () => persona.set(sel.value));
  }
  const showDesc = () => { if (desc) desc.textContent = persona.profile.description; if (sel) sel.value = persona.id; };
  persona.onChange(showDesc); showDesc();

  const btn = document.getElementById('chispaDemoBtn'), box = document.getElementById('demoPanel'), grid = document.getElementById('demoStates');
  const close = () => { avatar.endDemo(); box.hidden = true; btn.setAttribute('aria-expanded', 'false'); render(); };
  if (grid) {
    grid.innerHTML = Object.entries(catalog.expressions).map(([id, d]) => `<button type="button" class="chip" data-id="${id}" aria-pressed="false" title="${id}">${d.label}</button>`).join('')
      + '<a class="chip" href="expression-lab.html" target="_blank" rel="noopener">Abrir Expression Lab</a><button type="button" class="chip chip-exit" id="demoExit">Salir del demo</button>';
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'demoExit') return close();
      avatar.demoExpress(b.dataset.id); render();
    });
  }
  if (btn) btn.addEventListener('click', () => {
    if (box.hidden) { box.hidden = false; btn.setAttribute('aria-expanded', 'true'); avatar.demoExpress('happy'); render(); } else close();
  });
  // Distracción breve en reposo (pelota o descubrir) y, dormida, sueños breves; se cede ante avisos y modo concentración.
  new ChispaIdleDistraction({ avatar, isBusy: () => { const o = window.chatApp?.organizer; return !!(o?.state?.focus || o?.ringing?.size); } }).start();
}
