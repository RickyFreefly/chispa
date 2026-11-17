"""Calculadora por voz de Chispa: matemática real, local e instantánea."""
from plugins_func.register import register_function, ToolType, ActionResponse, Action
from core.chispa import calculo
from config.logger import setup_logging

logger = setup_logging()

ESQUEMA = {"type": "function", "function": {
    "name": "calcular",
    "description": ("Hace cálculos matemáticos exactos: multiplicar, sumar, restar, dividir, "
                    "porcentajes, raíces y potencias. Úsala para CUALQUIER operación con números. "
                    "Ej: 'cuánto es 847 por 362', 'el 23 por ciento de 4580000', 'raíz cuadrada de 7921'."),
    "parameters": {"type": "object", "properties": {
        "operacion": {"type": "string",
                      "description": "la operación tal como la dijo la persona, sin cambiarle nada"}},
        "required": ["operacion"]}}}


@register_function("calcular", ESQUEMA, ToolType.WAIT)
def calcular(operacion: str = ""):
    try:
        texto = calculo.calcular(operacion)
    except calculo.CalculoError as e:
        texto = str(e)
    except Exception as e:
        logger.bind(tag=__name__).error(f"calculo: {e}")
        texto = calculo.NO_ENTENDI
    return ActionResponse(Action.RESPONSE, texto, texto)
