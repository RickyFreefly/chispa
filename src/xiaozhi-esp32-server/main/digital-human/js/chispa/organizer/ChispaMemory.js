// Memoria de Chispa: casilla "Recordar" (opt-in, se guarda solo en este navegador) y botón "Borrar memoria".
// El servidor es quien resume y guarda (en español, en el equipo); aquí solo se envían decisiones de la persona.
const KEY = 'chispa.memory.enabled', PKEY = 'chispa.memory.person';
const clean = (v) => String(v || '').toLowerCase().replace(/[^a-záéíóúüñ ]/g, '').trim().split(/\s+/)[0].slice(0, 20);

export class ChispaMemory {
  constructor({ send }) {
    this.send = send; this.enabled = false; this.hasNotes = false; this.supported = true;
    try { this.enabled = localStorage.getItem(KEY) === '1'; } catch (e) { /* sin storage */ }
    this.person = '';
    try { this.person = clean(localStorage.getItem(PKEY)); } catch (e) { /* sin storage */ }
    this.personInput = document.getElementById('chispaPerson');
    if (this.personInput) { this.personInput.value = this.person; this.personInput.addEventListener('change', () => this.setPerson(this.personInput.value)); }
    this.toggle = document.getElementById('chispaMemToggle');
    this.forgetBtn = document.getElementById('chispaMemForget');
    this.note = document.getElementById('chispaMemNote');
    if (this.toggle) { this.toggle.checked = this.enabled; this.toggle.addEventListener('change', () => this.setEnabled(this.toggle.checked)); }
    if (this.forgetBtn) this.forgetBtn.addEventListener('click', () => this.forget());
    this._render();
  }
  // Al conectar: la preferencia guardada viaja al servidor (por defecto el servidor arranca con la memoria apagada).
  onConnected() {
    this.send({ type: 'chispa_memory', action: 'person', name: this.person });
    this.send({ type: 'chispa_memory', action: this.enabled ? 'enable' : 'status' });
  }
  // Memoria individual: solo el primer nombre, guardado en este navegador y enviado al servidor.
  setPerson(name) {
    this.person = clean(name);
    if (this.personInput) this.personInput.value = this.person;
    try { localStorage.setItem(PKEY, this.person); } catch (e) { /* ignorar */ }
    this.send({ type: 'chispa_memory', action: 'person', name: this.person });
  }
  setEnabled(on) {
    this.enabled = !!on;
    try { localStorage.setItem(KEY, this.enabled ? '1' : '0'); } catch (e) { /* ignorar */ }
    this.send({ type: 'chispa_memory', action: this.enabled ? 'enable' : 'disable' });
    this._render();
  }
  forget() {
    if (!window.confirm('¿Borrar lo que Chispa recuerda de este perfil? No se puede deshacer.')) return;
    this.send({ type: 'chispa_memory', action: 'forget' });
  }
  // Respuesta del servidor (también cuando la persona usa la voz: "olvida todo", "recuerda mis conversaciones").
  handle(msg) {
    this.supported = msg.supported !== false;
    if (this.supported && typeof msg.enabled === 'boolean' && msg.enabled !== this.enabled) {
      this.enabled = msg.enabled;
      try { localStorage.setItem(KEY, this.enabled ? '1' : '0'); } catch (e) { /* ignorar */ }
    }
    if (typeof msg.person === 'string' && msg.person !== this.person) {   // p. ej. la persona dijo "soy Sofi" por voz
      this.person = msg.person;
      if (this.personInput) this.personInput.value = this.person;
      try { localStorage.setItem(PKEY, this.person); } catch (e) { /* ignorar */ }
    }
    this.hasNotes = !!msg.has_notes;
    this.notes = msg.notes || '';
    this._render(msg.action === 'forget' ? (msg.forgotten ? 'Memoria borrada.' : 'No había nada guardado.') : '');
  }
  _render(flash = '') {
    if (this.toggle) { this.toggle.checked = this.enabled; this.toggle.disabled = !this.supported; }
    if (this.forgetBtn) this.forgetBtn.disabled = !this.supported;
    if (this.note) {
      this.note.textContent = flash || (!this.supported ? 'Memoria no disponible en esta configuración.'
        : this.enabled ? (this.hasNotes ? `Chispa recuerda cosas de ${this.person ? this.person : 'ti'}. Se guardan solo en este equipo.` : 'Memoria activada: aprenderá de lo que hablen.') : 'Memoria apagada: Chispa no guarda nada.');
    }
  }
}
