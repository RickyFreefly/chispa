"""Animaciones y caras por voz: la pelota, las ovejas y descubrir. La página dibuja la escena; aquí solo se pide."""
import asyncio
import json
import unicodedata

from plugins_func.register import register_function, ToolType, ActionResponse, Action
from config.logger import setup_logging

logger = setup_logging()

# nombre canónico -> (intent de la página, duración ms, lo que Chispa dice)
ESCENAS = {
    "pelota": ("ball", 6000, "¡A jugar con la pelota! Mira cómo rebota de un lado a otro. ¡Boing, boing, boing!"),
    "ovejas": ("sheep", 8000, "Cerremos los ojitos. Una oveja salta la cerca. Dos ovejas. Tres ovejas. Cuatro. Cinco. Qué sueñito."),
    "descubre": ("discover", 5000, "A ver qué descubro. Mmm, busco y busco. ¡Eureka! ¡Descubrí algo!"),
}
SINONIMOS = {
    "pelota": "pelota", "pelotita": "pelota", "balon": "pelota", "bola": "pelota", "ball": "pelota", "rebota": "pelota",
    "oveja": "ovejas", "ovejas": "ovejas", "ovejita": "ovejas", "ovejitas": "ovejas", "contar ovejas": "ovejas", "dormir": "ovejas",
    "descubre": "descubre", "descubrir": "descubre", "descubrimiento": "descubre", "explora": "descubre", "explorar": "descubre", "investiga": "descubre", "busca": "descubre", "eureka": "descubre",
}


def _norm(t):
    t = unicodedata.normalize("NFD", str(t or "").strip().lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def resolver(nombre):
    n = _norm(nombre)
    if n in SINONIMOS:
        return SINONIMOS[n]
    for palabra in n.split():                      # "juega con la pelota" -> pelota
        if palabra in SINONIMOS:
            return SINONIMOS[palabra]
    return None


def _fn(name, desc, props, required):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required}}}


animacion_desc = _fn(
    "mostrar_animacion",
    "Hace que Chispa muestre una animación en su cara y diga una frase corta. Se usa cuando la persona pide jugar con la pelota ('juega con la pelota', 'rebota la pelota'), contar ovejas o dormir ('cuenta ovejas', 'quiero dormir'), o que descubras algo ('descubre algo', 'explora', 'investiga').",
    {"nombre": {"type": "string", "enum": ["pelota", "ovejas", "descubre"], "description": "la animación a mostrar"}}, ["nombre"])


@register_function("mostrar_animacion", animacion_desc, ToolType.SYSTEM_CTL)
def mostrar_animacion(conn, nombre=""):
    clave = resolver(nombre)
    if not clave:
        t = "Sé jugar con la pelota, contar ovejas y descubrir cosas. ¿Cuál quieres?"
        return ActionResponse(Action.RESPONSE, t, t)
    intent, ms, texto = ESCENAS[clave]
    try:
        msg = json.dumps({"type": "chispa", "intent": intent, "intensity": 1, "durationMs": ms}, ensure_ascii=False)
        asyncio.run_coroutine_threadsafe(conn.websocket.send(msg), conn.loop)
    except Exception as e:
        logger.bind(tag=__name__).warning(f"no se pudo enviar la animación: {e}")
    return ActionResponse(Action.RESPONSE, texto, texto)
