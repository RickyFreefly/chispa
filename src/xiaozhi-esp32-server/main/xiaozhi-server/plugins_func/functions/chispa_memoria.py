"""Memoria de Chispa por voz: ver, borrar y activar lo que recuerda de la persona."""
import asyncio
import json

from plugins_func.register import register_function, ToolType, ActionResponse, Action
from config.logger import setup_logging

logger = setup_logging()


def _fn(name, desc, props, required):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required}}}


def _mem(conn):
    mem = getattr(conn, "memory", None)
    return mem if mem is not None and hasattr(mem, "forget") else None


def _push(conn):
    """Avisa a la página para que su casilla refleje el estado real."""
    try:
        from core.handle.textHandler.chispaMemoryHandler import memory_state
        asyncio.run_coroutine_threadsafe(
            conn.websocket.send(json.dumps(memory_state(conn, action="voice"), ensure_ascii=False)), conn.loop)
    except Exception as e:
        logger.bind(tag=__name__).warning(f"no se pudo avisar a la página: {e}")


def _say(t):
    return ActionResponse(Action.RESPONSE, t, t)


olvidar_desc = _fn("olvidar_memoria", "Borra todo lo que Chispa recuerda de la persona. Solo se usa cuando la persona pide explícitamente que olvides o borres su memoria: 'olvida todo', 'borra lo que sabes de mí', 'olvídame'.",
                   {"todo": {"type": "boolean", "description": "true si pide olvidar a todos los perfiles; por defecto false"}}, [])


@register_function("olvidar_memoria", olvidar_desc, ToolType.SYSTEM_CTL)
def olvidar_memoria(conn, todo=False):
    mem = _mem(conn)
    if mem is None:
        return _say("Ahora mismo no tengo memoria activada, así que no guardo nada.")
    n = mem.forget(everything=bool(todo))
    _push(conn)
    return _say("Listo, ya olvidé lo que sabía de ti." if n else "No tenía nada guardado sobre ti.")


recuerdas_desc = _fn("que_recuerdas", "Dice en voz alta lo que Chispa recuerda de la persona. Solo cuando la persona pide un repaso GENERAL: '¿qué sabes de mí?', '¿qué recuerdas de mí?'. Una pregunta concreta como '¿cómo me llamo?' o '¿qué me gusta?' NO la usa: se contesta directo con tus notas.", {}, [])


@register_function("que_recuerdas", recuerdas_desc, ToolType.SYSTEM_CTL)
def que_recuerdas(conn):
    mem = _mem(conn)
    if mem is None or not mem.enabled:
        return _say("Todavía no estoy guardando recuerdos tuyos. Si quieres que te recuerde, dime: recuerda nuestras conversaciones.")
    t = mem.spoken_notes()
    return _say(f"Esto es lo que recuerdo de ti: {t}." if t else "Todavía no tengo nada guardado sobre ti.")


activar_desc = _fn("activar_memoria", "Enciende o apaga la memoria de Chispa. Se usa con 'recuerda nuestras conversaciones', 'acuérdate de mí' (activar) o 'ya no me recuerdes', 'deja de recordar' (apagar).",
                   {"activar": {"type": "boolean", "description": "true para encender, false para apagar"}}, ["activar"])


@register_function("activar_memoria", activar_desc, ToolType.SYSTEM_CTL)
def activar_memoria(conn, activar=True):
    mem = _mem(conn)
    if mem is None:
        return _say("Mi memoria no está disponible en esta configuración.")
    if isinstance(activar, str):
        activar = activar.strip().lower() in ("true", "sí", "si", "1")
    mem.set_enabled(bool(activar))
    if activar:
        mem._load()
    _push(conn)
    return _say("Listo, desde ahora recordaré lo importante de nuestras conversaciones." if activar
                else "Listo, dejo de guardar recuerdos. Lo que ya tenía guardado lo puedes borrar cuando quieras.")


persona_desc = _fn("cambiar_persona", "Cambia a la memoria de otra persona que usa el robot. Se usa cuando alguien dice quién es: 'soy Sofi', 'me llamo Pedro', 'ahora habla Camila'. Solo el primer nombre.",
                   {"nombre": {"type": "string", "description": "primer nombre de la persona"}}, ["nombre"])


@register_function("cambiar_persona", persona_desc, ToolType.SYSTEM_CTL)
def cambiar_persona(conn, nombre=""):
    from core.providers.memory.mem_chispa.mem_chispa import normalize_person
    mem = _mem(conn)
    nom = normalize_person(nombre)
    if not nom:
        return _say("No entendí tu nombre. Dime solo tu primer nombre, por favor.")
    if mem is None:
        return _say(f"¡Mucho gusto, {nom.capitalize()}!")
    mem.switch_person(nom, conn.dialogue.dialogue)
    _push(conn)
    if mem.enabled and mem.notes:
        return _say(f"¡Qué bueno verte otra vez, {nom.capitalize()}!")
    return _say(f"¡Mucho gusto, {nom.capitalize()}!" + (" Si quieres que te recuerde, dime: recuerda nuestras conversaciones." if not mem.enabled else ""))
