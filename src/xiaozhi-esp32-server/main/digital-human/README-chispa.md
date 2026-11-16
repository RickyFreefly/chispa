# CHISPA — Sistema de expresiones

Cara minimalista hecha de ojos animados (fondo negro, ojos blancos; lima #B6FF39, rosa #FF5C9A, azul #39A9FF, coral #FF4D4D solo en efectos). Motor independiente del renderer, listo para llevarlo a una pantalla de hardware.

## Estructura (`js/chispa/`)
- `config/`: `expressions.json` (catálogo de 20 expresiones), `faceGeometry.js`, `animationTokens.js`, `personalityProfiles.js`, `renderProfiles.js`
- `engine/`: `ChispaStateMachine`, `ChispaExpressionEngine`, `ChispaAnimationEngine`, `ChispaAudioReactive`, `ChispaEventAdapter`, `ChispaFaceProtocol`, `animations.js`
- `avatar/`: `ChispaFace`, `ChispaEyes`, `ChispaEyelids`, `ChispaMouth`, `ChispaAccents`, `ChispaFaceRenderer` (SVG), `ChispaCanvasRenderer`, `ChispaRasterizer` (sin DOM, referencia hardware)
- `demo/`: `ExpressionGallery`, `ExpressionPlayground`, `ExpressionLab`
- `tests/`: `node --test js/chispa/tests/*.test.mjs`
- `ChispaAvatar.js` (fachada), `ui.js` (estado, perfil y demo en la página principal). Lo anterior (robot) quedó en `_legacy/` solo como referencia.

## Estados y expresiones
Operativos (derivados de hechos reales): `offline > error > speaking > listening > thinking > idle`. `teaching` se superpone a `speaking`. Las expresiones emocionales son temporales y vuelven al estado operativo actual; en `offline` y `error` no se muestran.

## Cómo activar
- Evento real: `chatApp.chispa.setFact('connected'|'mic'|'processing'|'speaking', bool)`, `pulse('error', ms)`.
- Emoción: `chispa.machine.express('happy', {intensity, durationMs})`.
- Demo: botón «Modo demo» (insignia visible) o `chispa.demoExpress(id)` / `endDemo()`. **Expression Lab:** `expression-lab.html`.

## Conectar emociones desde el backend
Enviar por el websocket: `{"type":"chispa","intent":"encouraging","intensity":0.8,"durationMs":1500}` (`{"intent":"teaching","active":true|false}` para el auxiliar). Solo se aceptan ids de la lista del perfil (`backendAllowed`); `sad` y `angry` están excluidas por defecto; texto libre nunca dispara nada. Para añadir una expresión: entrada en `expressions.json` (+ ids de ojo/boca/efecto/animación si son nuevos; las pruebas fallan si falta alguno).

## Uso desde hardware
`ChispaFace` + `ChispaExpressionEngine` no usan DOM. Cada cambio emite `{"event":"face.update","expression","operationalState","intensity","transitionMs","durationMs"}` (`avatar.onFaceUpdate`, validable con `validateFaceUpdate`). `face.frame({simplify, segments})` devuelve primitivas normalizadas (100×75); `rasterize(prims, w, h, {mono})` produce el mapa de píxeles de referencia (320×240, 128×64 mono). Pendiente: portar a C++/LVGL.

## Notas honestas
La boca sigue el audio real del analizador Web Audio; sin señal queda en posición fija (no hay visemas: Kokoro no los entrega). La imagen de referencia de la especificación no llegó; el diseño sigue la descripción textual.
