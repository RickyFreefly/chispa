import asyncio
import json
from typing import Dict, Any

from core.handle.textMessageHandler import TextMessageHandler
from core.handle.textMessageType import TextMessageType
from core.chispa import profiles


class ChispaProfileHandler(TextMessageHandler):
    """La página avisa qué perfil está activo: {"type":"chispa_profile","profile":"teacher"}."""

    @property
    def message_type(self) -> TextMessageType:
        return TextMessageType.CHISPA_PROFILE

    async def handle(self, conn, msg_json: Dict[str, Any]) -> None:
        pid = profiles.normalize(msg_json.get("profile"))
        if not pid:
            await conn.websocket.send(json.dumps({"type": "chispa_profile", "ok": False, "error": "perfil desconocido"}))
            return
        conn.chispa_profile = pid
        mem = getattr(conn, "memory", None)
        if mem is not None and hasattr(mem, "switch_profile"):     # cada perfil tiene su propia memoria
            try:
                mem.switch_profile(pid, conn.dialogue.dialogue)
            except Exception as e:
                conn.logger.bind(tag=__name__).error(f"memoria Chispa: {e}")
        try:
            # Reconstruye el prompt del sistema con el perfil (en un hilo: puede tocar caché/archivos)
            await asyncio.get_running_loop().run_in_executor(None, conn._init_prompt_enhancement)
            ok = True
        except Exception as e:
            conn.logger.bind(tag=__name__).error(f"perfil Chispa: {e}")
            ok = False
        await conn.websocket.send(json.dumps({"type": "chispa_profile", "ok": ok, "profile": pid}))
