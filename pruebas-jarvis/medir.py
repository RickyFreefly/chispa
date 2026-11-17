"""Mide la latencia de OpenJarvis frente a Ollama directo, con las mismas preguntas.

Correr en el Mac, con Ollama andando y `uv run jarvis serve` en otra terminal:
    python3 medir.py
Solo biblioteca estándar. Imprime una tabla y el veredicto frente a la meta de 3 s.
"""
import json
import time
import urllib.request

OLLAMA = "http://127.0.0.1:11434/api/chat"
JARVIS = "http://127.0.0.1:8000"
MODELO_OLLAMA = "gemma4:e4b"
META_S = 3.0

PREGUNTAS = [
    ("simple", "¿Cuál es la capital de Colombia? Responde en una frase."),
    ("conversación", "Dame una idea corta para organizar una mañana con tres tareas pendientes."),
    ("herramienta", "¿Cuánto es 847 por 362? Calcula el valor exacto."),
]


def _post(url, cuerpo, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        datos = json.loads(r.read())
    return time.time() - t0, datos


def modelo_jarvis():
    try:
        with urllib.request.urlopen(f"{JARVIS}/v1/models", timeout=10) as r:
            datos = json.loads(r.read()).get("data") or []
        return datos[0]["id"] if datos else "default"
    except Exception:
        return "default"


def probar_ollama(pregunta):
    dt, d = _post(OLLAMA, {"model": MODELO_OLLAMA, "stream": False,
                           "messages": [{"role": "user", "content": pregunta}]})
    return dt, (d.get("message") or {}).get("content", "")[:120]


def probar_jarvis(modelo, pregunta):
    dt, d = _post(f"{JARVIS}/v1/chat/completions",
                  {"model": modelo, "stream": False,
                   "messages": [{"role": "user", "content": pregunta}]})
    try:
        texto = d["choices"][0]["message"]["content"][:120]
    except Exception:
        texto = str(d)[:120]
    return dt, texto


def main():
    filas = []
    for nombre, motor in [("ollama", None), ("jarvis", modelo_jarvis())]:
        for tipo, preg in PREGUNTAS:
            try:
                dt, resp = (probar_ollama(preg) if nombre == "ollama"
                            else probar_jarvis(motor, preg))
                filas.append((nombre, tipo, dt, resp.replace("\n", " ")))
                print(f"  {nombre:<8}{tipo:<14}{dt:6.2f} s  {resp[:70]}")
            except Exception as e:
                filas.append((nombre, tipo, None, f"FALLÓ: {e}"))
                print(f"  {nombre:<8}{tipo:<14}  ----   FALLÓ: {e}")
    print(f"\nMeta para voz: {META_S:.0f} s por respuesta.")
    for nombre in ("ollama", "jarvis"):
        ts = [f[2] for f in filas if f[0] == nombre and f[2] is not None]
        if ts:
            peor = max(ts)
            veredicto = "sirve para voz" if peor <= META_S else "solo para tareas de fondo"
            print(f"  {nombre}: promedio {sum(ts)/len(ts):.2f} s, peor {peor:.2f} s → {veredicto}")
        else:
            print(f"  {nombre}: sin respuestas (¿está corriendo?)")


if __name__ == "__main__":
    main()
