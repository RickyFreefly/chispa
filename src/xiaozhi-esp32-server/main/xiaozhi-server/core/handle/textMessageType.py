from enum import Enum


class TextMessageType(Enum):
    """消息类型枚举"""
    HELLO = "hello"
    ABORT = "abort"
    LISTEN = "listen"
    IOT = "iot"
    MCP = "mcp"
    SERVER = "server"
    PING = "ping"
    CHISPA_ORGANIZER = "chispa_organizer"
    CHISPA_PROFILE = "chispa_profile"
    CHISPA_MEMORY = "chispa_memory"
