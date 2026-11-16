"""Modo reposo de Chispa por voz: «adiós chispa» la deja en reposo; «hola chispa» la despierta.
En reposo la conexión sigue abierta pero Chispa no responde a nada salvo al saludo. Funciones puras (sin red) para poder probarlas."""
import re
import unicodedata

# Vosk puede escribir "chispa" de varias formas; se aceptan las más comunes.
_NOMBRE = r"(?:chispa|chispas|chispita|chipa|chispaz|chis pa|chi spa)"
_DESPERTAR = re.compile(rf"\b(?:hola|oye|ey|hey|buenas)\s+{_NOMBRE}\b")
_DORMIR = re.compile(rf"\b(?:adios|chao|chau|hasta luego|nos vemos|descansa|a dormir|buenas noches)\s+{_NOMBRE}\b")

FRASE_DORMIR = "Aquí me quedo en reposo. Dime hola chispa cuando me necesites."
FRASE_DESPERTAR = "Aquí estoy."


def normalizar(texto):
    t = unicodedata.normalize("NFD", str(texto or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", t)).strip()


def detectar(texto, en_reposo):
    """Devuelve (accion, resto): 'dormir' | 'despertar' | None. 'resto' es lo que se dijo después del saludo."""
    t = normalizar(texto)
    if en_reposo:
        m = _DESPERTAR.search(t)
        return ("despertar", t[m.end():].strip()) if m else (None, "")
    m = _DORMIR.search(t)
    return ("dormir", "") if m else (None, "")
