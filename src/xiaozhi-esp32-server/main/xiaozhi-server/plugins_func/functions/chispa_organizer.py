"""Funciones de voz de Chispa para organizar el día (avisos, tareas, hábitos, concentración)."""
import time

from plugins_func.register import register_function, ToolType, ActionResponse, Action
from core.chispa import organizer as org
from config.logger import setup_logging

TAG = __name__
logger = setup_logging()


def _fn(name, desc, props, required):
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": props, "required": required}}}


def _ok(conn, hub, texto, expresion=None):
    hub.register(conn)
    hub.notify_changed()
    return ActionResponse(Action.RESPONSE, texto, texto)


def _run(conn, fn):
    hub = org.get_hub()
    try:
        return fn(hub, hub.store)
    except org.OrganizerError as e:
        return ActionResponse(Action.RESPONSE, str(e), str(e))
    except Exception as e:  # nunca romper la conversación
        logger.bind(tag=TAG).error(f"organizador: {e}")
        msg = "Uy, algo falló al organizar eso. Inténtalo otra vez."
        return ActionResponse(Action.RESPONSE, msg, msg)


S = {"type": "string"}
N = {"type": "number"}

crear_recordatorio_desc = _fn("crear_recordatorio", "Crea un recordatorio que suena dentro de N minutos. Ej: 'recuérdame sacar la ropa en 10 minutos'.",
    {"texto": {**S, "description": "qué recordar, corto"}, "minutos": {**N, "description": "dentro de cuántos minutos"}}, ["texto", "minutos"])


@register_function("crear_recordatorio", crear_recordatorio_desc, ToolType.SYSTEM_CTL)
def crear_recordatorio(conn, texto: str = "", minutos: float = 0):
    def go(hub, st):
        m = org.parse_minutos(minutos)
        t = org._clean_text(texto, "tu recordatorio")
        st.add_alert("recordatorio", t, time.time() + m * 60)
        return _ok(conn, hub, f"Listo, en {org.decir_duracion(m)} te recuerdo: {t}.")
    return _run(conn, go)


crear_alarma_desc = _fn("crear_alarma", "Pone una alarma a una hora del día. Ej: 'pon una alarma a las 7 de la mañana'.",
    {"hora": {**S, "description": "hora, ej. '7:00 am', '19:30', '7 de la tarde'"}, "etiqueta": {**S, "description": "nombre opcional"}}, ["hora"])


@register_function("crear_alarma", crear_alarma_desc, ToolType.SYSTEM_CTL)
def crear_alarma(conn, hora: str = "", etiqueta: str = ""):
    def go(hub, st):
        ts = org.parse_hora(hora)
        st.add_alert("alarma", org._clean_text(etiqueta, "Alarma"), ts)
        return _ok(conn, hub, f"Alarma lista para {org.decir_hora(ts)}.")
    return _run(conn, go)


crear_temporizador_desc = _fn("crear_temporizador", "Pone un temporizador de N minutos. Ej: 'temporizador de 5 minutos'.",
    {"minutos": {**N, "description": "duración en minutos"}}, ["minutos"])


@register_function("crear_temporizador", crear_temporizador_desc, ToolType.SYSTEM_CTL)
def crear_temporizador(conn, minutos: float = 0):
    def go(hub, st):
        m = org.parse_minutos(minutos)
        st.add_alert("temporizador", f"Temporizador de {org.decir_duracion(m)}", time.time() + m * 60)
        return _ok(conn, hub, f"Temporizador de {org.decir_duracion(m)} en marcha.")
    return _run(conn, go)


agregar_tarea_desc = _fn("agregar_tarea", "Añade una tarea pendiente. Ej: 'añade una tarea: comprar pan'.",
    {"texto": {**S, "description": "la tarea"}, "grupo": {**S, "description": "trabajo, estudio o personal (opcional)"},
     "para": {**S, "description": "hoy o mañana (opcional)"}}, ["texto"])


@register_function("agregar_tarea", agregar_tarea_desc, ToolType.SYSTEM_CTL)
def agregar_tarea(conn, texto: str = "", grupo: str = "", para: str = ""):
    def go(hub, st):
        t = org._clean_text(texto)
        if not t:
            raise org.OrganizerError("¿Qué tarea quieres añadir?")
        due = None
        if org._norm(para) in ("hoy", "manana"):
            d = org.now_dt().replace(hour=12, minute=0, second=0, microsecond=0)
            due = (d + org.timedelta(days=1 if org._norm(para) == "manana" else 0)).timestamp()
        st.add_task(t, grupo, due)
        return _ok(conn, hub, f"Anotada la tarea: {t}.")
    return _run(conn, go)


crear_habito_desc = _fn("crear_habito", "Crea un hábito diario. Ej: 'quiero un hábito: tomar agua'.",
    {"nombre": {**S, "description": "el hábito"}, "meta": {**S, "description": "meta opcional, ej. '8 vasos'"}}, ["nombre"])


@register_function("crear_habito", crear_habito_desc, ToolType.SYSTEM_CTL)
def crear_habito(conn, nombre: str = "", meta: str = ""):
    def go(hub, st):
        n = org._clean_text(nombre)
        if not n:
            raise org.OrganizerError("¿Qué hábito quieres crear?")
        st.add_habit(n, org._clean_text(meta) or None)
        return _ok(conn, hub, f"Hábito creado: {n}.")
    return _run(conn, go)


completar_desc = _fn("completar_tarea_o_habito", "Marca una tarea como hecha o registra el hábito de hoy. Ej: 'ya tomé agua', 'terminé comprar pan'.",
    {"nombre": {**S, "description": "tarea o hábito"}}, ["nombre"])


@register_function("completar_tarea_o_habito", completar_desc, ToolType.SYSTEM_CTL)
def completar_tarea_o_habito(conn, nombre: str = ""):
    def go(hub, st):
        tipo, it = st.complete(nombre)
        msg = f"Listo, tarea hecha: {it['text']}." if tipo == "tarea" else f"Listo, registré hoy: {it['text']}."
        return _ok(conn, hub, msg)
    return _run(conn, go)


resumen_desc = _fn("resumen_del_dia", "Lee en voz alta las tareas, hábitos y avisos pendientes del usuario. Se usa con '¿qué tengo pendiente?', '¿qué tengo para hoy?', 'mi agenda', 'mis tareas'.",
    {"cuando": {**S, "description": "siempre 'hoy'"}}, [])


@register_function("resumen_del_dia", resumen_desc, ToolType.SYSTEM_CTL)
def resumen_del_dia(conn, cuando=None):
    def go(hub, st):
        hub.register(conn)
        t = st.resumen_voz()
        return ActionResponse(Action.RESPONSE, t, t)
    return _run(conn, go)


concentracion_desc = _fn("iniciar_concentracion", "Inicia el modo concentración (también llamado modo enfoque, modo foco o pomodoro): cuenta regresiva, 25 minutos por defecto.",
    {"minutos": {**N, "description": "opcional, por defecto 25"}}, [])


@register_function("iniciar_concentracion", concentracion_desc, ToolType.SYSTEM_CTL)
def iniciar_concentracion(conn, minutos: float = 0):
    def go(hub, st):
        m = org.parse_minutos(minutos) if minutos else org.FOCUS_MINUTES
        st.add_alert("concentracion", "Modo concentración", time.time() + m * 60)
        return _ok(conn, hub, f"Modo concentración por {org.decir_duracion(m)}. No te interrumpo.")
    return _run(conn, go)
