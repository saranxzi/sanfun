"""Schemas and constants for Party Game communications."""
from enum import Enum
from pydantic import BaseModel


class ClientMessageType(str, Enum):
    JOIN = "JOIN"
    RECONNECT = "RECONNECT"
    SELECT_GAME = "SELECT_GAME"
    START_GAME = "START_GAME"
    BACK_TO_LOBBY = "BACK_TO_LOBBY"
    GAME_ACTION = "GAME_ACTION"
    KICK_PLAYER = "KICK_PLAYER"
    PING = "PING"


class ServerMessageType(str, Enum):
    ROOM_STATE = "ROOM_STATE"
    PLAYER_STATE = "PLAYER_STATE"
    TIMER_TICK = "TIMER_TICK"
    GAME_EVENT = "GAME_EVENT"
    ERROR = "ERROR"
    PONG = "PONG"


class PlayerInfo(BaseModel):
    id: str
    nickname: str
    avatar: str = "🎮"
    color: str = "#00f0ff"
    is_host: bool = False
    is_connected: bool = True
    score: int = 0
