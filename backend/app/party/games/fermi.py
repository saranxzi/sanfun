"""Fermi Estimator: Order-of-magnitude physics and world trivia puzzles."""
import math
import random
from typing import Dict, Any, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


FERMI_QUESTIONS = [
    {
        "prompt": "How many seconds has modern recorded human history (~5,000 years) lasted?",
        "actual": 157680000000,
        "unit": "seconds",
        "fact": "5,000 years * 365.25 days * 86,400 seconds = ~157.7 Billion seconds.",
    },
    {
        "prompt": "How many standard golf balls could fit inside the passenger cabin of a Boeing 747?",
        "actual": 16000000,
        "unit": "golf balls",
        "fact": "A 747 passenger volume is ~876 m³, and a sphere packing fraction of ~64% yields ~16 Million balls.",
    },
    {
        "prompt": "How many liters of water are in all the Earth's oceans combined?",
        "actual": 1335000000000000000000,
        "unit": "liters",
        "fact": "Total ocean volume is ~1.335 billion cubic kilometers, which equals 1.335 Sextillion liters.",
    },
    {
        "prompt": "How many total heartbeats does an average human experience in an 80-year lifetime?",
        "actual": 3360000000,
        "unit": "heartbeats",
        "fact": "At an average resting rate of 80 beats per minute, an 80-year life has ~3.36 Billion heartbeats.",
    },
    {
        "prompt": "How many pizza slices are consumed in the United States every single day?",
        "actual": 30000000,
        "unit": "slices",
        "fact": "Americans eat roughly 350 slices per second, totaling ~30 Million slices each day.",
    },
    {
        "prompt": "What is the total mass of the Earth's entire atmosphere in kilograms?",
        "actual": 5150000000000000000,
        "unit": "kg",
        "fact": "Atmospheric surface pressure multiplied by Earth's surface area gives ~5.15 * 10^18 kg.",
    },
    {
        "prompt": "How many active piano tuners are estimated to work in Chicago? (The classic Fermi problem)",
        "actual": 125,
        "unit": "piano tuners",
        "fact": "Enrico Fermi's celebrated dimensional analysis: ~5 million population -> ~125 full-time tuners.",
    },
    {
        "prompt": "How many spoken words does an average human utter across an entire 75-year lifetime?",
        "actual": 860000000,
        "unit": "words",
        "fact": "Speaking ~16,000 words per day over 75 years totals roughly 860 Million words.",
    },
    {
        "prompt": "How many cells make up the human body?",
        "actual": 37200000000000,
        "unit": "cells",
        "fact": "Biochemists estimate ~37.2 Trillion human cells in an average adult, not counting microbiota.",
    },
    {
        "prompt": "How many trees are currently growing on planet Earth?",
        "actual": 3040000000000,
        "unit": "trees",
        "fact": "A landmark Nature satellite study counted approximately 3.04 Trillion trees globally.",
    },
    {
        "prompt": "How many grains of sand are there on all the beaches and deserts of Earth combined?",
        "actual": 7500000000000000000,
        "unit": "grains of sand",
        "fact": "Geologists estimate ~7.5 Quintillion grains (7.5 * 10^18) across Earth's coastlines and dunes.",
    },
    {
        "prompt": "How many seconds does it take for light from the Sun to reach the surface of Pluto?",
        "actual": 19680,
        "unit": "seconds",
        "fact": "At an average distance of 5.9 billion km, light travels for ~19,680 seconds (about 5.5 hours).",
    },
    {
        "prompt": "How many LEGO bricks have been manufactured worldwide since 1958?",
        "actual": 600000000000,
        "unit": "bricks",
        "fact": "The LEGO Group has produced over 600 Billion plastic elements—nearly 80 bricks per living human.",
    },
    {
        "prompt": "How many breaths does an average person take during their lifetime?",
        "actual": 672000000,
        "unit": "breaths",
        "fact": "At ~16 breaths per minute over an 80-year lifespan, you take approximately 672 Million breaths.",
    },
    {
        "prompt": "How many search queries does Google process in one single day?",
        "actual": 8500000000,
        "unit": "searches",
        "fact": "Google serves around 99,000 searches per second, surpassing 8.5 Billion queries each day.",
    },
    {
        "prompt": "How many kilometers does light travel in one full year (1 Light-Year)?",
        "actual": 9460730472580,
        "unit": "km",
        "fact": "Traveling at 299,792 km/s, light covers ~9.46 Trillion kilometers in one Julian year.",
    },
    {
        "prompt": "How many individual hairs are on an average human head?",
        "actual": 100000,
        "unit": "hairs",
        "fact": "The average human scalp contains roughly 100,000 hair follicles.",
    },
    {
        "prompt": "How many ants are estimated to be alive on Earth right now?",
        "actual": 20000000000000000,
        "unit": "ants",
        "fact": "A 2022 global ecological census estimated 20 Quadrillion (2 * 10^16) ants crawling on Earth.",
    },
    {
        "prompt": "How many commercial flights take off around the world in a single year?",
        "actual": 38000000,
        "unit": "flights",
        "fact": "Global commercial aviation operates approximately 38 Million scheduled flights annually.",
    },
    {
        "prompt": "How many liters of blood does the human heart pump over an 80-year lifetime?",
        "actual": 200000000,
        "unit": "liters",
        "fact": "Pumping ~7,000 liters per day over 80 years equals roughly 200 Million liters.",
    },
    {
        "prompt": "How many stars are in the Milky Way galaxy?",
        "actual": 250000000000,
        "unit": "stars",
        "fact": "Astronomers estimate between 100 Billion and 400 Billion stars, with 250 Billion as the standard median.",
    },
    {
        "prompt": "How many cups of coffee are consumed globally every day?",
        "actual": 2250000000,
        "unit": "cups",
        "fact": "Humans drink an astonishing 2.25 Billion cups of coffee every single day.",
    },
    {
        "prompt": "How many red blood cells are in one single drop (~0.05 mL) of human blood?",
        "actual": 250000000,
        "unit": "red blood cells",
        "fact": "One microliter contains ~5 million cells, giving roughly 250 Million red blood cells in one drop.",
    },
    {
        "prompt": "How many total kilograms of food does an average human eat in a lifetime?",
        "actual": 35000,
        "unit": "kg",
        "fact": "At roughly 1.5 to 2 kg of food per day over 75 years, you consume about 35,000 kg (35 metric tons).",
    },
]


