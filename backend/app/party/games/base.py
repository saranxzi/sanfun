"""Base class for all Sanfun Couch Co-Op party games."""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from app.party.protocol import PlayerInfo


class BasePartyGame(ABC):
    id: str = ""
    name: str = ""
    tagline: str = ""
    description: str = ""
    icon: str = "🎮"
    min_players: int = 3
    max_players: int = 12

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo]):
        self.room_code = room_code
        self.players = {pid: p.model_copy() for pid, p in players.items()}
        self.phase: str = "INIT"
        self.phase_timer: float = 0.0
        self.round_number: int = 1
        self.max_rounds: int = 3
        self.scores: Dict[str, int] = {pid: 0 for pid in players}
        self.is_over: bool = False

    @abstractmethod
    def start(self) -> None:
        """Initialize game state and start first phase."""
        pass

    @abstractmethod
    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Handles an action sent by a player from their mobile controller.
        Returns dict with optional 'broadcast': bool, 'events': list of audio/visual cues.
        """
        pass

    def tick(self, delta_time: float) -> Optional[str]:
        """
        Optionally advances phase timers.
        Returns new phase name if phase automatically transitioned, else None.
        """
        if self.phase_timer > 0:
            self.phase_timer = max(0.0, self.phase_timer - delta_time)
            if self.phase_timer == 0:
                return self.on_timer_expired()
        return None

    def on_timer_expired(self) -> Optional[str]:
        return None

    def get_public_players(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": p.id,
                "nickname": p.nickname,
                "avatar": p.avatar,
                "color": p.color,
                "score": self.scores.get(p.id, 0),
                "is_connected": p.is_connected,
            }
            for p in self.players.values()
        ]

    def get_base_state(self) -> Dict[str, Any]:
        return {
            "game_id": self.id,
            "room_code": self.room_code,
            "phase": self.phase,
            "phase_timer": self.phase_timer,
            "round_number": self.round_number,
            "max_rounds": self.max_rounds,
            "is_over": self.is_over,
            "scores": self.scores,
            "players": self.get_public_players(),
        }

    @abstractmethod
    def get_host_state(self) -> Dict[str, Any]:
        """
        Returns the public state sent to the Big Screen TV/Monitor.
        Must NEVER reveal secret roles/words during hidden phases.
        """
        pass

    @abstractmethod
    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """
        Returns the role-masked, private state sent to a specific player's phone.
        Must contain controls and secret info pertinent ONLY to this player.
        """
        pass

    def on_player_disconnect(self, player_id: str) -> None:
        if player_id in self.players:
            self.players[player_id].is_connected = False

    def on_player_reconnect(self, player_id: str) -> None:
        if player_id in self.players:
            self.players[player_id].is_connected = True
