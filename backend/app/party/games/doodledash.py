"""DoodleDash (Draw & Guess) Game Engine with real-time vector streaming."""
import random
import difflib
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

DOODLE_WORDS = [
    "Pizza", "Robot", "Guitar", "Castle", "Rocket", "Dinosaur", "Unicorn", "Octopus",
    "Helicopter", "Sandwich", "Telescope", "Bicycle", "Dragon", "Penguin", "Pirate",
    "Volcano", "Cactus", "Diamond", "Spaceship", "Cupcake", "Kangaroo", "Lighthouse"
]


class DoodleDashGame(BasePartyGame):
    id = "doodledash"
    name = "DoodleDash"
    tagline = "Draw Fast, Guess Faster."
    description = "One player draws in real time on their phone, everyone else races to guess the word!"
    icon = "🎨"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo]):
        super().__init__(room_code, players)
        self.drawer_order: List[str] = list(players.keys())
        self.current_drawer_idx: int = 0
        self.secret_word: str = ""
        self.strokes: List[Dict[str, Any]] = []
        self.correct_guessers: List[str] = []
        self.guesses: List[Dict[str, Any]] = []

    def start(self) -> None:
        random.shuffle(self.drawer_order)
        self.current_drawer_idx = 0
        self.start_round()

    def start_round(self) -> None:
        self.secret_word = random.choice(DOODLE_WORDS)
        self.strokes.clear()
        self.correct_guessers.clear()
        self.guesses.clear()
        self.phase = "DRAWING"
        self.phase_timer = 50.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "DRAWING":
            self.resolve_round()
            return self.phase
        elif self.phase == "ROUND_SUMMARY":
            self.current_drawer_idx += 1
            if self.current_drawer_idx < min(len(self.drawer_order), 4):
                self.start_round()
            else:
                self.phase = "GAME_OVER"
                self.is_over = True
            return self.phase
        return None

    def resolve_round(self) -> None:
        drawer_id = self.drawer_order[self.current_drawer_idx]
        if self.correct_guessers:
            self.scores[drawer_id] += 200

        self.phase = "ROUND_SUMMARY"
        self.phase_timer = 7.0

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        drawer_id = self.drawer_order[self.current_drawer_idx]

        if self.phase == "DRAWING":
            if player_id == drawer_id:
                if action == "DRAW_STROKE":
                    stroke = data.get("stroke")
                    if stroke:
                        self.strokes.append(stroke)
                        return {"broadcast": True, "event": "STROKE", "stroke": stroke}
                elif action == "CLEAR_CANVAS":
                    self.strokes.clear()
                    return {"broadcast": True, "event": "CLEAR"}

            elif player_id != drawer_id and player_id not in self.correct_guessers:
                if action == "SUBMIT_GUESS":
                    raw_guess = str(data.get("guess", "")).strip()[:30]
                    if not raw_guess:
                        return {"status": "ignored"}

                    sim = difflib.SequenceMatcher(None, raw_guess.lower(), self.secret_word.lower()).ratio()
                    if raw_guess.lower() == self.secret_word.lower():
                        self.correct_guessers.append(player_id)
                        rank = len(self.correct_guessers)
                        pts = 300 if rank == 1 else (200 if rank == 2 else 100)
                        self.scores[player_id] += pts
                        
                        self.guesses.append({
                            "player_name": self.players[player_id].nickname,
                            "text": "guessed the word!",
                            "is_correct": True
                        })

                        # If all guessers guessed correctly, end drawing immediately
                        non_drawers = [pid for pid in self.players if pid != drawer_id]
                        if len(self.correct_guessers) == len(non_drawers):
                            self.resolve_round()

                        return {"broadcast": True}
                    else:
                        is_close = sim > 0.70
                        self.guesses.append({
                            "player_name": self.players[player_id].nickname,
                            "text": raw_guess,
                            "is_correct": False
                        })
                        return {"broadcast": True, "private_hint": "Close!" if is_close else None}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        drawer_id = self.drawer_order[self.current_drawer_idx]
        state = self.get_base_state()
        for p in state["players"]:
            pid = p["id"]
            p["is_drawer"] = pid == drawer_id
            p["has_guessed"] = pid in self.correct_guessers

        state.update({
            "drawer_name": self.players[drawer_id].nickname,
            "strokes": self.strokes,
            "secret_word": self.secret_word if self.phase in ("ROUND_SUMMARY", "GAME_OVER") else ("_ " * len(self.secret_word)),
            "word_length": len(self.secret_word),
            "guesses": self.guesses[-6:],
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        drawer_id = self.drawer_order[self.current_drawer_idx]
        is_drawer = player_id == drawer_id
        has_guessed = player_id in self.correct_guessers

        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "is_drawer": is_drawer,
            "has_guessed": has_guessed,
            "secret_word": self.secret_word if (is_drawer or self.phase in ("ROUND_SUMMARY", "GAME_OVER")) else ("_ " * len(self.secret_word)),
            "guesses": self.guesses[-5:],
            "score": self.scores.get(player_id, 0),
        }
