"""Segundo cerebro de Chispa: delega en OpenJarvis las tareas que necesitan herramientas."""
from plugins_func.register import register_function, ToolType, ActionResponse, Action
from core.chispa import jarvis
from config.logger import setup_logging

logger = setup_logging()

ESQUEMA = {"type": "function", "function": {
    "name": "resolver_con_herramientas",
    "description": ("Busca información actual en internet o lee y analiza archivos del computador. "
                    "NO es para cálculos (para eso está la función calcular). "
                    "Ej: 'investiga el precio del dólar', 'busca en internet quién ganó ayer'."),
    "parameters": {"type": "object", "properties": {
        "peticion": {"type": "string", "description": "la tarea completa, con los números SIEMPRE en cifras (847, no 'ochocientos cuarenta y siete')"}},
        "required": ["peticion"]}}}


@register_function("resolver_con_herramientas", ESQUEMA, ToolType.WAIT)
def resolver_con_herramientas(peticion: str = ""):
    try:
        texto = jarvis.consultar(peticion)
    except jarvis.JarvisError as e:
        texto = str(e)
    except Exception as e:
        logger.bind(tag=__name__).error(f"jarvis: {e}")
        texto = jarvis.NO_DISPONIBLE
    return ActionResponse(Action.RESPONSE, texto, texto)
