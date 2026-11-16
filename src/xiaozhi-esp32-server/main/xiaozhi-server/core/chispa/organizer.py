"""Organizador del día de Chispa: avisos (recordatorio/alarma/temporizador), tareas, hábitos y modo concentración.

Solo biblioteca estándar: se puede probar sin el servidor. Todo se guarda en SQLite local (data/chispa_organizer.db),
la fuente de verdad es el servidor; la página solo muestra y avisa.
"""
import asyncio
import json
import os
import re
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Bogota")
ALERT_KINDS = ("recordatorio", "alarma", "temporizador", "concentracion")
MAX_ACTIVE_ALERTS = 8          # igual que Troko: hasta 8 avisos guardados a la vez
MAX_TEXT = 80
FOCUS_MINUTES = 25
MAX_MINUTES = 24 * 60
GROUPS = ("trabajo", "estudio", "personal")


class OrganizerError(Exception):
    """Error con mensaje listo para decir en voz alta."""


def _norm(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def _clean_text(s, default=""):
    s = re.sub(r"\s+", " ", str(s or "")).strip()
    return (s[:MAX_TEXT]) if s else default


def now_dt(now=None):
    return datetime.fromtimestamp(now if now is not None else time.time(), TZ)


# ---------- interpretación de horas ----------
_HORA = re.compile(r"(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|de la manana|de la madrugada|de la tarde|de la noche)?")


def parse_hora(texto, now=None):
    """Devuelve el próximo instante (epoch) en que ocurre esa hora. Acepta '7:00', '19:30', '7 pm', '7 de la mañana', 'mediodía'."""
    ahora = now_dt(now)
    t = _norm(texto)
    if not t:
        raise OrganizerError("No entendí la hora. Dime, por ejemplo, las siete de la mañana.")
    if "mediodia" in t:
        h, m = 12, 0
    elif "medianoche" in t:
        h, m = 0, 0
    else:
        mo = _HORA.search(t)
        if not mo:
            raise OrganizerError("No entendí la hora. Dime, por ejemplo, las siete de la mañana.")
        h, m, marca = int(mo.group(1)), int(mo.group(2) or 0), (mo.group(3) or "").replace(".", "").replace(" ", "")
        if h > 23 or m > 59:
            raise OrganizerError("Esa hora no existe. ¿Me la repites?")
        if marca.startswith("p") or marca in ("delatarde", "delanoche"):
            if h < 12:
                h += 12
        elif marca.startswith("a") or marca in ("delamanana", "delamadrugada"):
            if h == 12:
                h = 0
    dt = ahora.replace(hour=h, minute=m, second=0, microsecond=0)
    if dt <= ahora:
        dt += timedelta(days=1)
    return dt.timestamp()


def parse_minutos(valor):
    try:
        n = float(str(valor).replace(",", ".").strip())
    except (TypeError, ValueError):
        raise OrganizerError("No entendí cuántos minutos. ¿Me lo repites?")
    if n <= 0 or n != n:
        raise OrganizerError("Los minutos tienen que ser más de cero.")
    if n > MAX_MINUTES:
        raise OrganizerError("Máximo puedo contar un día completo.")
    return n


def decir_hora(ts):
    d = now_dt(ts)
    h12 = d.hour % 12 or 12
    parte = "de la madrugada" if d.hour < 6 else "de la mañana" if d.hour < 12 else "de la tarde" if d.hour < 19 else "de la noche"
    if d.hour == 12 and d.minute == 0:
        return "el mediodía"
    return f"{h12}:{d.minute:02d} {parte}" if d.minute else f"{h12} {parte}"


def decir_duracion(minutos):
    if minutos < 1:
        n = max(1, round(minutos * 60))
        return f"{n} segundo{'s' if n != 1 else ''}"
    if minutos == 1:
        return "1 minuto"
    if minutos < 60:
        return f"{minutos:g} minutos"
    h, m = divmod(round(minutos), 60)
    return f"{h} hora{'s' if h != 1 else ''}" + (f" y {m} minutos" if m else "")


# ---------- almacenamiento ----------
class OrganizerStore:
    def __init__(self, path):
        self.path = path
        self._lock = threading.RLock()
        if path != ":memory:":
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self._db = sqlite3.connect(path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        with self._lock:
            self._db.executescript(
                """CREATE TABLE IF NOT EXISTS items(
                       id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, text TEXT NOT NULL,
                       due REAL, grp TEXT, goal TEXT, done INTEGER NOT NULL DEFAULT 0,
                       fired INTEGER NOT NULL DEFAULT 0, created REAL NOT NULL, done_at REAL);
                   CREATE TABLE IF NOT EXISTS habit_log(item_id INTEGER NOT NULL, day TEXT NOT NULL, PRIMARY KEY(item_id, day));"""
            )
            self._db.commit()

    # --- creación ---
    def _insert(self, kind, text, due=None, grp=None, goal=None, now=None):
        with self._lock:
            cur = self._db.execute(
                "INSERT INTO items(kind,text,due,grp,goal,created) VALUES(?,?,?,?,?,?)",
                (kind, text, due, grp, goal, now if now is not None else time.time()),
            )
            self._db.commit()
            return self.get(cur.lastrowid)

    def get(self, item_id):
        with self._lock:
            r = self._db.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
        return dict(r) if r else None

    def active_alerts(self):
        with self._lock:
            rows = self._db.execute(
                f"SELECT * FROM items WHERE kind IN ({','.join('?' * len(ALERT_KINDS))}) AND fired=0 AND done=0 ORDER BY due", ALERT_KINDS
            ).fetchall()
        return [dict(r) for r in rows]

    def add_alert(self, kind, text, due, now=None):
        if kind not in ALERT_KINDS:
            raise OrganizerError("Ese tipo de aviso no existe.")
        if kind == "concentracion":
            for a in self.active_alerts():           # solo un modo concentración a la vez
                if a["kind"] == "concentracion":
                    raise OrganizerError("Ya hay un modo concentración en marcha.")
        elif len([a for a in self.active_alerts() if a["kind"] != "concentracion"]) >= MAX_ACTIVE_ALERTS:
            raise OrganizerError(f"Ya tengo {MAX_ACTIVE_ALERTS} avisos guardados. Espera a que suene alguno o bórralo.")
        return self._insert(kind, text, due=due, now=now)

    def add_task(self, text, grp=None, due=None, now=None):
        g = _norm(grp)
        return self._insert("tarea", text, due=due, grp=g if g in GROUPS else None, now=now)

    def add_habit(self, name, goal=None, now=None):
        n = _norm(name)
        with self._lock:
            for r in self._db.execute("SELECT * FROM items WHERE kind='habito' AND done=0").fetchall():
                if _norm(r["text"]) == n:
                    raise OrganizerError("Ese hábito ya existe.")
        return self._insert("habito", name, goal=goal, now=now)

    # --- acciones ---
    def due_alerts(self, now=None):
        """Avisos vencidos que aún no sonaron: los marca como sonados y los devuelve."""
        t = now if now is not None else time.time()
        with self._lock:
            rows = self._db.execute(
                f"SELECT * FROM items WHERE kind IN ({','.join('?' * len(ALERT_KINDS))}) AND fired=0 AND done=0 AND due<=?", (*ALERT_KINDS, t)
            ).fetchall()
            ids = [r["id"] for r in rows]
            if ids:
                self._db.execute(f"UPDATE items SET fired=1 WHERE id IN ({','.join('?' * len(ids))})", ids)
                self._db.commit()
        return [dict(r) for r in rows]

    def stop(self, item_id):
        with self._lock:
            self._db.execute("UPDATE items SET fired=1, done=1 WHERE id=? AND kind IN (%s)" % ",".join("?" * len(ALERT_KINDS)), (item_id, *ALERT_KINDS))
            self._db.commit()

    def delete(self, item_id):
        with self._lock:
            self._db.execute("DELETE FROM items WHERE id=?", (item_id,))
            self._db.execute("DELETE FROM habit_log WHERE item_id=?", (item_id,))
            self._db.commit()

    def _match(self, name, kinds):
        n = _norm(name)
        if not n:
            return None
        with self._lock:
            rows = self._db.execute(f"SELECT * FROM items WHERE kind IN ({','.join('?' * len(kinds))}) AND done=0 ORDER BY id DESC", kinds).fetchall()
        exact = [r for r in rows if _norm(r["text"]) == n]
        part = [r for r in rows if n in _norm(r["text"]) or _norm(r["text"]) in n]
        pick = exact or part
        if len(pick) > 1 and not exact:
            raise OrganizerError("Tengo varias cosas parecidas. ¿Cuál exactamente?")
        return dict(pick[0]) if pick else None

    def complete(self, name, now=None):
        """Marca una tarea como hecha o registra el hábito de hoy. Devuelve (tipo, item) o lanza OrganizerError."""
        item = self._match(name, ("tarea", "habito"))
        if not item:
            raise OrganizerError("No encontré esa tarea ni ese hábito.")
        t = now if now is not None else time.time()
        if item["kind"] == "tarea":
            with self._lock:
                self._db.execute("UPDATE items SET done=1, done_at=? WHERE id=?", (t, item["id"]))
                self._db.commit()
            return "tarea", self.get(item["id"])
        day = now_dt(t).strftime("%Y-%m-%d")
        with self._lock:
            self._db.execute("INSERT OR IGNORE INTO habit_log(item_id,day) VALUES(?,?)", (item["id"], day))
            self._db.commit()
        return "habito", item

    # --- consulta ---
    def snapshot(self, now=None):
        t = now if now is not None else time.time()
        d0 = now_dt(t)
        today = d0.strftime("%Y-%m-%d")
        week = [(d0 - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
        start_of_day = d0.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        with self._lock:
            tareas = self._db.execute(
                "SELECT * FROM items WHERE kind='tarea' AND (done=0 OR done_at>=?) ORDER BY done, COALESCE(due, 9e18), id", (start_of_day,)
            ).fetchall()
            habitos = self._db.execute("SELECT * FROM items WHERE kind='habito' AND done=0 ORDER BY id").fetchall()
            logs = self._db.execute("SELECT item_id, day FROM habit_log WHERE day IN (%s)" % ",".join("?" * len(week)), week).fetchall()
        by = {}
        for r in logs:
            by.setdefault(r["item_id"], set()).add(r["day"])
        hs = [{"id": h["id"], "text": h["text"], "goal": h["goal"], "doneToday": today in by.get(h["id"], ()), "weekCount": len(by.get(h["id"], ()))} for h in habitos]
        alerts = self.active_alerts()
        focus = next((a for a in alerts if a["kind"] == "concentracion"), None)
        def tk(r):
            r = dict(r)
            day = None
            if r["due"]:
                dd = now_dt(r["due"]).date()
                day = "hoy" if dd == d0.date() else "mañana" if dd == (d0 + timedelta(days=1)).date() else dd.isoformat()
            return {"id": r["id"], "text": r["text"], "group": r["grp"], "due": r["due"], "day": day, "done": bool(r["done"])}
        return {
            "now": t,
            "alerts": [{"id": a["id"], "kind": a["kind"], "text": a["text"], "due": a["due"], "created": a["created"]} for a in alerts if a["kind"] != "concentracion"],
            "focus": {"id": focus["id"], "due": focus["due"], "created": focus["created"]} if focus else None,
            "tasks": [tk(r) for r in tareas],
            "habits": hs,
        }

    def resumen_voz(self, now=None):
        s = self.snapshot(now)
        pend = [x for x in s["tasks"] if not x["done"]]
        partes = []
        hoy = [x for x in pend if x["day"] in (None, "hoy")]
        partes.append(f"Tienes {len(hoy)} tarea{'s' if len(hoy) != 1 else ''} pendiente{'s' if len(hoy) != 1 else ''} para hoy" if hoy else "No tienes tareas pendientes para hoy")
        if hoy:
            partes[-1] += ": " + ", ".join(x["text"] for x in hoy[:4])
        if s["habits"]:
            hechos = sum(1 for h in s["habits"] if h["doneToday"])
            partes.append(f"Vas {hechos} de {len(s['habits'])} hábito{'s' if len(s['habits']) != 1 else ''}")
        if s["alerts"]:
            nxt = min(s["alerts"], key=lambda a: a["due"])
            partes.append(f"Tu próximo aviso es {nxt['text']} a las {decir_hora(nxt['due'])}")
        return ". ".join(partes) + "."


def frase_aviso(item):
    """Frase corta y fija que Chispa dice cuando vence un aviso (sin pasar por el LLM)."""
    kind, text = item.get("kind"), (item.get("text") or "").strip()
    if kind == "concentracion":
        return "Cumpliste tu sesión de concentración. Buen ritmo."
    if kind == "temporizador":
        return f"Listo, terminó tu {text[0].lower() + text[1:]}." if text else "Listo, terminó tu temporizador."
    if kind == "alarma":
        return "Es la hora de tu alarma." if _norm(text) in ("", "alarma") else f"Es la hora: {text}."
    return f"Oye, es hora de: {text}." if text else "Oye, tienes un recordatorio."


# ---------- conexiones y programador ----------
class OrganizerHub:
    """Registra las conexiones de la página y les empuja eventos; un hilo revisa los avisos vencidos cada segundo."""

    def __init__(self, store):
        self.store = store
        self._conns = set()
        self._lock = threading.Lock()
        self._thread = None
        self._stop = threading.Event()

    def register(self, conn):
        with self._lock:
            self._conns.add(conn)
        self.start()

    def unregister(self, conn):
        with self._lock:
            self._conns.discard(conn)

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="chispa-organizer", daemon=True)
        self._thread.start()

    def _run(self):
        while not self._stop.wait(1.0):
            try:
                for item in self.store.due_alerts():
                    self.push({"type": "chispa_organizer", "event": "due", "item": {"id": item["id"], "kind": item["kind"], "text": item["text"], "due": item["due"]}, "state": self.store.snapshot()})
                    self.hablar(frase_aviso(item))
            except Exception:  # el programador nunca debe morir
                pass

    def hablar(self, texto):
        """Hace que Chispa diga el aviso por la voz del robot; no corta a nadie que esté hablando."""
        with self._lock:
            conns = list(self._conns)
        for c in conns:
            try:
                if getattr(c, "client_is_speaking", False) or getattr(c, "tts", None) is None:
                    continue
                import uuid
                from core.handle.intentHandler import speak_txt
                c.sentence_id = uuid.uuid4().hex
                speak_txt(c, texto)
            except Exception:  # un aviso nunca debe romper el programador
                pass

    def push(self, message):
        data = json.dumps(message, ensure_ascii=False)
        with self._lock:
            conns = list(self._conns)
        for c in conns:
            try:
                ws, loop = getattr(c, "websocket", None), getattr(c, "loop", None)
                if ws is None or loop is None:
                    raise RuntimeError("conexión no lista")
                asyncio.run_coroutine_threadsafe(ws.send(data), loop)
            except Exception:
                self.unregister(c)

    def notify_changed(self):
        self.push({"type": "chispa_organizer", "event": "state", "state": self.store.snapshot()})


_store = None
_hub = None
_init_lock = threading.Lock()


def get_hub(db_path=None):
    global _store, _hub
    with _init_lock:
        if _hub is None:
            base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            _store = OrganizerStore(db_path or os.path.join(base, "data", "chispa_organizer.db"))
            _hub = OrganizerHub(_store)
        return _hub
