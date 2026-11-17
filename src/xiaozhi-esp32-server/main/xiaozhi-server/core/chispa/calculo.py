"""Calculadora local de Chispa: exacta, instantánea y sin modelos de por medio.

Entiende la operación como la dice la gente («847 por 362», «el 23 por ciento de
4580000», «raíz cuadrada de 7921», con los números en palabras o en cifras) y la
evalúa con matemática real sobre un árbol de sintaxis acotado (nunca eval directo).
"""
import ast
import math
import operator
import re

from core.chispa.numeros import a_cifras


class CalculoError(Exception):
    pass


NO_ENTENDI = "No entendí la operación. Dímela como «cuánto es 25 por 4»."

_OPS_BIN = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
            ast.Div: operator.truediv, ast.Mod: operator.mod, ast.Pow: operator.pow}
_OPS_UN = {ast.USub: operator.neg, ast.UAdd: operator.pos}

# «por ciento» se procesa ANTES de convertir palabras a cifras («ciento» = 100)
_PORCENTAJE = [(r"\bpor\s+ciento\s+de\b", "% de"), (r"\bpor\s+ciento\b", "%"),
               (r"\bporciento\b", "%")]
_REEMPLAZOS = [
    (r"\braiz\s+cuadrada\s+de\b", "sqrt"), (r"\braíz\s+cuadrada\s+de\b", "sqrt"),
    (r"\belevado\s+a(\s+la)?\b", "**"), (r"\bal\s+cuadrado\b", "**2"),
    (r"\bal\s+cubo\b", "**3"),
    (r"\bmultiplicado\s+por\b", "*"), (r"\bpor\b", "*"), (r"\bx\b", "*"),
    (r"\bdividido\s+(por|entre)\b", "/"), (r"\bentre\b", "/"), (r"\bsobre\b", "/"),
    (r"\bmas\b", "+"), (r"\bmás\b", "+"), (r"\bmenos\b", "-"),
    (r"\bcoma\b", "."), (r"\bpunto\b", "."),
]
_RELLENO = re.compile(r"\b(cuanto|cuánto|es|son|cual|cuál|da|resultado|el|la|de|calcula|calcular|me|dime|oye|chispa)\b",
                      re.IGNORECASE)


def _a_expresion(texto):
    t = (texto or "").lower().replace("¿", " ").replace("?", " ")
    for pat, rep in _PORCENTAJE:
        t = re.sub(pat, rep, t)
    t = a_cifras(t)
    for pat, rep in _REEMPLAZOS:
        t = re.sub(pat, rep, t)
    t = _RELLENO.sub(" ", t)
    # porcentaje: «23 % * 4580000» o «23 % de 4580000» → (23/100)*4580000
    t = re.sub(r"(\d+(?:\.\d+)?)\s*%\s*(?:de\s*)?(\d+(?:\.\d+)?)", r"((\1)/100*(\2))", t)
    t = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"((\1)/100)", t)
    t = re.sub(r"\bsqrt\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?", r"sqrt(\1)", t)
    t = re.sub(r"(\d)\s*\.\s*(\d)", r"\1.\2", t)          # «3 . 5» → 3.5
    t = re.sub(r"(\d)\s+(\d)", r"\1\2", t)                # «306 614» → 306614
    t = re.sub(r"[^0-9+\-*/%().tqrs ]", " ", t)           # deja solo lo permitido (sqrt)
    return " ".join(t.split())


def _evaluar_nodo(n):
    if isinstance(n, ast.Expression):
        return _evaluar_nodo(n.body)
    if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
        return n.value
    if isinstance(n, ast.BinOp) and type(n.op) in _OPS_BIN:
        return _OPS_BIN[type(n.op)](_evaluar_nodo(n.left), _evaluar_nodo(n.right))
    if isinstance(n, ast.UnaryOp) and type(n.op) in _OPS_UN:
        return _OPS_UN[type(n.op)](_evaluar_nodo(n.operand))
    if (isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
            and n.func.id == "sqrt" and len(n.args) == 1):
        return math.sqrt(_evaluar_nodo(n.args[0]))
    raise CalculoError(NO_ENTENDI)


def calcular(texto):
    """Devuelve la frase con el resultado, lista para decirse en voz alta."""
    expr = _a_expresion(texto)
    if not re.search(r"\d", expr):
        raise CalculoError(NO_ENTENDI)
    try:
        arbol = ast.parse(expr, mode="eval")
        r = _evaluar_nodo(arbol)
    except CalculoError:
        raise
    except ZeroDivisionError:
        raise CalculoError("Eso es una división entre cero, y ahí las matemáticas se niegan.")
    except Exception:
        raise CalculoError(NO_ENTENDI)
    if isinstance(r, float) and r.is_integer():
        r = int(r)
    if isinstance(r, int):
        return f"Es {r} exacto."
    return f"Es aproximadamente {round(r, 2)}."
