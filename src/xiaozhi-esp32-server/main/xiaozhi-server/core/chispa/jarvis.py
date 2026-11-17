"""Puente con OpenJarvis: el «segundo cerebro» de Chispa para tareas con herramientas.

Habla con el servidor local de OpenJarvis (API compatible con OpenAI) para cálculos
exactos, búsquedas y archivos. Solo biblioteca estándar; el acceso a red se inyecta
(`http_post`) para poder probar sin servidor.
"""
import json
import urllib.request

URL = "http://127.0.0.1:8000"
MODELO = "gemma4:e4b"
TIMEOUT_S = 60
INSTRUCCION = (
    "Responde en español y breve: una o dos frases, sin listas ni markdown, "
    "porque la respuesta se lee en voz alta. Si usas herramientas, da solo el resultado."
)
NO_DISPONIBLE = "Mi segundo cerebro no está disponible ahora. Revisa que OpenJarvis esté corriendo."
MAX_LARGO = 600


class JarvisError(Exception):
    pass


def _http_post(url, cuerpo, timeout):
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def consultar(peticion, http_post=_http_post, timeout=TIMEOUT_S):
    """Manda la petición a OpenJarvis y devuelve una respuesta corta para decir en voz alta."""
    if not (peticion or "").strip():
        raise JarvisError("No entendí qué debo resolver. ¿Me lo repites?")
    cuerpo = {"model": MODELO, "stream": False, "messages": [
        {"role": "system", "content": INSTRUCCION},
        {"role": "user", "content": peticion.strip()}]}
    try:
        datos = http_post(f"{URL}/v1/chat/completions", cuerpo, timeout)
        texto = (datos.get("choices") or [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        raise JarvisError(NO_DISPONIBLE) from e
    texto = " ".join((texto or "").split())
    if not texto:
        raise JarvisError("No obtuve respuesta del segundo cerebro. Inténtalo de nuevo.")
    return texto[:MAX_LARGO]
