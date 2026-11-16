// UI de Chispa: indicador de estado, selector de perfil y panel de modo demo.
import { ALL_STATES, LABELS } from './state.js';

export function mountChispaUI(avatar) {
  const { machine, persona } = avatar;
  const panel = document.getElementById('stagePanel');
  const label = document.getElementById('connectionStatus');
  const dot = document.querySelector('.status-indicator .status-dot');
  const badge = document.getElementById('demoBadge');
  const note = document.getElementById('chispaVoiceNote');

  const render = () => {
    const s = machine.state;
    if (panel) panel.dataset.state = s.name;
    if (label) label.textContent = (s.demo ? 'Demo · ' : '') + s.label;
    if (dot) dot.className = 'status-dot ' + (s.activity === 'offline' && !s.demo ? 'status-disconnected' : s.activity === 'thinking' ? 'status-connecting' : 'status-connected');
    if (badge) badge.hidden = !s.demo;
    document.querySelectorAll('#demoStates button').forEach(b => b.setAttribute('aria-pressed', String(s.demo && b.dataset.state === s.name)));
  };
  machine.addEventListener('change', render); render();

  // aviso honesto cuando el habla no tiene análisis de audio real
  setInterval(() => {
    if (!note) return;
    const s = machine.state;
    note.textContent = (!s.demo && s.activity === 'speaking' && avatar.voice.simulated) ? 'Boca simulada: no se pudo analizar el audio' : '';
  }, 500);

  // perfiles
  const sel = document.getElementById('chispaProfile'), desc = document.getElementById('chispaProfileDesc');
  if (sel) {
    sel.innerHTML = persona.list().map(p => `<option value="${p.id}">${p.label}</option>`).join('');
    sel.value = persona.id;
    sel.addEventListener('change', () => persona.set(sel.value));
  }
  const showDesc = () => { if (desc) desc.textContent = persona.profile.description; if (sel) sel.value = persona.id; };
  persona.addEventListener('change', showDesc); showDesc();

  // modo demo (separado de la operación real: no toca los hechos del backend)
  const btn = document.getElementById('chispaDemoBtn'), box = document.getElementById('demoPanel'), grid = document.getElementById('demoStates');
  if (grid) {
    grid.innerHTML = ALL_STATES.map(s => `<button type="button" class="chip" data-state="${s}" aria-pressed="false">${LABELS[s]}</button>`).join('')
      + '<button type="button" class="chip chip-exit" id="demoExit">Salir del demo</button>';
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'demoExit') { machine.setDemo(null); box.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
      machine.setDemo(b.dataset.state);
    });
  }
  if (btn) btn.addEventListener('click', () => {
    const open = box.hidden; box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) machine.setDemo(machine.state.name); else machine.setDemo(null);
  });
}
