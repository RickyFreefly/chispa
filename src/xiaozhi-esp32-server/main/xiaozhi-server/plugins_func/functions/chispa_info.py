"""Hora, fecha, calendario y clima para Chispa (Open-Meteo, sin clave)."""
from plugins_func.register import register_function, ToolType, ActionResponse, Action
from core.chispa import info
from config.logger import setup_logging

logger = setup_logging()
S = {"type": "string"}


def _fn(name, desc, props, required):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required}}}


def _run(f):
    try:
        t = f()
    except info.InfoError as e:
        t = str(e)
    except Exception as e:
        logger.bind(tag=__name__).error(f"info: {e}")
        t = "Uy, no pude consultar eso ahora. Inténtalo otra vez."
    return ActionResponse(Action.RESPONSE, t, t)


@register_function("que_hora_es", _fn("que_hora_es", "Dice la hora actual en Colombia. Ej: '¿qué hora es?'.", {}, []), ToolType.WAIT)
def que_hora_es():
    return _run(info.hora_texto)


@register_function("que_fecha_es", _fn("que_fecha_es", "Dice la fecha de hoy y el día de la semana, y si es festivo. Ej: '¿qué día es hoy?'.", {}, []), ToolType.WAIT)
def que_fecha_es():
    return _run(info.fecha_texto)


@register_function("proximo_festivo", _fn("proximo_festivo", "Dice cuál es el próximo festivo de Colombia. Ej: '¿cuándo es el próximo puente festivo?'.", {}, []), ToolType.WAIT)
def proximo_festivo():
    return _run(info.proximo_festivo)


@register_function("dias_para_fecha", _fn("dias_para_fecha", "Dice cuántos días faltan para una fecha. Ej: '¿cuántos días faltan para Navidad?' (25/12).",
                   {"fecha": {**S, "description": "AAAA-MM-DD o DD/MM"}}, ["fecha"]), ToolType.WAIT)
def dias_para_fecha(fecha: str = ""):
    return _run(lambda: info.dias_para(fecha))


@register_function("obtener_clima", _fn("obtener_clima", "Dice el clima de una ciudad (por defecto Bogotá), de hoy o de mañana. Ej: '¿va a llover mañana en Medellín?'.",
                   {"ciudad": {**S, "description": "ciudad; vacío = Bogotá"}, "cuando": {**S, "description": "hoy o mañana"}}, []), ToolType.WAIT)
def obtener_clima(ciudad: str = "", cuando: str = "hoy"):
    return _run(lambda: info.get_weather().clima(ciudad, cuando))
