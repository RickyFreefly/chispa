// Panel "Mi día" de Chispa: avisos, tareas, hábitos y modo concentración.
// La fuente de verdad es el servidor (SQLite); aquí solo se muestra, se cuenta hacia atrás y se avisa.
const KIND_LABEL = { recordatorio: 'Recordatorio', alarma: 'Alarma', temporizador: 'Temporizador' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtLeft = (sec) => { sec = Math.max(0, Math.ceil(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + `:${String(s).padStart(2, '0')}`; };
const fmtClock = (ts) => new Date(ts * 1000).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

export class ChispaOrganizer {
  constructor({ send, avatar }) {
    this.send = send; this.avatar = avatar;
    this.state = { alerts: [], focus: null, tasks: [], habits: [] };
    this.skew = 0;            // reloj del servidor - reloj local
    this.tab = 'avisos'; this.ringing = new Map(); this.audio = null; this.beepTimer = null;
    this._mount();
    this.avatar?.persona?.onChange(() => this.sendProfile());
    setInterval(() => this._tick(), 500);
  }

  _mount() {
    const root = document.createElement('div');
    root.id = 'organizerRoot';
    root.innerHTML = `
      <button type="button" class="chip" id="orgBtn" aria-expanded="false" aria-controls="orgPanel">Mi día <span id="orgCount" hidden></span></button>
      <div id="orgFocusBar" class="org-focus" hidden></div>
      <div id="orgPanel" class="org-panel" hidden role="dialog" aria-label="Organización del día">
        <div class="org-tabs" role="tablist">
          ${['avisos', 'tareas', 'habitos', 'concentracion'].map((t) => `<button type="button" role="tab" data-tab="${t}">${{ avisos: 'Avisos', tareas: 'Tareas', habitos: 'Hábitos', concentracion: 'Concentración' }[t]}</button>`).join('')}
        </div>
        <div id="orgBody" class="org-body"></div>
        <p class="org-hint">Díselo a Chispa: «Pon un temporizador de 5 minutos», «Añade una tarea: comprar pan», «Quiero un hábito: tomar agua».</p>
      </div>
      <div id="orgRing" class="org-ring" role="alertdialog" aria-live="assertive" hidden></div>`;
    (document.querySelector('.stage-tools') || document.body).appendChild(root);
    this.$ = (id) => document.getElementById(id);
    this.$('orgBtn').addEventListener('click', () => { const p = this.$('orgPanel'); p.hidden = !p.hidden; this.$('orgBtn').setAttribute('aria-expanded', String(!p.hidden)); this.render(); });
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
    root.addEventListener('click', (e) => this._click(e));
    this.render();
  }

  subscribe() { this.send({ type: 'chispa_organizer', action: 'subscribe' }); this.infoCard?.refresh(); this.sendProfile(); window.chatApp?.memory?.onConnected(); }

  // El perfil activo viaja al servidor (solo el id; el texto del prompt vive allá) al conectar y cada vez que cambia.
  sendProfile() { const id = this.avatar?.persona?.id; if (id) this.send({ type: 'chispa_profile', profile: id }); }
  now() { return Date.now() / 1000 + this.skew; }

  handle(msg) {
    if (msg.event === 'info') { this.infoCard?.handle(msg.info); return; }
    if (msg.state) { this.state = msg.state; this.skew = msg.state.now - Date.now() / 1000; }
    if (msg.error) this._toast(msg.error);
    if (msg.event === 'due' && msg.item) this._ring(msg.item);
    this.render();
  }

  _toast(t) { const el = this.$('orgHint2') || Object.assign(document.createElement('p'), { id: 'orgHint2', className: 'org-hint' }); el.textContent = t; this.$('orgBody')?.prepend(el); }

  _ring(item) {
    this.ringing.set(item.id, item);
    this.avatar?.pulse?.('surprised', 2500);
    this._beepStart();
    this._renderRing();
  }
  _renderRing() {
    const box = this.$('orgRing'); const items = [...this.ringing.values()];
    box.hidden = !items.length;
    box.innerHTML = items.map((i) => `<div class="org-ring-item"><strong>${i.kind === 'alarma' ? '⏰' : i.kind === 'temporizador' ? '⏳' : i.kind === 'concentracion' ? '🎯' : '🔔'} ${esc(i.kind === 'concentracion' ? '¡Terminó tu sesión de concentración!' : i.text)}</strong><button type="button" class="chip" data-stop="${i.id}">Detener</button></div>`).join('');
    if (!items.length) this._beepStop();
  }
  _beepStart() {
    if (this.beepTimer) return;
    const beep = () => {
      try {
        this.audio = this.audio || new (window.AudioContext || window.webkitAudioContext)();
        const o = this.audio.createOscillator(), g = this.audio.createGain();
        o.frequency.value = 880; g.gain.value = 0.15; o.connect(g).connect(this.audio.destination);
        o.start(); o.stop(this.audio.currentTime + 0.25);
      } catch { /* sin audio: queda el aviso visual */ }
    };
    beep(); this.beepTimer = setInterval(beep, 900);
  }
  _beepStop() { clearInterval(this.beepTimer); this.beepTimer = null; }

  _click(e) {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.stop) { const id = +t.dataset.stop; this.ringing.delete(id); this._renderRing(); this.send({ type: 'chispa_organizer', action: 'stop', id }); this.avatar?.pulse?.('encouraging', 2500); }
    else if (t.dataset.del) this.send({ type: 'chispa_organizer', action: 'delete', id: +t.dataset.del });
    else if (t.dataset.done) { this.send({ type: 'chispa_organizer', action: 'complete_id', id: +t.dataset.done }); this.avatar?.pulse?.('happy', 2500); }
    else if (t.dataset.focus === 'start') this.send({ type: 'chispa_organizer', action: 'stop', id: 0 });
  }

  _tick() {
    const f = this.state.focus, bar = this.$('orgFocusBar');
    if (bar) { bar.hidden = !f; if (f) bar.textContent = `🎯 Concentración · ${fmtLeft(f.due - this.now())}`; }
    if (!this.$('orgPanel').hidden && (this.tab === 'avisos' || this.tab === 'concentracion')) this._updateCountdowns();
  }
  _updateCountdowns() { document.querySelectorAll('[data-due]').forEach((el) => { el.textContent = fmtLeft(+el.dataset.due - this.now()); }); }

  render() {
    const s = this.state, body = this.$('orgBody'); if (!body) return;
    const pend = s.tasks.filter((t) => !t.done).length, n = s.alerts.length;
    const c = this.$('orgCount'); c.hidden = !(pend || n); c.textContent = `· ${n + pend}`;
    for (const b of document.querySelectorAll('#orgPanel [data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === this.tab));
    if (this.$('orgPanel').hidden) return;
    let h = '';
    if (this.tab === 'avisos') {
      h = s.alerts.length ? s.alerts.map((a) => `<div class="org-row"><span>${KIND_LABEL[a.kind]}<b>${esc(a.text)}</b></span><span class="org-time">${a.kind === 'alarma' ? fmtClock(a.due) : ''} <em data-due="${a.due}">${fmtLeft(a.due - this.now())}</em></span><button type="button" class="chip" data-del="${a.id}" aria-label="Borrar">✕</button></div>`).join('') : '<p class="org-empty">Sin avisos. Pide uno: «Recuérdame sacar la ropa en 10 minutos».</p>';
      h += `<p class="org-count">${n} de 8 avisos</p>`;
    } else if (this.tab === 'tareas') {
      const groups = [['trabajo', 'Trabajo'], ['estudio', 'Estudio'], ['personal', 'Personal'], [null, 'Sin grupo']];
      h = s.tasks.length ? groups.map(([g, l]) => { const rows = s.tasks.filter((t) => (t.group || null) === g); return rows.length ? `<h4>${l}</h4>` + rows.map((t) => `<div class="org-row${t.done ? ' is-done' : ''}"><button type="button" class="chip" data-done="${t.id}" ${t.done ? 'disabled' : ''} aria-label="Hecha">${t.done ? '✓' : '○'}</button><span><b>${esc(t.text)}</b>${t.day ? ` <small>${esc(t.day)}</small>` : ''}</span><button type="button" class="chip" data-del="${t.id}" aria-label="Borrar">✕</button></div>`).join('') : ''; }).join('') : '<p class="org-empty">Sin tareas. Di: «Añade una tarea: comprar pan».</p>';
      h += `<p class="org-count">${pend} pendiente${pend === 1 ? '' : 's'}</p>`;
    } else if (this.tab === 'habitos') {
      const done = s.habits.filter((x) => x.doneToday).length, tot = s.habits.length;
      h = tot ? `<div class="org-progress"><span style="width:${Math.round(100 * done / tot)}%"></span></div><p class="org-count">Hoy ${done}/${tot} · ${Math.round(100 * done / tot)}%${done === tot ? ' — ¡excelente!' : done ? ' — ¡sigue así!' : ''}</p>`
        + s.habits.map((x) => `<div class="org-row${x.doneToday ? ' is-done' : ''}"><button type="button" class="chip" data-done="${x.id}" ${x.doneToday ? 'disabled' : ''}>${x.doneToday ? '✓' : '○'}</button><span><b>${esc(x.text)}</b>${x.goal ? ` <small>${esc(x.goal)}</small>` : ''}</span><span class="org-time">${x.weekCount}/7 sem.</span><button type="button" class="chip" data-del="${x.id}" aria-label="Borrar">✕</button></div>`).join('')
        : '<p class="org-empty">Sin hábitos. Di: «Quiero un hábito: tomar agua».</p>';
    } else {
      h = s.focus ? `<p class="org-big"><em data-due="${s.focus.due}">${fmtLeft(s.focus.due - this.now())}</em></p><button type="button" class="chip" data-del="${s.focus.id}">Cancelar sesión</button>` : '<p class="org-empty">Di: «Empieza el modo concentración» (25 minutos).</p>';
    }
    body.innerHTML = h;
  }
}
