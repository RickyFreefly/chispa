"""Hora, fecha, calendario (festivos de Colombia) y clima (Open-Meteo, sin clave) para Chispa.
Solo biblioteca estándar. El acceso a red se inyecta (`http_get`) para poder probar sin internet."""
import json
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Bogota")
DEFAULT_CITY = {"name": "Bogotá", "lat": 4.711, "lon": -74.0721}
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
CACHE_SECONDS = 600
TIMEOUT = 6


class InfoError(Exception):
    """Mensaje listo para decir en voz alta."""


def _norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def _now(now=None):
    return datetime.fromtimestamp(now if now is not None else time.time(), TZ)


# ---------- hora y fecha ----------
def hora_texto(now=None):
    d = _now(now)
    h12 = d.hour % 12 or 12
    if d.hour == 0 and d.minute == 0:
        return "Es medianoche."
    if d.hour == 12 and d.minute == 0:
        return "Es mediodía."
    parte = "de la madrugada" if d.hour < 6 else "de la mañana" if d.hour < 12 else "de la tarde" if d.hour < 19 else "de la noche"
    verbo = "Es la" if h12 == 1 else "Son las"
    return f"{verbo} {h12}:{d.minute:02d} {parte}." if d.minute else f"{verbo} {h12} en punto {parte}."


def fecha_larga(d):
    return f"{DIAS[d.weekday()]} {d.day} de {MESES[d.month - 1]} de {d.year}"


def fecha_texto(now=None):
    d = _now(now).date()
    f = festivo(d)
    t = f"Hoy es {fecha_larga(d)}."
    return t + (f" Además es festivo: {f}." if f else "")


# ---------- calendario: festivos de Colombia (Ley Emiliani) ----------
def pascua(year):
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes, dia = divmod(h + l - 7 * m + 114, 31)
    return date(year, mes, dia + 1)


def _lunes(d):
    """Si no es lunes, pasa al lunes siguiente."""
    return d if d.weekday() == 0 else d + timedelta(days=7 - d.weekday())


def festivos(year):
    p = pascua(year)
    f = {
        date(year, 1, 1): "Año Nuevo", date(year, 5, 1): "Día del Trabajo", date(year, 7, 20): "Día de la Independencia",
        date(year, 8, 7): "Batalla de Boyacá", date(year, 12, 8): "Inmaculada Concepción", date(year, 12, 25): "Navidad",
        p - timedelta(days=3): "Jueves Santo", p - timedelta(days=2): "Viernes Santo",
    }
    for (m, d), n in {(1, 6): "Reyes Magos", (3, 19): "San José", (6, 29): "San Pedro y San Pablo", (8, 15): "Asunción de la Virgen",
                      (10, 12): "Día de la Raza", (11, 1): "Todos los Santos", (11, 11): "Independencia de Cartagena"}.items():
        f[_lunes(date(year, m, d))] = n
    f[_lunes(p + timedelta(days=39))] = "Ascensión del Señor"
    f[_lunes(p + timedelta(days=60))] = "Corpus Christi"
    f[_lunes(p + timedelta(days=68))] = "Sagrado Corazón"
    return f


def festivo(d):
    return festivos(d.year).get(d)


def proximo_festivo(now=None):
    hoy = _now(now).date()
    cand = sorted((d, n) for y in (hoy.year, hoy.year + 1) for d, n in festivos(y).items() if d >= hoy)
    d, n = cand[0]
    k = (d - hoy).days
    cuando = "hoy" if k == 0 else "mañana" if k == 1 else f"en {k} días"
    return f"El próximo festivo es {n}: {fecha_larga(d)}, {cuando}."


def dias_para(texto, now=None):
    """Días hasta una fecha 'AAAA-MM-DD' o 'DD/MM'."""
    hoy = _now(now).date()
    t = str(texto or "").strip()
    try:
        if "-" in t:
            d = date.fromisoformat(t[:10])
        else:
            dd, mm = (int(x) for x in t.replace(".", "/").split("/")[:2])
            d = date(hoy.year, mm, dd)
            if d < hoy:
                d = date(hoy.year + 1, mm, dd)
    except (ValueError, TypeError):
        raise InfoError("No entendí la fecha. Dímela como día y mes, por ejemplo 25 de diciembre.")
    k = (d - hoy).days
    if k == 0:
        return "Es hoy."
    if k == 1:
        return "Es mañana."
    if k < 0:
        return f"Eso fue hace {-k} días."
    return f"Faltan {k} días para el {fecha_larga(d)}."


# ---------- clima ----------
WMO = {0: "despejado", 1: "mayormente despejado", 2: "parcialmente nublado", 3: "nublado", 45: "con niebla", 48: "con niebla",
       51: "con llovizna ligera", 53: "con llovizna", 55: "con llovizna fuerte", 56: "con llovizna helada", 57: "con llovizna helada",
       61: "con lluvia ligera", 63: "con lluvia", 65: "con lluvia fuerte", 66: "con lluvia helada", 67: "con lluvia helada",
       71: "con nieve ligera", 73: "con nieve", 75: "con nieve fuerte", 77: "con granizo fino", 80: "con aguaceros ligeros",
       81: "con aguaceros", 82: "con aguaceros fuertes", 85: "con nevadas", 86: "con nevadas fuertes",
       95: "con tormenta eléctrica", 96: "con tormenta y granizo", 99: "con tormenta y granizo fuerte"}


