// Tarjeta "Hoy": hora y fecha (reloj local, zona Bogotá), festivo y clima (los envía el servidor con Open-Meteo).
const TZ = 'America/Bogota';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class ChispaInfoCard {
  constructor({ send }) {
    this.send = send; this.info = null; this.askedAt = 0;
    const el = document.createElement('aside');
    el.id = 'infoCard'; el.className = 'info-card'; el.setAttribute('aria-label', 'Hora, fecha y clima');
    (document.getElementById('stagePanel') || document.body).appendChild(el);
    this.el = el;
    el.addEventListener('click', (e) => { if (e.target.closest('[data-refresh]')) this.refresh(); });
    this.render();
    setInterval(() => this._tick(), 1000);
  }

  refresh() { this.askedAt = Date.now(); this.send({ type: 'chispa_organizer', action: 'info' }); }
  handle(info) { this.info = info; this.render(); }

  _tick() {
    const c = this.el.querySelector('[data-clock]'); if (c) c.textContent = this._clock();
    if (Date.now() - this.askedAt > 10 * 60 * 1000 && this.info !== null) this.refresh();   // cada 10 min mientras haya conexión
  }
  _clock() { return new Date().toLocaleTimeString('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }); }
  _date() { return new Date().toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }); }

  render() {
    const i = this.info;
    let w = '<p class="info-muted">Clima: conéctate para verlo.</p>';
    if (i?.clima) { const c = i.clima; w = `<p class="info-weather"><b>${c.temp}°</b> ${esc(c.desc)} · ${esc(c.city)}<br><small>mín ${c.min}° · máx ${c.max}° · lluvia ${c.rain}%${c.rain >= 60 ? ' · ☂ paraguas' : ''}</small></p>`; }
    else if (i?.error) w = `<p class="info-muted">${esc(i.error)}</p>`;
    const fest = i ? (i.festivoHoy ? `<p class="info-fest">Hoy es festivo: ${esc(i.festivoHoy)}</p>` : `<p class="info-muted">Próximo festivo: ${esc(i.proximo.nombre)} · ${i.proximo.dias === 1 ? 'mañana' : 'en ' + i.proximo.dias + ' días'}</p>`) : '';
    this.el.innerHTML = `<div class="info-time"><span data-clock>${this._clock()}</span><button type="button" class="chip" data-refresh aria-label="Actualizar">↻</button></div><p class="info-date">${esc(this._date())}</p>${w}${fest}`;
  }
}
