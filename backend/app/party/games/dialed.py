"""Dialed party game: Color and pitch precision recall with 3D cone distance."""
import math
import random
from typing import Dict, Any, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


TARGET_COLORS = [
    {"name": "Electric Cyan", "h": 184, "s": 0.95, "v": 1.0},
    {"name": "Crimson Velvet", "h": 348, "s": 0.88, "v": 0.85},
    {"name": "Amber Sunrise", "h": 38, "s": 0.92, "v": 0.98},
    {"name": "Neon Emerald", "h": 142, "s": 0.85, "v": 0.92},
    {"name": "Royal Purple", "h": 272, "s": 0.78, "v": 0.82},
    {"name": "Hot Magenta", "h": 315, "s": 0.90, "v": 0.95},
    {"name": "Tangerine Burst", "h": 22, "s": 0.94, "v": 0.96},
    {"name": "Cobalt Blue", "h": 220, "s": 0.86, "v": 0.90},
]

TARGET_PITCHES = [
    {"name": "Middle C (C4)", "freq": 261.63},
    {"name": "Concert A (A4)", "freq": 440.00},
    {"name": "Golden E (E4)", "freq": 329.63},
    {"name": "Deep F (F3)", "freq": 174.61},
    {"name": "Bright D (D5)", "freq": 587.33},
    {"name": "Low G (G3)", "freq": 196.00},
]


def hsv_to_cone(h: float, s: float, v: float) -> tuple[float, float, float]:
    rad = math.radians(h % 360)
    x = v * s * math.cos(rad)
    y = v * s * math.sin(rad)
    z = v
    return (x, y, z)


def calculate_color_score(target_hsv: Dict[str, float], guess_hsv: Dict[str, float]) -> float:
    t_x, t_y, t_z = hsv_to_cone(target_hsv["h"], target_hsv["s"], target_hsv["v"])
    g_x, g_y, g_z = hsv_to_cone(guess_hsv.get("h", 0), guess_hsv.get("s", 1.0), guess_hsv.get("v", 1.0))
    dist = math.sqrt((t_x - g_x) ** 2 + (t_y - g_y) ** 2 + (t_z - g_z) ** 2) * 100.0
    return max(0.0, round(100.0 - dist, 1))


def calculate_pitch_score(target_freq: float, guess_freq: float) -> float:
    if guess_freq <= 0 or target_freq <= 0:
        return 0.0
    cents = 1200.0 * abs(math.log2(guess_freq / target_freq))
    return max(0.0, round(100.0 - (cents / 12.0), 1))


class DialedGame(BasePartyGame):
    id = "dialed"
    name = "Dialed"
    tagline = "Tune your senses to exact color hues and audio pitches"
    description = "Test your memory and perception. Match exact target colors and frequencies on your phone dial."
    icon = "🎯"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 3
        self.round_type: str = "COLOR"  # COLOR | PITCH
        self.target_color: Dict[str, Any] = {}
        self.target_pitch: Dict[str, Any] = {}
        self.player_dials: Dict[str, Dict[str, Any]] = {}
        self.round_results: Dict[str, Dict[str, Any]] = {}
        self.winner: Optional[str] = None

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.start_round()

    def start_round(self) -> None:
        self.player_dials.clear()
        self.round_results.clear()
        if self.round_number == 2:
            self.round_type = "PITCH"
            self.target_pitch = random.choice(TARGET_PITCHES)
            self.target_color = {}
        else:
            self.round_type = "COLOR"
            self.target_color = random.choice(TARGET_COLORS)
            self.target_pitch = {}

        self.phase = "INSPECT"
        self.phase_timer = 6.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "INSPECT":
            self.phase = "DIAL"
            self.phase_timer = 20.0
            return self.phase
        elif self.phase == "DIAL":
            self.resolve_round()
            self.phase = "REVEAL"
            self.phase_timer = 10.0
            return self.phase
        elif self.phase == "REVEAL":
            if self.round_number >= self.max_rounds:
                self.phase = "GAME_OVER"
                self.is_over = True
                sorted_scores = sorted(self.scores.items(), key=lambda x: x[1], reverse=True)
                if sorted_scores:
                    self.winner = self.players[sorted_scores[0][0]].nickname
                return self.phase
            else:
                self.round_number += 1
                self.start_round()
                return self.phase
        return None

    def resolve_round(self) -> None:
        for pid in self.players:
            guess = self.player_dials.get(pid, {})
            if self.round_type == "COLOR":
                score_pct = calculate_color_score(self.target_color, guess)
            else:
                guess_f = float(guess.get("pitch", 0))
                score_pct = calculate_pitch_score(self.target_pitch["freq"], guess_f)

            pts = int(round(score_pct * 10))
            self.scores[pid] += pts
            self.round_results[pid] = {
                "score_pct": score_pct,
                "points_awarded": pts,
                "guess": guess,
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "DIAL" and action in ("SUBMIT_DIAL", "LOCK_IN"):
            self.player_dials[player_id] = data
            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_dials) >= len(connected_pids):
                self.resolve_round()
                self.phase = "REVEAL"
                self.phase_timer = 10.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "round_type": self.round_type,
            "target_color": self.target_color if (self.phase in ("INSPECT", "REVEAL", "GAME_OVER")) else None,
            "target_pitch": self.target_pitch if (self.phase in ("INSPECT", "REVEAL", "GAME_OVER")) else None,
            "round_results": self.round_results if self.phase in ("REVEAL", "GAME_OVER") else {},
            "submitted_pids": list(self.player_dials.keys()),
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "round_type": self.round_type,
            "target_color": self.target_color if self.phase == "INSPECT" else None,
            "target_pitch": self.target_pitch if self.phase == "INSPECT" else None,
            "my_dial": self.player_dials.get(player_id),
            "has_locked": player_id in self.player_dials,
            "my_result": self.round_results.get(player_id) if self.phase in ("REVEAL", "GAME_OVER") else None,
            "winner": self.winner,
        })
        return state
