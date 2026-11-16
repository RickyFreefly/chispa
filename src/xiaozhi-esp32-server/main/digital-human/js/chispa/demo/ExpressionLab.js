// CHISPA Expression Lab: arranque. Página separada de la experiencia normal: sin websocket, sin chat, sin eventos reales.
import { loadCatalog } from '../ChispaAvatar.js';
import { ExpressionGallery } from './ExpressionGallery.js';
import { ExpressionPlayground } from './ExpressionPlayground.js';

const reduced = (typeof matchMedia !== 'undefined') ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
(async () => {
  const catalog = await loadCatalog();
  const pg = new ExpressionPlayground({ catalog });
  await pg.init();
  const gallery = new ExpressionGallery(document.getElementById('lab-gallery'), catalog, { reduced: () => reduced.matches, onSelect: (id) => pg.select(id) });
  pg.onSelect = (id) => gallery.setActive(id);
  gallery.setActive(pg.current);
  window.chispaLab = { pg, gallery, catalog };   // para depuración
})().catch((e) => { document.getElementById('lab-error').hidden = false; document.getElementById('lab-error').textContent = 'Error: ' + e.message; console.error(e); });
