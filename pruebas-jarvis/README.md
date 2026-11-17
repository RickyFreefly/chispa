# Prueba de OpenJarvis junto a Chispa

OpenJarvis (Stanford, Apache 2.0) está clonado en `../openjarvis`. La idea: probarlo
**en paralelo**, sin tocar nada de Chispa, y decidir con números si entra como
«segundo cerebro» para tareas con herramientas (búsqueda, archivos, correo por MCP).

## Pasos (en tu Mac)

1. Instalar uv si falta: `brew install uv`
2. `cd ~/Documents/chispabot/openjarvis`
3. `uv sync` (instala dependencias; tarda la primera vez)
4. `uv run jarvis init` (detecta tu hardware y genera la configuración)
5. `uv run jarvis serve --port 8001` (deja esta terminal abierta; backend en el puerto 8001)
6. En otra terminal: `python3 ~/Documents/chispabot/pruebas-jarvis/medir.py`

## Cómo leer el resultado

- Si las respuestas de `jarvis` quedan cerca de las de `ollama` (≤ 3 s), puede
  atender también conversación.
- Si tarda más (lo esperable con agentes multipaso), el plan es conectarlo solo para
  tareas pesadas: el servidor de Chispa ya trae un proveedor LLM tipo OpenAI, así que
  apuntarlo a `http://127.0.0.1:8000/v1` es un cambio de configuración.

## Si decide quedarse

Siguiente paso: una función de Chispa («investiga…», «revisa…») que enrute esas
peticiones a OpenJarvis y deje la charla rápida en Ollama directo.
