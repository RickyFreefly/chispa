// Mensaje portable "face.update": JSON sin dependencia de WebSocket, MQTT, serie, etc.
export function toFaceUpdate(fs) {
  return { event: 'face.update', expression: fs.expression, operationalState: fs.operationalState,
    intensity: Math.round(fs.intensity * 100) / 100, transitionMs: fs.transitionMs, durationMs: fs.durationMs };
}
export function validateFaceUpdate(msg, catalog) {
  const errors = [];
  if (!msg || typeof msg !== 'object') return { ok: false, errors: ['mensaje no es un objeto'] };
  if (msg.event !== 'face.update') errors.push('event debe ser "face.update"');
  if (!catalog.expressions[msg.expression]) errors.push(`expression desconocida: ${msg.expression}`);
  if (!catalog.groups.operational.includes(msg.operationalState)) errors.push(`operationalState inválido: ${msg.operationalState}`);
  for (const k of ['intensity', 'transitionMs', 'durationMs']) if (typeof msg[k] !== 'number' || !isFinite(msg[k]) || msg[k] < 0) errors.push(`${k} inválido`);
  if (typeof msg.intensity === 'number' && msg.intensity > 1.5) errors.push('intensity fuera de rango (0..1.5)');
  return { ok: errors.length === 0, errors };
}
