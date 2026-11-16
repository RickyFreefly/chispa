import asyncio
import json
from typing import Dict, Any

from core.handle.textMessageHandler import TextMessageHandler
from core.handle.textMessageType import TextMessageType
from core.chispa import organizer as org
from core.chispa import info


class ChispaOrganizerHandler(TextMessageHandler):
    """Acciones de la página sobre el organizador: subscribe, stop, delete, complete, snapshot."""

    @property
    def message_type(self) -> TextMessageType:
        return TextMessageType.CHISPA_ORGANIZER

    async def handle(self, conn, msg_json: Dict[str, Any]) -> None:
        if msg_json.get("action") == "info":      # tarjeta de hora/clima: la red va en un hilo para no frenar la conversación
            data = await asyncio.get_running_loop().run_in_executor(None, info.panel, None, str(msg_json.get("city", ""))[:60])
            await conn.websocket.send(json.dumps({"type": "chispa_organizer", "event": "info", "info": data}, ensure_ascii=False))
            return
        hub = org.get_hub()
        st = hub.store
        hub.register(conn)
        action = msg_json.get("action")
        try:
            iid = int(msg_json.get("id", 0))
        except (TypeError, ValueError):
            iid = 0
        err = None
        try:
            if action in ("stop", "delete") and iid:
                (st.stop if action == "stop" else st.delete)(iid)
            elif action == "complete" and msg_json.get("name"):
                st.complete(str(msg_json["name"]))
            elif action == "complete_id" and iid:
                it = st.get(iid)
                if it:
                    st.complete(it["text"])
        except org.OrganizerError as e:
            err = str(e)
        out = {"type": "chispa_organizer", "event": "state", "state": st.snapshot()}
        if err:
            out["error"] = err
        await conn.websocket.send(json.dumps(out, ensure_ascii=False))
        if action != "subscribe":
            hub.notify_changed()
