"""Party Room and Session Management with WebSocket routing."""
import asyncio
import random
import string
import time
import uuid
from typing import Dict, Optional, Any, List
from fastapi import WebSocket
from app.party.protocol import PlayerInfo, ServerMessageType
from app.party.games.base import BasePartyGame
from app.party.games import create_game, get_available_games
from app.party.network import get_network_info


AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐸", "🐙", "🦄", "🤖", "👾", "🦖", "🚀"]
COLORS = ["#ff0055", "#00f0ff", "#ffdd00", "#00ff66", "#aa00ff", "#ff7700", "#0099ff", "#ff00aa"]


class PartyRoom:
    def __init__(self, code: str):
        self.code: str = code
        self.host_socket: Optional[WebSocket] = None
        self.players: Dict[str, PlayerInfo] = {}  # player_id -> PlayerInfo
        self.player_sockets: Dict[str, WebSocket] = {}  # player_id -> WebSocket
        self.session_tokens: Dict[str, str] = {}  # token -> player_id
        
        self.selected_game_id: str = "mafia"
        self.game_instance: Optional[BasePartyGame] = None
        self.state: str = "LOBBY"  # LOBBY | IN_GAME
        self.created_at: float = time.time()
        self.last_activity: float = time.time()

    def get_public_players(self) -> List[Dict[str, Any]]:
        return [p.model_dump() for p in self.players.values()]

    def get_lobby_state(self) -> Dict[str, Any]:
        return {
            "room_code": self.code,
            "state": self.state,
            "selected_game_id": self.selected_game_id,
            "available_games": get_available_games(),
            "players": self.get_public_players(),
            "player_count": len(self.players),
            "host_connected": self.host_socket is not None,
            "network_info": get_network_info(),
        }

    async def send_json_safe(self, ws: Optional[WebSocket], msg_type: ServerMessageType, payload: Dict[str, Any]):
        if ws is None:
            return
        try:
            await ws.send_json({"type": msg_type.value, "payload": payload})
        except Exception:
            pass

    async def broadcast_room_state(self):
        """Broadcasts lobby overview to Host and all connected players."""
        state = self.get_lobby_state()
        if self.host_socket:
            await self.send_json_safe(self.host_socket, ServerMessageType.ROOM_STATE, state)
        for ws in self.player_sockets.values():
            await self.send_json_safe(ws, ServerMessageType.ROOM_STATE, state)

    async def broadcast_game_state(self):
        """Broadcasts host projection to Big Screen and role-masked projection to each phone."""
        if not self.game_instance:
            return

        # 1. Host Screen
        if self.host_socket:
            host_state = self.game_instance.get_host_state()
            host_state["room_code"] = self.code
            host_state["state"] = self.state
            await self.send_json_safe(self.host_socket, ServerMessageType.ROOM_STATE, host_state)

        # 2. Each Player (Strict role masking!)
        for pid, ws in list(self.player_sockets.items()):
            if pid in self.players:
                p_info = self.players[pid]
                player_state = self.game_instance.get_player_state(pid)
                player_state["room_code"] = self.code
                player_state["state"] = self.state
                player_state["player_id"] = pid
                player_state["nickname"] = p_info.nickname
                player_state["avatar"] = p_info.avatar
                player_state["color"] = p_info.color
                await self.send_json_safe(ws, ServerMessageType.PLAYER_STATE, player_state)

    async def broadcast_timer_tick(self, phase_timer: float):
        payload = {"phase_timer": phase_timer}
        if self.host_socket:
            await self.send_json_safe(self.host_socket, ServerMessageType.TIMER_TICK, payload)
        for ws in list(self.player_sockets.values()):
            await self.send_json_safe(ws, ServerMessageType.TIMER_TICK, payload)

    async def broadcast_event(self, event_name: str, event_data: Dict[str, Any]):
        msg = {"event": event_name, **event_data}
        if self.host_socket:
            await self.send_json_safe(self.host_socket, ServerMessageType.GAME_EVENT, msg)
        for ws in self.player_sockets.values():
            await self.send_json_safe(ws, ServerMessageType.GAME_EVENT, msg)

    async def start_game(self) -> bool:
        avail = {g["id"]: g for g in get_available_games()}
        meta = avail.get(self.selected_game_id)
        if not meta or len(self.players) < meta["min_players"]:
            return False

        self.game_instance = create_game(self.selected_game_id, self.code, self.players)
        self.game_instance.start()
        self.state = "IN_GAME"
        await self.broadcast_game_state()
        await self.broadcast_event("GAME_STARTED", {"game_id": self.selected_game_id})
        return True

    async def back_to_lobby(self):
        self.state = "LOBBY"
        self.game_instance = None
        await self.broadcast_room_state()
        await self.broadcast_event("RETURN_TO_LOBBY", {})

    def add_player(self, nickname: str, avatar: Optional[str] = None, color: Optional[str] = None) -> tuple[PlayerInfo, str]:
        pid = f"p_{uuid.uuid4().hex[:8]}"
        session_token = uuid.uuid4().hex
        
        assigned_avatar = avatar or random.choice(AVATARS)
        assigned_color = color or COLORS[len(self.players) % len(COLORS)]

        player = PlayerInfo(
            id=pid,
            nickname=nickname.strip()[:16],
            avatar=assigned_avatar,
            color=assigned_color,
            is_host=False,
            is_connected=True,
            score=0
        )

        self.players[pid] = player
        self.session_tokens[session_token] = pid
        return player, session_token

    def reconnect_player(self, session_token: str) -> Optional[PlayerInfo]:
        pid = self.session_tokens.get(session_token)
        if pid and pid in self.players:
            self.players[pid].is_connected = True
            if self.game_instance:
                self.game_instance.on_player_reconnect(pid)
            return self.players[pid]
        return None

    def disconnect_player(self, pid: str):
        if pid in self.players:
            self.players[pid].is_connected = False
            self.player_sockets.pop(pid, None)
            if self.game_instance:
                self.game_instance.on_player_disconnect(pid)
            elif self.state == "LOBBY":
                # In lobby, remove disconnected players after clean exit
                pass

    def kick_player(self, pid: str):
        if pid in self.players:
            self.players.pop(pid, None)
            ws = self.player_sockets.pop(pid, None)
            # Remove session token
            tokens_to_del = [tok for tok, p in self.session_tokens.items() if p == pid]
            for tok in tokens_to_del:
                self.session_tokens.pop(tok, None)


class PartyRoomManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PartyRoomManager, cls).__new__(cls)
            cls._instance.rooms = {}
            cls._instance.tick_task = None
        return cls._instance

    def generate_room_code(self) -> str:
        # Avoid ambiguous characters (0, O, 1, I, L)
        chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
        for _ in range(100):
            code = "".join(random.choices(chars, k=4))
            if code not in self.rooms:
                return code
        return uuid.uuid4().hex[:4].upper()

    def create_room(self) -> PartyRoom:
        code = self.generate_room_code()
        room = PartyRoom(code)
        self.rooms[code] = room
        return room

    def get_room(self, code: str) -> Optional[PartyRoom]:
        return self.rooms.get(code.upper().strip())

    def remove_room(self, code: str):
        self.rooms.pop(code.upper().strip(), None)

    async def run_tick_loop(self):
        tick_count = 0
        while True:
            await asyncio.sleep(0.5)
            tick_count += 1
            for room in list(self.rooms.values()):
                if room.state == "IN_GAME" and room.game_instance:
                    trans = room.game_instance.tick(0.5)
                    if trans:
                        await room.broadcast_game_state()
                        await room.broadcast_event("PHASE_CHANGE", {"new_phase": trans})
                    elif tick_count % 2 == 0:
                        # Sync timer every 1 second
                        await room.broadcast_timer_tick(round(room.game_instance.phase_timer, 1))


room_manager = PartyRoomManager()
