"""Absurd Dilemmas: Trolley problem paradoxes and room consensus betting."""
import random
from typing import Dict, Any, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


DILEMMAS = [
    {
        "title": "The Time Loop Paradox",
        "option_a": "Relive the best year of your life on an infinite 1-year loop forever",
        "option_b": "Jump 30 years into the future with perfect health and $10 Million",
        "icon_a": "⏳",
        "icon_b": "🚀"
    },
    {
        "title": "The Social Truth Ray",
        "option_a": "Everyone in the world can hear whatever you think about them",
        "option_b": "You can hear what everyone in the room secretly thinks of you at all times",
        "icon_a": "📢",
        "icon_b": "🧠"
    },
    {
        "title": "The Digital Diet",
        "option_a": "Never use the internet or smartphones ever again for the rest of your life",
        "option_b": "Never eat hot cooked food again (only room-temperature or chilled foods)",
        "icon_a": "📵",
        "icon_b": "🥗"
    },
    {
        "title": "The Sleep Trade-off",
        "option_a": "Never have to sleep again with zero fatigue (24 waking hours every day)",
        "option_b": "Every time you wake up, you find a crisp $200 bill under your pillow",
        "icon_a": "⚡",
        "icon_b": "💵"
    },
    {
        "title": "The Quantum Trolley",
        "option_a": "Divert the trolley to hit 5 clones of yourself from parallel universes",
        "option_b": "Let the trolley hit 1 completely random stranger",
        "icon_a": "👥",
        "icon_b": "👤"
    },
    {
        "title": "The Superpower Curse",
        "option_a": "Invisibility, but only while you are singing show tunes at full volume",
        "option_b": "Teleportation, but you always arrive completely soaking wet",
        "icon_a": "🎶",
        "icon_b": "🌊"
    },
]


class TrolleyGame(BasePartyGame):
    id = "trolley"
    name = "Absurd Dilemmas"
    tagline = "Ethical paradoxes, trolley problems, and consensus betting"
    description = "Make an impossible moral choice, then bet whether your friends will agree with you or choose chaos."
    icon = "🚋"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 3
        self.current_dilemma: Dict[str, Any] = {}
        self.player_choices: Dict[str, Dict[str, Any]] = {}
        self.round_results: Dict[str, Dict[str, Any]] = {}
        self.tally: Dict[str, int] = {"A": 0, "B": 0}
        self.majority_choice: Optional[str] = None
        self.used_indices: list[int] = []
        self.winner: Optional[str] = None

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.start_round()

    def start_round(self) -> None:
        self.player_choices.clear()
        self.round_results.clear()
        self.tally = {"A": 0, "B": 0}
        self.majority_choice = None

        avail = [i for i in range(len(DILEMMAS)) if i not in self.used_indices]
        if not avail:
            self.used_indices.clear()
            avail = list(range(len(DILEMMAS)))

        idx = random.choice(avail)
        self.used_indices.append(idx)
        self.current_dilemma = DILEMMAS[idx]

        self.phase = "CHOICE"
        self.phase_timer = 22.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "CHOICE":
            self.resolve_round()
            self.phase = "REVEAL"
            self.phase_timer = 12.0
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
        a_count = sum(1 for c in self.player_choices.values() if c.get("choice") == "A")
        b_count = sum(1 for c in self.player_choices.values() if c.get("choice") == "B")
        self.tally = {"A": a_count, "B": b_count}

        if a_count > b_count:
            self.majority_choice = "A"
        elif b_count > a_count:
            self.majority_choice = "B"
        else:
            self.majority_choice = "TIE"

        is_chaos_tie = (a_count > 0 and a_count == b_count)
        is_unanimous = (a_count == 0 or b_count == 0) and (a_count + b_count > 1)

        for pid in self.players:
            choice_data = self.player_choices.get(pid, {})
            c = choice_data.get("choice")
            bet_agree = choice_data.get("bet_majority", True)

            pts = 0
            predicted_correctly = False

            if c:
                is_with_majority = (c == self.majority_choice)
                if self.majority_choice == "TIE":
                    predicted_correctly = False
                elif bet_agree == is_with_majority:
                    pts += 500
                    predicted_correctly = True

                # Bonus points for room alignment or chaos
                if is_chaos_tie:
                    pts += 300
                elif is_unanimous:
                    pts += 200

            self.scores[pid] += pts
            self.round_results[pid] = {
                "choice": c,
                "bet_majority": bet_agree,
                "predicted_correctly": predicted_correctly,
                "points": pts,
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "CHOICE" and action in ("SUBMIT_CHOICE", "LOCK_IN"):
            choice = data.get("choice")
            if choice in ("A", "B"):
                self.player_choices[player_id] = {
                    "choice": choice,
                    "bet_majority": bool(data.get("bet_majority", True))
                }

            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_choices) >= len(connected_pids):
                self.resolve_round()
                self.phase = "REVEAL"
                self.phase_timer = 12.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "dilemma_title": self.current_dilemma.get("title"),
            "option_a": self.current_dilemma.get("option_a"),
            "option_b": self.current_dilemma.get("option_b"),
            "icon_a": self.current_dilemma.get("icon_a"),
            "icon_b": self.current_dilemma.get("icon_b"),
            "submitted_pids": list(self.player_choices.keys()),
            "tally": self.tally if self.phase in ("REVEAL", "GAME_OVER") else {},
            "majority_choice": self.majority_choice if self.phase in ("REVEAL", "GAME_OVER") else None,
            "round_results": self.round_results if self.phase in ("REVEAL", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "dilemma_title": self.current_dilemma.get("title"),
            "option_a": self.current_dilemma.get("option_a"),
            "option_b": self.current_dilemma.get("option_b"),
            "icon_a": self.current_dilemma.get("icon_a"),
            "icon_b": self.current_dilemma.get("icon_b"),
            "my_choice": self.player_choices.get(player_id),
            "has_chosen": player_id in self.player_choices,
            "tally": self.tally if self.phase in ("REVEAL", "GAME_OVER") else {},
            "majority_choice": self.majority_choice if self.phase in ("REVEAL", "GAME_OVER") else None,
            "my_result": self.round_results.get(player_id) if self.phase in ("REVEAL", "GAME_OVER") else None,
            "winner": self.winner,
        })
        return state
