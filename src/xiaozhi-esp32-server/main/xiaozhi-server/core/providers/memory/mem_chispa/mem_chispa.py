"""Memoria local de Chispa: resumen en español, por dispositivo + perfil, con opt-in y borrado.

- Los resúmenes viven solo en data/.chispa_memory.json (nada sale del equipo).
- Se resume con el LLM local al terminar la conversación (o al cambiar de perfil), en segundo plano.
- Solo se guardan gustos, nombre, progreso y metas de aprendizaje; nunca datos sensibles ni de contacto.
- Apagada por defecto (default_enabled: false): la página la activa cuando la persona marca "Recordar".
"""
import json
import os
import re
import threading
import time

from config.config_loader import get_project_dir
from ..base import MemoryProviderBase, logger

TAG = __name__

SUMMARY_PROMPT = """Eres el módulo de memoria de Chispa, un robot educativo. Mantienes unas notas MUY breves sobre la persona con la que habla, para poder acompañarla mejor en próximas conversaciones.

Recibirás la conversación nueva y, si existen, las notas anteriores. Devuelve las notas actualizadas.

Guarda SOLO información útil y duradera:
- cómo prefiere que la llamen
- gustos e intereses (temas, juegos, animales, materias favoritas)
- lo que está aprendiendo, sus logros, sus dificultades y sus metas
- cómo le gusta que le expliquen las cosas

NUNCA guardes: apellidos, direcciones, teléfonos, correos, documentos de identidad, nombre del colegio o de familiares con datos que los identifiquen, contraseñas, datos de salud, dinero, religión ni política, ni nada íntimo o que la persona no querría que se recordara. Si la persona dice "no lo recuerdes" o similar, no lo guardes. No inventes nada: solo lo que la persona dijo.

Reglas de formato:
- Español, texto plano, una nota por línea que empiece con "- ".
- Máximo 8 líneas y {max_chars} caracteres en total. Si hay demasiado, quita lo menos importante o lo más viejo.
- Si cambió algo (por ejemplo su nombre o un gusto), reemplaza la nota anterior.
- Si en la conversación no hay nada nuevo que valga la pena, devuelve las notas anteriores sin cambios.
- Si no hay notas y nada que guardar, responde exactamente: NADA
- Responde solo con las notas, sin explicaciones."""

_RE_LONG_NUM = re.compile(r"\d[\d\s().-]{6,}\d")
_RE_EMAIL = re.compile(r"\S+@\S+\.\S+")
_RE_URL = re.compile(r"https?://\S+")


def normalize_person(name):
    """Primer nombre en minúsculas, solo letras (sin apellidos ni símbolos), máx. 20. Vacío = sin persona."""
    first = re.sub(r"[^a-záéíóúüñ ]", "", str(name or "").strip().lower()).split()
    return first[0][:20] if first else ""


def scrub(text):
    """Quita rastros de datos de contacto por si el modelo los dejó pasar."""
    text = _RE_EMAIL.sub("[correo]", text or "")
    text = _RE_URL.sub("[enlace]", text)
    text = _RE_LONG_NUM.sub("[número]", text)
    return text


def clean_notes(raw, max_chars):
    raw = (raw or "").strip()
    if not raw or raw.upper().startswith("NADA"):
        return ""
    lines = []
    for line in raw.splitlines():
        line = line.strip().lstrip("*•").strip()
        if not line or line.startswith("```"):
            continue
        if not line.startswith("- "):
            line = "- " + line.lstrip("- ").strip()
        lines.append(scrub(line))
    lines = lines[:8]
    out = "\n".join(lines)
    while len(out) > max_chars and len(lines) > 1:
        lines.pop()          # se descarta lo último (lo menos prioritario)
        out = "\n".join(lines)
    return out[:max_chars]


