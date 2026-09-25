"""Word Bomb (Hot Potato Word Race) Game Engine."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

BOMB_PROMPTS = [
    "CON", "PRO", "ING", "TER", "EX", "ANT", "TRA", "MAN", "DIS", "RE",
    "FOR", "CAT", "BAR", "RUN", "TOP", "STAR", "WIN", "FIRE", "DAY",
    "LIGHT", "SEA", "AIR", "CAR", "RED", "BOX", "SKY", "OUT", "IN",
    "ALL", "ONE", "WAR", "ART", "END", "NEW", "BIG", "SUN", "ICE"
]


class WordBombGame(BasePartyGame):
    id = "wordbomb"
    name = "Word Bomb"
    tagline = "Ticking Bomb Hot Potato Word Race."
    description = "A ticking bomb is passed from player to player! Type a word containing the prompt before it explodes in your hands."
    icon = "💣"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.player_order: List[str] = list(players.keys())
        self.current_turn_idx: int = 0
        self.current_prompt: str = ""
        self.used_words: set = set()
        self.strikes: Dict[str, int] = {pid: 0 for pid in players}
        self.turn_count: int = 0
        self.last_word: Optional[str] = None
        self.last_exploded_player: Optional[str] = None
        self.max_rounds = min(4, max(2, len(players)))

    def start(self) -> None:
        self.player_order = list(self.players.keys())
        random.shuffle(self.player_order)
        self.round_number = 1
        self.start_round()

    def start_round(self) -> None:
        self.used_words.clear()
        self.turn_count = 0
        self.start_turn()

    def start_turn(self) -> None:
        self.current_prompt = random.choice(BOMB_PROMPTS)
        # Fuse burns faster as turns progress (10s down to 5s)
        self.phase = "ROUND_ACTIVE"
        self.phase_timer = max(5.0, 10.0 - (self.turn_count * 0.4))
        self.turn_count += 1

    @property
    def active_player_order(self) -> List[str]:
        active = [pid for pid in self.player_order if self.strikes.get(pid, 0) < 3]
        return active if active else self.player_order

    @property
    def current_holder_id(self) -> str:
        active = self.active_player_order
        if not active:
            return ""
        return active[self.current_turn_idx % len(active)]

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "ROUND_ACTIVE":
            # BOOM! Bomb exploded on current holder!
            exploded_id = self.current_holder_id
            self.last_exploded_player = self.players[exploded_id].nickname if exploded_id in self.players else None
            self.strikes[exploded_id] = self.strikes.get(exploded_id, 0) + 1

            active_remaining = [pid for pid in self.player_order if self.strikes.get(pid, 0) < 3]
            if len(active_remaining) <= 1:
                if active_remaining:
                    self.scores[active_remaining[0]] = self.scores.get(active_remaining[0], 0) + 300
                self.phase = "GAME_OVER"
                self.is_over = True
                return self.phase

            self.phase = "EXPLOSION"
            self.phase_timer = 4.0
            return self.phase
        elif self.phase == "EXPLOSION":
            self.round_number += 1
            if self.round_number <= self.max_rounds:
                self.current_turn_idx += 1
                self.start_round()
            else:
                self.phase = "GAME_OVER"
                self.is_over = True
            return self.phase
        return None

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "ROUND_ACTIVE" and action == "SUBMIT_WORD":
            if player_id != self.current_holder_id:
                return {"status": "not_your_turn"}

            raw_word = str(data.get("word", "")).strip().upper()
            if not raw_word or len(raw_word) < 3 or not raw_word.isalpha():
                return {"status": "invalid_format"}

            # Prompt check
            if self.current_prompt not in raw_word:
                return {"status": "missing_prompt"}

            # Repeat word check
            if raw_word in self.used_words:
                return {"status": "word_already_used"}

            # Defused! Word accepted
            self.used_words.add(raw_word)
            self.last_word = raw_word
            
            # Points based on speed and word length
            pts = 100 + (len(raw_word) * 10) + int(self.phase_timer * 10)
            self.scores[player_id] = self.scores.get(player_id, 0) + pts

            # Pass bomb to next player
            self.current_turn_idx += 1
            self.start_turn()

            return {
                "broadcast": True,
                "event": "BOMB_DEFUSED",
                "word": raw_word,
                "passed_to": self.players[self.current_holder_id].nickname
            }

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        holder_id = self.current_holder_id
        for p in state["players"]:
            pid = p["id"]
            p["is_holding_bomb"] = pid == holder_id
            p["strikes"] = self.strikes.get(pid, 0)

        state.update({
            "current_prompt": self.current_prompt,
            "holder_id": holder_id,
            "holder_name": self.players[holder_id].nickname if holder_id in self.players else None,
            "holder_avatar": self.players[holder_id].avatar if holder_id in self.players else None,
            "last_word": self.last_word,
            "last_exploded_player": self.last_exploded_player,
            "words_used_count": len(self.used_words),
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        is_my_turn = player_id == self.current_holder_id
        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "is_holding_bomb": is_my_turn,
            "current_prompt": self.current_prompt,
            "holder_name": self.players[self.current_holder_id].nickname if self.current_holder_id in self.players else None,
            "last_word": self.last_word,
            "strikes": self.strikes.get(player_id, 0),
            "score": self.scores.get(player_id, 0),
        }
