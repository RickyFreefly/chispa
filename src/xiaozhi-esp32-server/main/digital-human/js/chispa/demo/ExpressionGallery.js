// Galería: una tarjeta animada por expresión (nombre en español, id técnico). Un solo rAF para todas.
import { ChispaFace } from '../avatar/ChispaFace.js';
import { ChispaFaceRenderer } from '../avatar/ChispaFaceRenderer.js';
import { ChispaExpressionEngine } from '../engine/ChispaExpressionEngine.js';
import { ChispaAnimationEngine } from '../engine/ChispaAnimationEngine.js';
import { paletteFor } from '../config/renderProfiles.js';

const GROUP_TITLES = { emotional: 'Emocionales', operational: 'Operativas', auxiliary: 'Auxiliar' };

export class ExpressionGallery {
  constructor(root, catalog, { onSelect, reduced = () => false } = {}) {
    this.root = root; this.catalog = catalog; this.onSelect = onSelect; this.reduced = reduced;
    this.engine = new ChispaExpressionEngine(catalog); this.cards = new Map(); this.elapsed = 0;
    this._build();
    this.loop = new ChispaAnimationEngine((dt) => this._tick(dt)); this.loop.start();
  }
  _build() {
    this.root.innerHTML = '';
    const palette = paletteFor(this.catalog.design, false);
    for (const [group, ids] of Object.entries(this.catalog.groups)) {
      const h = document.createElement('h3'); h.textContent = GROUP_TITLES[group] || group; h.className = 'gal-title'; this.root.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'gal-grid'; this.root.appendChild(grid);
      for (const id of ids) {
        const def = this.catalog.expressions[id];
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gal-card'; btn.dataset.id = id; btn.setAttribute('aria-pressed', 'false');
        btn.innerHTML = `<div class="gal-face"></div><span class="gal-name">${def.label}</span><code class="gal-id">${id}</code>`;
        grid.appendChild(btn);
        const face = new ChispaFace({ segments: 32 }); face.setTarget(this.engine.resolveStatic(id), { snap: true });
        const renderer = new ChispaFaceRenderer(btn.querySelector('.gal-face'), { palette, background: this.catalog.design.background });
        btn.addEventListener('click', () => this.onSelect && this.onSelect(id));
        this.cards.set(id, { btn, face, renderer, def });
      }
    }
  }
  setActive(id) { for (const [k, c] of this.cards) c.btn.setAttribute('aria-pressed', String(k === id)); }
  _tick(dt) {
    this.elapsed += dt;
    const red = this.reduced();
    for (const [id, c] of this.cards) {
      // las emociones puntuales se repiten cada pocos segundos para que la vista previa siga viva
      if (c.def.kind === 'emotion') { const cycle = c.def.durationMs / 1000 + 1.6; if ((c.age = (c.age || 0) + dt) > cycle) { c.age = 0; c.face.setTarget(this.engine.resolveStatic(id), { restart: true }); } }
      c.face.update(dt, { reduced: red, level: id === 'speaking' ? 0.5 + 0.4 * Math.sin(this.elapsed * 7) : 0, audioAvailable: false });
      c.renderer.render(c.face.frame());
    }
  }
  destroy() { this.loop.stop(); for (const c of this.cards.values()) c.renderer.destroy(); this.cards.clear(); this.root.innerHTML = ''; }
}
