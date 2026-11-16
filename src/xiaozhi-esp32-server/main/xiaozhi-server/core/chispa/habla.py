"""Prepara el texto para que la voz lo pronuncie bien en español.

Convierte horas, números, dinero y porcentajes a palabras, y quita emojis,
símbolos y restos de markdown que el TTS leería mal o en voz alta.
"""
import re

_UNI = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
        "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
        "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós",
        "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
        "veintiocho", "veintinueve"]
_DEC = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta",
        "ochenta", "noventa"]
_CEN = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
        "seiscientos", "setecientos", "ochocientos", "novecientos"]


def _menor_mil(n):
    if n < 30:
        return _UNI[n]
    if n < 100:
        d, u = divmod(n, 10)
        return _DEC[d] + (" y " + _UNI[u] if u else "")
    if n == 100:
        return "cien"
    c, r = divmod(n, 100)
    return _CEN[c] + (" " + _menor_mil(r) if r else "")


def _apocope(txt):
    if txt.endswith("veintiuno"):
        return txt[:-9] + "veintiún"
    if txt.endswith("uno"):
        return txt[:-3] + "un"
    return txt


def numero_a_palabras(n):
    """Entero 0..999 999 999 a palabras; fuera de rango se deja en dígitos."""
    if n < 0 or n >= 1_000_000_000:
        return str(n)
    if n < 1000:
        return _menor_mil(n)
    if n < 1_000_000:
        m, r = divmod(n, 1000)
        pref = "mil" if m == 1 else _apocope(_menor_mil(m)) + " mil"
        return pref + (" " + _menor_mil(r) if r else "")
    mm, r = divmod(n, 1_000_000)
    pref = "un millón" if mm == 1 else _apocope(_menor_mil(mm)) + " millones"
    return pref + (" " + numero_a_palabras(r) if r else "")


def _hora(h, m, sufijo=None):
    if h > 23 or m > 59:
        return None
    if sufijo == "pm" and h < 12:
        h += 12
    elif sufijo == "am" and h == 12:
        h = 0
    if h == 0 and m == 0:
        return "medianoche"
    if h == 12 and m == 0:
        return "mediodía"
    h12 = h % 12 or 12
    art = "la" if h12 == 1 else "las"
    nombre = "una" if h12 == 1 else numero_a_palabras(h12)
    base = f"{art} {nombre}"
    if m:
        base += f" y {numero_a_palabras(m)}"
    if h < 12:
        base += " de la mañana"
    elif h < 19:
        base += " de la tarde"
    else:
        base += " de la noche"
    return base


_RE_HORA = re.compile(
    r"\b(?:(a|para|desde|hasta|de|hacia)\s+)?(?:las?\s+)?(\d{1,2}):(\d{2})"
    r"(?:\s?(a\.?\s?m\.?|p\.?\s?m\.?)(?!\w))?", re.I)


def _sub_hora(mt):
    suf = mt.group(4)
    suf = suf.lower().replace(".", "").replace(" ", "") if suf else None
    r = _hora(int(mt.group(2)), int(mt.group(3)), suf)
    if not r:
        return mt.group(0)
    prep = mt.group(1)
    if prep and prep.lower() == "a" and r in ("mediodía", "medianoche"):
        return "a " + ("" if False else "") + r
    return (prep + " " if prep else "") + r


def _sub_dinero(mt):
    n = int(mt.group(1).replace(".", "").replace(",", ""))
    return numero_a_palabras(n) + (" peso" if n == 1 else " pesos")


def _sub_decimal(mt):
    ent, dec = mt.group(1), mt.group(2)
    return (numero_a_palabras(int(ent)) + " coma "
            + " ".join(numero_a_palabras(int(c)) for c in dec))


def _sub_entero(mt):
    s = mt.group(0)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        s = s.replace(".", "")
    return numero_a_palabras(int(s))


_ABREV = [
    (r"\bmin\b\.?", "minutos"), (r"\bseg\b\.?", "segundos"),
    (r"\bhrs?\b\.?", "horas"), (r"\bp\.\s?m\.", "de la tarde"),
    (r"\ba\.\s?m\.", "de la mañana"), (r"\bpor ej\.", "por ejemplo"),
    (r"\betc\.", "etcétera"), (r"\bsr\.", "señor"), (r"\bsra\.", "señora"),
    (r"\bdr\.", "doctor"), (r"\bdra\.", "doctora"),
]


def normalizar_para_voz(texto):
    if not texto:
        return texto
    t = texto
    # markdown y símbolos de formato
    t = re.sub(r"```.*?```", " ", t, flags=re.S)
    t = re.sub(r"[*_`#>~]+", "", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"^\s*[-•]\s+", "", t, flags=re.M)
    # emojis y pictogramas
    t = re.sub("[\U0001F000-\U0001FAFF☀-➿️‍]", "", t)
    # abreviaturas
    # horas 3:30, 3:30 pm, a las 15:05 (antes de abreviaturas)
    t = _RE_HORA.sub(_sub_hora, t)
    for pat, rep in _ABREV:
        t = re.sub(pat, rep, t, flags=re.I)
    # dinero: $50.000 / $ 1.500.000 / 50000 COP
    t = re.sub(r"\$\s?(\d[\d.,]*)", _sub_dinero, t)
    t = re.sub(r"\b(\d[\d.]*)\s?(?:COP)\b", _sub_dinero, t)
    # porcentajes y decimales
    t = re.sub(r"(\d+)\s?%", lambda m: numero_a_palabras(int(m.group(1))) + " por ciento", t)
    t = re.sub(r"\b(\d+)[.,](\d{1,2})\b(?!\d)", _sub_decimal, t)
    # enteros restantes (con puntos de miles)
    t = re.sub(r"\b\d{1,3}(?:\.\d{3})+\b|\b\d+\b", _sub_entero, t)
    t = t.replace("&", " y ").replace("@", " arroba ")
    t = re.sub(r"\s{2,}", " ", t)
    return t.strip()
