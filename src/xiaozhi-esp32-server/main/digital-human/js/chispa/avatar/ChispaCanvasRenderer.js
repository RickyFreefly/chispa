// Render Canvas 2D de las mismas primitivas (alternativa al SVG; útil para escalar a pantallas pequeñas).
import { LOGICAL } from '../config/faceGeometry.js';
export class ChispaCanvasRenderer {
  constructor(canvas, { palette }) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.palette = palette; }
  setPalette(p) { this.palette = p; }
  render(frame) {
    const { ctx, canvas } = this, s = Math.min(canvas.width / LOGICAL.w, canvas.height / LOGICAL.h);
    const ox = (canvas.width - LOGICAL.w * s) / 2, oy = (canvas.height - LOGICAL.h * s) / 2;
    ctx.fillStyle = this.palette.bg || '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const pr of frame.prims) {
      const col = this.palette[pr.color] || '#fff';
      ctx.globalAlpha = Math.max(0, Math.min(1, pr.alpha)); ctx.fillStyle = col; ctx.strokeStyle = col;
      ctx.beginPath();
      if (pr.type === 'circle') { ctx.arc(ox + pr.cx * s, oy + pr.cy * s, pr.r * s, 0, Math.PI * 2); if (pr.fill) ctx.fill(); else { ctx.lineWidth = (pr.width || 1) * s; ctx.stroke(); } continue; }
      pr.points.forEach((p, i) => (i ? ctx.lineTo(ox + p[0] * s, oy + p[1] * s) : ctx.moveTo(ox + p[0] * s, oy + p[1] * s)));
      if (pr.type === 'poly') { ctx.closePath(); ctx.fill(); } else { ctx.lineWidth = pr.width * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
}