def score_fermi_guess(guess: Any, actual: float) -> tuple[int, float]:
    """Scores order of magnitude with zero division and negative/NaN guards."""
    try:
        val = float(guess)
        if math.isnan(val) or math.isinf(val):
            val = 1e-9
    except (ValueError, TypeError):
        val = 1e-9

    safe_guess = max(1e-9, val)
    safe_actual = max(1e-9, actual)

    d_log = abs(math.log10(safe_guess) - math.log10(safe_actual))
    # 0 orders of magnitude off = 1000 pts
    # 1 order of magnitude off = 667 pts
    # 3 orders of magnitude off = 0 pts
    score_fraction = max(0.0, 1.0 - (d_log / 3.0))
    pts = int(round(1000 * score_fraction))
    return pts, round(d_log, 2)


class FermiGame(BasePartyGame):
    id = "fermi"
    name = "Fermi Estimator"
    tagline = "Order-of-magnitude estimation on cosmic and chaotic scales"
    description = "How many golf balls fit in a 747? Guess quantities across vast orders of magnitude without crashing into zero."
    icon = "🪐"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 3
        self.current_q: Dict[str, Any] = {}
        self.player_guesses: Dict[str, float] = {}
        self.round_results: Dict[str, Dict[str, Any]] = {}
        self.winner: Optional[str] = None
        self.used_q_indices: list[int] = []

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.start_round()

    def start_round(self) -> None:
        self.player_guesses.clear()
        self.round_results.clear()

        avail_indices = [i for i in range(len(FERMI_QUESTIONS)) if i not in self.used_q_indices]
        if not avail_indices:
            self.used_q_indices.clear()
            avail_indices = list(range(len(FERMI_QUESTIONS)))

        chosen_idx = random.choice(avail_indices)
        self.used_q_indices.append(chosen_idx)
        self.current_q = FERMI_QUESTIONS[chosen_idx]

        self.phase = "QUESTION"
        self.phase_timer = 30.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "QUESTION":
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
        actual = self.current_q["actual"]
        for pid in self.players:
            guess_val = self.player_guesses.get(pid, 0.0)
            pts, d_log = score_fermi_guess(guess_val, actual)
            self.scores[pid] += pts
            self.round_results[pid] = {
                "guess": guess_val,
                "d_log": d_log,
                "points": pts,
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "QUESTION" and action in ("SUBMIT_GUESS", "LOCK_IN"):
            raw_guess = data.get("guess", 0)
            try:
                val = float(raw_guess)
                if math.isnan(val) or math.isinf(val):
                    val = 0.0
            except (ValueError, TypeError):
                val = 0.0
            self.player_guesses[player_id] = val

            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_guesses) >= len(connected_pids):
                self.resolve_round()
                self.phase = "REVEAL"
                self.phase_timer = 12.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "prompt": self.current_q.get("prompt"),
            "unit": self.current_q.get("unit"),
            "actual": self.current_q.get("actual") if self.phase in ("REVEAL", "GAME_OVER") else None,
            "fact": self.current_q.get("fact") if self.phase in ("REVEAL", "GAME_OVER") else None,
            "submitted_pids": list(self.player_guesses.keys()),
            "round_results": self.round_results if self.phase in ("REVEAL", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "prompt": self.current_q.get("prompt"),
            "unit": self.current_q.get("unit"),
            "actual": self.current_q.get("actual") if self.phase in ("REVEAL", "GAME_OVER") else None,
            "my_guess": self.player_guesses.get(player_id),
            "has_locked": player_id in self.player_guesses,
            "my_result": self.round_results.get(player_id) if self.phase in ("REVEAL", "GAME_OVER") else None,
            "winner": self.winner,
        })
        return state
