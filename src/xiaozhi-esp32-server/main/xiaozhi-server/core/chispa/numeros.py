"""Convierte números dichos en palabras («siete mil novecientos veintiuno») a cifras.

Determinista y solo biblioteca estándar: no depende de ningún modelo de lenguaje.
Pensado para expresiones de cálculo; no se aplica a texto libre (un «una tarea»
no debe volverse «1 tarea»).
"""
import re
import unicodedata

_U = {"cero": 0, "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4,
      "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
      "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
      "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
      "veinte": 20, "veintiun": 21, "veintiuno": 21, "veintiuna": 21,
      "veintidos": 22, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25,
      "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29}
_D = {"treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60,
      "setenta": 70, "ochenta": 80, "noventa": 90}
_C = {"ciento": 100, "doscientos": 200, "doscientas": 200, "trescientos": 300,
      "trescientas": 300, "cuatrocientos": 400, "cuatrocientas": 400,
      "quinientos": 500, "quinientas": 500, "seiscientos": 600, "seiscientas": 600,
      "setecientos": 700, "setecientas": 700, "ochocientos": 800,
      "ochocientas": 800, "novecientos": 900, "novecientas": 900}
_PALABRAS = set(_U) | set(_D) | set(_C) | {"cien", "mil", "millon", "millones"}


def _sin_tildes(t):
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def _valor(tokens):
    total = acum = 0
    for t in tokens:
        if t == "y":
            continue
        if t in _U:
            acum += _U[t]
        elif t in _D:
            acum += _D[t]
        elif t == "cien":
            acum += 100
        elif t in _C:
            acum += _C[t]
        elif t == "mil":
            total += (acum or 1) * 1000
            acum = 0
        elif t in ("millon", "millones"):
            total = (total + (acum or 1)) * 1_000_000
            acum = 0
    return total + acum


def a_cifras(texto):
    """Reemplaza cada tramo de palabras numéricas del texto por su cifra."""
    crudas = texto.split()
    norm = [_sin_tildes(p.lower()) for p in crudas]
    salida, i = [], 0
    while i < len(norm):
        if norm[i] in _PALABRAS:
            j = i
            while j < len(norm) and (norm[j] in _PALABRAS or
                  (norm[j] == "y" and j + 1 < len(norm) and norm[j + 1] in _PALABRAS and j > i)):
                j += 1
            salida.append(str(_valor(norm[i:j])))
            i = j
        else:
            salida.append(crudas[i])
            i += 1
    return " ".join(salida)
