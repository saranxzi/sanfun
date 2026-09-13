"""Type-safe schemas and protocols for Party Game communications."""
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ClientMessageType(str, Enum):
    JOIN = "JOIN"
    RECONNECT = "RECONNECT"
    SELECT_GAME = "SELECT_GAME"
    UPDATE_SETTINGS = "UPDATE_SETTINGS"
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


class PlayerRole(str, Enum):
    HOST = "host"
    PLAYER = "player"


class PlayerInfo(BaseModel):
    id: str
    nickname: str
    avatar: str = "🎮"
    color: str = "#00f0ff"
    is_host: bool = False
    is_connected: bool = True
    score: int = 0


class InboundMessage(BaseModel):
    type: ClientMessageType
    room_code: Optional[str] = None
    session_token: Optional[str] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    game_id: Optional[str] = None
    action: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    target_player_id: Optional[str] = None


class OutboundMessage(BaseModel):
    type: ServerMessageType
    payload: Dict[str, Any] = Field(default_factory=dict)
