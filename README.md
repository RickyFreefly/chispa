# Chispa — robot de escritorio con IA de voz (Colombia)

Chispa es un asistente de voz con cara animada que corre **100 % local** en un computador
(sin nube, sin costo por uso), pensado como kit educativo de robot para el mercado
colombiano. Está construido sobre el ecosistema de código abierto
[xiaozhi-esp32](https://github.com/78/xiaozhi-esp32) (MIT), siguiendo como referencia el
robot [Troko](https://trokotec.com/troko/).

## Objetivo final

Un robot físico de escritorio (ESP32 + pantalla + micrófono + parlante) que:

1. Conversa en español colombiano por voz, con personalidad propia: profesional, cálido,
   humor ligero, discreto cuando trabajas.
2. Organiza el día: tareas, hábitos, temporizadores, alarmas, modo concentración, y avisa
   proactivamente con voz.
3. Muestra una cara animada con emociones (25 expresiones), que duerme en reposo y se
   distrae sola cuando está inactiva.
4. Se activa con «hola chispa» y descansa con «adiós chispa».
5. Funciona sin internet y sin enviar datos a terceros: reconocimiento, razonamiento y
   voz corren en la máquina local.

## Estado actual (nov 2026)

**Funciona hoy, verificado en vivo, como asistente virtual de escritorio (~80 %):**

- Ciclo completo de voz: Silero VAD → Vosk español (modelo grande `vosk-model-es-0.42`)
  → Ollama (`gemma4:e4b`) → Kokoro TTS, todo local.
- 18 funciones por voz: organizador del día (SQLite), información, memoria por usuario,
  animaciones de la cara.
- Avisos proactivos hablados (recordatorios, temporizadores, alarmas, fin de concentración).
- Reposo por voz: «hola chispa» despierta (detector Vosk con gramática restringida),
  «adiós chispa» duerme; en reposo solo escucha la frase de despertar.
- Normalización de texto para la voz: horas, dinero, porcentajes y números a palabras
  («$50.000» → «cincuenta mil pesos»), limpieza de emojis y markdown.
- Cara web (`digital-human`): 25 expresiones, cara dormida con zzz, distracción en
  inactividad (pelota, oveja), panel «Mi día».
- Pruebas: 52 tests de servidor (Python) y 59 de la cara (Node) en verde, más un kit de
  comparación de voces y reconocimiento en `pruebas-voz/`.

**Pendiente:**

- [ ] Prueba de punta a punta guiada y medición de calidad: WER de Vosk, voces de Kokoro,
      latencia por respuesta (meta < 3 s). Kit listo en `pruebas-voz/`.
- [ ] Hábitos con hora y aviso propio.
- [ ] Entrega de avisos al robot físico (hoy solo llegan a la página abierta).
- [ ] Firmware ESP32 compilado con nombre y palabra de activación propios.
- [ ] Portar la cara a C++/LVGL para la pantalla del robot.
- [ ] Compra de piezas y carta de no pertinencia de homologación a la CRC.
- [ ] Más funciones del manual de Troko (hoy está cubierta «Organización del día»).

## Arquitectura

```
Persona (voz)
   │
   ▼
Servidor local (Python, websocket) ─ src/xiaozhi-esp32-server/main/xiaozhi-server
   ├─ Oído:    Silero VAD + Vosk español (en reposo, solo «hola chispa»)
   ├─ Cerebro: Ollama con gemma4:e4b + 18 funciones (function calling)
   ├─ Memoria: por usuario (ChispaMemory) · Organizador en SQLite
   └─ Voz:     Kokoro (local) con normalizador de texto en español
   │
   ▼
Página web (cara + panel) ─ src/xiaozhi-esp32-server/main/digital-human
   └─ Avatar con expresiones, estados (escucha/piensa/habla/reposo) y avisos
```

## Estructura del repositorio

| Ruta | Qué es |
|---|---|
| `src/xiaozhi-esp32-server/main/xiaozhi-server/` | Servidor de voz/IA (Python). Lo propio de Chispa vive en `core/chispa/` y `plugins_func/functions/chispa_*.py` |
| `src/xiaozhi-esp32-server/main/digital-human/` | Cara animada y panel web (JS sin frameworks) |
| `pruebas-voz/` | Kit para comparar voces (TTS) y reconocimiento (ASR) |
| `guia-troko-pines.md` | Piezas, pines y compilación del firmware |
| `LOCAL_SETUP.md` | Puesta en marcha local detallada |

## Cómo correr (resumen)

1. Requisitos: Python 3.10+, [Ollama](https://ollama.com) con `gemma4:e4b`,
   Kokoro-FastAPI en Docker (puerto 8880), modelos Vosk en
   `xiaozhi-server/models/vosk/` (descargar de [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models):
   `vosk-model-es-0.42` y `vosk-model-small-es-0.42`; no van en el repo).
2. `./run-server.sh` levanta el servidor; la cara se abre desde `digital-human/index.html`.
3. Tests: `python3 -m unittest discover -s tests -p "test_chispa_*.py"` (en `xiaozhi-server/`)
   y `node --test js/chispa/tests/*.test.mjs` (en `digital-human/`).

Detalle completo en `LOCAL_SETUP.md`.

## Licencias

Proyecto derivado de repositorios MIT (xiaozhi-esp32 y xiaozhi-esp32-server). Conservar
los archivos LICENSE de cada repositorio en cualquier producto derivado.