def _http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Chispa/1.0"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))


class WeatherService:
    def __init__(self, http_get=_http_get, clock=time.time):
        self.http_get, self.clock = http_get, clock
        self._cache = {}

    def _get(self, url):
        hit = self._cache.get(url)
        if hit and self.clock() - hit[0] < CACHE_SECONDS:
            return hit[1]
        try:
            data = self.http_get(url)
        except Exception:
            if hit:                      # sin internet: mejor un dato viejo que nada
                return hit[1]
            raise InfoError("No pude consultar el clima ahora. Revisa que haya internet e inténtalo otra vez.")
        self._cache[url] = (self.clock(), data)
        return data

    def ciudad(self, nombre):
        if not _norm(nombre) or _norm(nombre) in ("bogota", "aqui", "aca"):
            return DEFAULT_CITY
        q = urllib.parse.urlencode({"name": str(nombre)[:60], "count": 1, "language": "es", "countryCode": "CO"})
        r = self._get(f"https://geocoding-api.open-meteo.com/v1/search?{q}")
        res = (r or {}).get("results") or []
        if not res:                      # reintento sin filtrar por país
            q = urllib.parse.urlencode({"name": str(nombre)[:60], "count": 1, "language": "es"})
            res = (self._get(f"https://geocoding-api.open-meteo.com/v1/search?{q}") or {}).get("results") or []
        if not res:
            raise InfoError(f"No encontré la ciudad {str(nombre)[:40]}. ¿Me la repites?")
        c = res[0]
        return {"name": c.get("name", nombre), "lat": c["latitude"], "lon": c["longitude"]}

    def _forecast(self, c):
        q = urllib.parse.urlencode({
            "latitude": c["lat"], "longitude": c["lon"], "timezone": "America/Bogota", "forecast_days": 2,
            "current": "temperature_2m,apparent_temperature,weather_code,precipitation",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"})
        return self._get(f"https://api.open-meteo.com/v1/forecast?{q}")

    def datos(self, ciudad=""):
        """Clima actual en forma de datos (para la tarjeta de la página)."""
        c = self.ciudad(ciudad)
        r = self._forecast(c)
        try:
            cur, dd = r["current"], r["daily"]
            return {"city": c["name"], "temp": round(cur["temperature_2m"]), "feels": round(cur["apparent_temperature"]),
                    "desc": WMO.get(int(cur["weather_code"]), "variable"), "min": round(dd["temperature_2m_min"][0]),
                    "max": round(dd["temperature_2m_max"][0]), "rain": round(dd["precipitation_probability_max"][0] or 0)}
        except (KeyError, IndexError, TypeError, ValueError):
            raise InfoError("El servicio del clima respondió algo raro.")

    def clima(self, ciudad="", cuando="hoy"):
        c = self.ciudad(ciudad)
        r = self._forecast(c)
        try:
            desc = lambda code: WMO.get(int(code), "variable")
            if _norm(cuando) in ("manana", "mañana"):
                dd = r["daily"]
                return (f"Mañana en {c['name']} estará {desc(dd['weather_code'][1])}, con mínima de {round(dd['temperature_2m_min'][1])} "
                        f"y máxima de {round(dd['temperature_2m_max'][1])} grados. Probabilidad de lluvia: {round(dd['precipitation_probability_max'][1] or 0)} por ciento.")
            cur, dd = r["current"], r["daily"]
            t = (f"Ahora en {c['name']} está {desc(cur['weather_code'])}, a {round(cur['temperature_2m'])} grados"
                 f" (sensación de {round(cur['apparent_temperature'])}). Hoy: mínima {round(dd['temperature_2m_min'][0])}, "
                 f"máxima {round(dd['temperature_2m_max'][0])}, lluvia {round(dd['precipitation_probability_max'][0] or 0)} por ciento.")
            if (dd["precipitation_probability_max"][0] or 0) >= 60:
                t += " Lleva paraguas."
            return t
        except (KeyError, IndexError, TypeError, ValueError):
            raise InfoError("El servicio del clima respondió algo raro. Inténtalo de nuevo en un rato.")


_weather = WeatherService()


def get_weather():
    return _weather


def panel(now=None, ciudad=""):
    """Datos para la tarjeta de la página. El clima puede faltar (sin internet) sin romper lo demás."""
    hoy = _now(now).date()
    prox = sorted((d, n) for y in (hoy.year, hoy.year + 1) for d, n in festivos(y).items() if d >= hoy)[0]
    out = {"festivoHoy": festivo(hoy), "proximo": {"nombre": prox[1], "fecha": fecha_larga(prox[0]), "dias": (prox[0] - hoy).days},
           "clima": None, "error": None}
    try:
        out["clima"] = _weather.datos(ciudad)
    except InfoError as e:
        out["error"] = str(e)
    except Exception:
        out["error"] = "No pude consultar el clima."
    return out