class MemoryProvider(MemoryProviderBase):
    _file_lock = threading.Lock()

    def __init__(self, config, summary_memory=None):
        super().__init__(config)
        self.default_enabled = bool(config.get("default_enabled", False))
        self.max_chars = int(config.get("max_chars", 700))
        self.path = config.get("path") or (get_project_dir() + "data/.chispa_memory.json")
        self.device_id = None
        self.profile = "student"
        self.person = ""
        self.enabled = self.default_enabled
        self.notes = ""
        self._gen = 0               # sube al borrar: un resumen en curso no debe resucitar lo olvidado
        self._boundary = 0          # mensajes anteriores a este índice ya se resumieron (cambio de perfil)

    # ---------- almacenamiento ----------
    def _key(self, profile=None, person=None):
        profile = profile or self.profile
        person = self.person if person is None else person
        return f"{self.device_id}|{profile}" + (f"|{person}" if person else "")

    def _read_all(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f) or {}
        except FileNotFoundError:
            return {}
        except Exception as e:
            logger.bind(tag=TAG).error(f"memoria ilegible, se ignora: {e}")
            return {}

    def _write_all(self, data):
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(tmp, self.path)

    def _load(self):
        with self._file_lock:
            rec = self._read_all().get(self._key())
        self.notes = (rec or {}).get("notas", "")

    def _store(self, key, notes):
        with self._file_lock:
            data = self._read_all()
            if notes:
                data[key] = {"notas": notes, "actualizado": time.strftime("%Y-%m-%d %H:%M")}
            else:
                data.pop(key, None)
            self._write_all(data)

    # ---------- ciclo de vida ----------
    def init_memory(self, role_id, llm, **kwargs):
        super().init_memory(role_id, llm, **kwargs)
        self.device_id = role_id
        self.enabled = self.default_enabled
        self.profile = "student"
        self.person = ""
        self._boundary = 0
        self._load()

    def set_enabled(self, enabled):
        self.enabled = bool(enabled)

    def _rotate(self, msgs, profile, person):
        """Cambia el alcance: lo hablado hasta ahora se resume bajo el alcance anterior (segundo plano)."""
        old_key = self._key()
        if self._key(profile, person) == old_key:
            return False
        if self.enabled and msgs is not None:
            threading.Thread(target=self._summarize_sync, args=(list(msgs), self._boundary, old_key), daemon=True).start()
        self._boundary = len(msgs) if msgs is not None else 0
        self.profile, self.person = profile, person
        self._load()
        return True

    def switch_profile(self, profile, msgs=None):
        return bool(profile) and self._rotate(msgs, profile, self.person)

    def switch_person(self, name, msgs=None):
        """Memoria individual: cada persona (primer nombre) tiene sus propias notas dentro de su perfil."""
        return self._rotate(msgs, self.profile, normalize_person(name))

    def forget(self, everything=False):
        """Borra la memoria de la persona actual en este perfil; con everything=True, en todos sus perfiles.
        Nunca toca la memoria de otras personas que usan el mismo robot."""
        with self._file_lock:
            data = self._read_all()
            prefix = f"{self.device_id}|"
            def mine(k):
                if not k.startswith(prefix):
                    return False
                parts = k[len(prefix):].split("|")
                person = parts[1] if len(parts) > 1 else ""
                return person == self.person and (everything or k == self._key())
            keys = [k for k in data if mine(k)]
            for k in keys:
                data.pop(k)
            self._write_all(data)
        self.notes = ""
        self._gen += 1
        return len(keys)

    def spoken_notes(self):
        """Las notas como frases para decirlas en voz alta."""
        lines = [l[2:].strip().rstrip(".") for l in self.notes.splitlines() if l.strip()]
        return ". ".join(lines)

    # ---------- API del proveedor ----------
    async def query_memory(self, query: str) -> str:
        if not self.enabled or not self.notes:
            return ""
        return self.notes

    async def save_memory(self, msgs, session_id=None):
        if not self.enabled:
            return None
        return self._summarize_sync(list(msgs), self._boundary, self._key())

    def _transcript(self, msgs, start):
        out = []
        for m in msgs[start:]:
            if getattr(m, "is_temporary", False) or m.role not in ("user", "assistant") or not m.content:
                continue
            content = m.content
            try:
                if content.strip().startswith("{") and content.strip().endswith("}"):
                    content = json.loads(content).get("content", content)
            except Exception:
                pass
            out.append(("Persona" if m.role == "user" else "Chispa") + ": " + str(content).strip())
        return out

    def _summarize_sync(self, msgs, start, key):
        if self.llm is None:
            return None
        lines = self._transcript(msgs, start)
        if sum(1 for l in lines if l.startswith("Persona")) < 1:
            return None
        gen = self._gen
        with self._file_lock:
            prev = (self._read_all().get(key) or {}).get("notas", "")
        user = "Notas anteriores:\n" + (prev or "(ninguna)") + "\n\nConversación nueva:\n" + "\n".join(lines) + \
               "\n\nFecha: " + time.strftime("%Y-%m-%d")
        try:
            raw = self.llm.response_no_stream(SUMMARY_PROMPT.format(max_chars=self.max_chars), user,
                                              max_tokens=400, temperature=0.2)
            notes = clean_notes(raw, self.max_chars)
        except Exception as e:
            logger.bind(tag=TAG).error(f"No se pudo resumir la memoria: {e}")
            return None
        if raw and not notes and not prev:
            return None
        # si la persona desactivó o borró mientras se resumía, no se vuelve a guardar
        if gen != self._gen or (not self.enabled and key == self._key()):
            return None
        self._store(key, notes)
        if key == self._key():
            self.notes = notes
        logger.bind(tag=TAG).info(f"Memoria Chispa actualizada ({key}, {len(notes)} caracteres)")
        return notes
