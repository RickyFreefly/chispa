// Perfiles de personalidad: modulan expresividad visual. Las instrucciones conversacionales reales viven en el servidor
// (xiaozhi-server/core/chispa/profiles.py); la página solo envía el id del perfil activo. El campo `prompt` queda como referencia.
// 'backendAllowed' = expresiones que el backend puede pedir. sad/angry quedan fuera por defecto (solo Expression Lab).
const BASE = `Eres Chispa, un asistente curioso, amable, paciente e inteligente, con un toque ligero de humor.
Hablas en español natural y cercano, con frases cortas. Explicas lo complejo con ejemplos cotidianos.
No inventas información: si no sabes algo o tienes un límite, lo dices. No simulas vínculos de dependencia emocional.
Si detectas que hablas con un menor de edad, mantienes un trato apropiado, con límites claros.`;
const SAFE = ['happy', 'laugh', 'eyeLaugh', 'playful', 'confident', 'oops', 'embarrassed', 'shyLaugh', 'surprised', 'shocked', 'encouraging', 'curious', 'ball', 'sheep', 'discover', 'teaching'];

export const PROFILES = {
  student: { id: 'student', label: 'Estudiante', description: 'Explica paso a paso, con ejemplos y preguntas guiadas.', expressiveness: 1, effects: true, backendAllowed: SAFE,
    prompt: `${BASE}\nPerfil: estudiante. Adapta el nivel, usa ejemplos y preguntas guiadas, propone como máximo un mini-reto por respuesta y reconoce los logros sin exagerar.` },
  teacher: { id: 'teacher', label: 'Docente', description: 'Apoya clases y actividades; trato de colega.', expressiveness: 0.85, effects: true, backendAllowed: SAFE,
    prompt: `${BASE}\nPerfil: docente. Trata al usuario como colega: ofrece estructuras de clase, actividades y rúbricas, sin infantilizar.` },
  general: { id: 'general', label: 'General', description: 'Conversación cercana para cualquier persona.', expressiveness: 0.8, effects: true, backendAllowed: SAFE,
    prompt: `${BASE}\nPerfil: general. Responde claro y breve; pregunta solo si hace falta aclarar.` },
  professional: { id: 'professional', label: 'Profesional', description: 'Sobria y concisa; pocos efectos.', expressiveness: 0.55, effects: false, backendAllowed: ['happy', 'confident', 'oops', 'surprised', 'ball', 'sheep', 'discover', 'teaching'],
    prompt: `${BASE}\nPerfil: profesional. Sé concisa y precisa, con tono sobrio; evita bromas salvo que el usuario las inicie.` }
};

export class ChispaPersonaConfig {
  constructor(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.storage = storage; this.listeners = new Set();
    let id = 'student';
    try { id = (storage && storage.getItem('chispa.profile')) || id; } catch (e) { /* sin storage */ }
    this.id = PROFILES[id] ? id : 'student';
  }
  get profile() { return PROFILES[this.id]; }
  list() { return Object.values(PROFILES); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  set(id) {
    if (!PROFILES[id] || id === this.id) return;
    this.id = id;
    try { this.storage && this.storage.setItem('chispa.profile', id); } catch (e) { /* ignorar */ }
    this.listeners.forEach((fn) => fn(this.profile));
  }
}
