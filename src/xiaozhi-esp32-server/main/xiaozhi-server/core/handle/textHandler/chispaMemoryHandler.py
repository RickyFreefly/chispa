import json
from typing import Dict, Any

from core.handle.textMessageHandler import TextMessageHandler
from core.handle.textMessageType import TextMessageType


def memory_state(conn, **extra):
    mem = getattr(conn, "memory", None)
    ok = mem is not None and hasattr(mem, "forget")
    msg = {"type": "chispa_memory", "ok": ok, "supported": ok,
           "enabled": bool(ok and mem.enabled), "person": (mem.person if ok else ""), "has_notes": bool(ok and mem.notes),
           "notes": (mem.notes if ok and mem.enabled else "")}
    msg.update(extra)
    return msg


class ChispaMemoryHandler(TextMessageHandler):
    """La página controla la memoria: {"type":"chispa_memory","action":"enable|disable|forget|status","all":false}."""

    @property
    def message_type(self) -> TextMessageType:
        return TextMessageType.CHISPA_MEMORY

    async def handle(self, conn, msg_json: Dict[str, Any]) -> None:
        mem = getattr(conn, "memory", None)
        action = msg_json.get("action")
        extra = {"action": action}
        if mem is not None and hasattr(mem, "forget"):
            if action == "enable":
                mem.set_enabled(True)
                mem._load()
            elif action == "disable":
                mem.set_enabled(False)
            elif action == "person":
                mem.switch_person(msg_json.get("name"), conn.dialogue.dialogue)
            elif action == "forget":
                extra["forgotten"] = mem.forget(everything=bool(msg_json.get("all")))
        await conn.websocket.send(json.dumps(memory_state(conn, **extra), ensure_ascii=False))
