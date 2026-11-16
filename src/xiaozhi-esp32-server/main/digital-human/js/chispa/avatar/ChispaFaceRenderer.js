// Render SVG con pool de elementos (sin crear/borrar nodos por cuadro => sin fugas).
import { LOGICAL } from '../config/faceGeometry.js';
const NS = 'http://www.w3.org/2000/svg';
const d = (pts, close) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('') + (close ? 'Z' : '');

export class ChispaFaceRenderer {
  constructor(host, { palette, background = '#000' } = {}) {
    this.host = host; this.palette = palette; this.pool = []; this.used = 0;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${LOGICAL.w} ${LOGICAL.h}`);
    this.svg.setAttribute('role', 'img'); this.svg.setAttribute('aria-label', 'Cara de Chispa');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.style.cssText = 'width:100%;height:100%;display:block';
    this.bg = document.createElementNS(NS, 'rect');
    this.bg.setAttribute('width', LOGICAL.w); this.bg.setAttribute('height', LOGICAL.h); this.bg.setAttribute('fill', background);
    this.svg.appendChild(this.bg);
    host.innerHTML = ''; host.appendChild(this.svg);
  }
  setPalette(p) { this.palette = p; this.bg.setAttribute('fill', p.bg || '#000'); }
  _el(i) {
    if (!this.pool[i]) { const el = document.createElementNS(NS, 'path'); this.svg.appendChild(el); this.pool[i] = el; }
    return this.pool[i];
  }
  render(frame) {
    let i = 0;
    for (const pr of frame.prims) {
      const el = this._el(i++), col = this.palette[pr.color] || '#fff';
      el.style.display = '';
      if (pr.type === 'poly') { el.setAttribute('d', d(pr.points, true)); el.setAttribute('fill', col); el.setAttribute('stroke', 'none'); }
      else if (pr.type === 'line') { el.setAttribute('d', d(pr.points, false)); el.setAttribute('fill', 'none'); el.setAttribute('stroke', col); el.setAttribute('stroke-width', pr.width); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round'); }
      else { // círculo como dos arcos
        const { cx, cy, r } = pr;
        el.setAttribute('d', `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`);
        if (pr.fill) { el.setAttribute('fill', col); el.setAttribute('stroke', 'none'); } else { el.setAttribute('fill', 'none'); el.setAttribute('stroke', col); el.setAttribute('stroke-width', pr.width || 1); }
      }
      el.setAttribute('opacity', Math.max(0, Math.min(1, pr.alpha)).toFixed(3));
    }
    for (let j = i; j < this.used; j++) this.pool[j].style.display = 'none';
    this.used = i;
  }
  destroy() { this.svg.remove(); this.pool = []; }
}
