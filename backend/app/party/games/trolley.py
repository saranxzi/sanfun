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
    {
        "title": "The Animal Whisperer",
        "option_a": "You can speak fluent English with every dog and cat on Earth",
        "option_b": "You can speak and understand every human language fluently",
        "icon_a": "🐕",
        "icon_b": "🌐"
    },
    {
        "title": "The Rewind Button",
        "option_a": "A button that rewinds time by 10 minutes (usable once per day)",
        "option_b": "A button that pauses universal time for 1 hour (usable once per week)",
        "icon_a": "⏪",
        "icon_b": "⏸️"
    },
    {
        "title": "The Culinary Monolith",
        "option_a": "Eat world-class gourmet dining every day, but you can only drink plain lukewarm tap water",
        "option_b": "Drink any top-tier beverage for free forever, but all food tastes like unsalted mashed potatoes",
        "icon_a": "🥩",
        "icon_b": "🍷"
    },
    {
        "title": "The Career Lottery",
        "option_a": "Earn $500,000/year doing a deeply boring data entry job 40 hours a week",
        "option_b": "Earn $60,000/year working only 10 hours a week at your dream creative passion",
        "icon_a": "💼",
        "icon_b": "🎨"
    },
    {
        "title": "The Omniscient Spoiler",
        "option_a": "Know the exact year, day, and cause of your own death",
        "option_b": "Know the exact year, day, and cause of death of everyone you love (except yourself)",
        "icon_a": "⚰️",
        "icon_b": "🔮"
    },
    {
        "title": "The Soundtrack of Life",
        "option_a": "Epic cinematic orchestra music plays in the background of your life matching your emotions",
        "option_b": "A studio sitcom laugh-track plays whenever you do something awkward or funny",
        "icon_a": "🎻",
        "icon_b": "😂"
    },
    {
        "title": "The Robot Uprising",
        "option_a": "Submit to a benevolent supercomputer overlord who eliminates disease and poverty but bans free elections",
        "option_b": "Remain in chaotic, flawed human democracy with all its wars, recessions, and crises",
        "icon_a": "🤖",
        "icon_b": "🗳️"
    },
    {
        "title": "The Memory Wipe",
        "option_a": "Erase your worst memory forever, but lose your happiest memory alongside it",
        "option_b": "Keep both memories intact with 100% emotional clarity forever",
        "icon_a": "🧹",
        "icon_b": "🧠"
    },
    {
        "title": "The Trolley & The Self-Driving Car",
        "option_a": "Program autonomous cars to always sacrifice the passenger to save 3 pedestrians",
        "option_b": "Program autonomous cars to always protect the passenger at all costs",
        "icon_a": "🚶",
        "icon_b": "🚗"
    },
    {
        "title": "The Fame Dilemma",
        "option_a": "Be universally famous worldwide, but 30% of the population actively despises you",
        "option_b": "Be completely unknown and anonymous, but loved deeply by a tight circle of 5 friends",
        "icon_a": "🌟",
        "icon_b": "🏡"
    },
    {
        "title": "The Weather Oracle",
        "option_a": "It is always a crisp 72°F (22°C) sunny afternoon wherever you go",
        "option_b": "You can summon cozy, soothing autumn thunderstorms whenever you feel like resting",
        "icon_a": "☀️",
        "icon_b": "⛈️"
    },
    {
        "title": "The Smartphone Curse",
        "option_a": "Your smartphone battery never drops below 100%, but your Wi-Fi is permanently 3G speed",
        "option_b": "Blazing Gigabit 10Gbps internet everywhere, but your battery dies in 45 minutes",
        "icon_a": "🔋",
        "icon_b": "⚡"
    },
    {
        "title": "The Telepathic Pet",
        "option_a": "Your pet understands every human word you say, but can never respond",
        "option_b": "Your pet can speak 5 sentences in English, but criticizes your life choices daily",
        "icon_a": "🐱",
        "icon_b": "🗣️"
    },
    {
        "title": "The Historical Vacation",
        "option_a": "Spend 1 week living in ancient Rome during its peak golden age with full diplomatic immunity",
        "option_b": "Spend 1 week exploring a vibrant cyberpunk city on Mars in the year 2350",
        "icon_a": "🏛️",
        "icon_b": "🛸"
    },
    {
        "title": "The Dream Recorder",
        "option_a": "Wake up every morning with a 4K downloadable video file of whatever you dreamed",
        "option_b": "Have full conscious lucid-dreaming control of your dreams every single night",
        "icon_a": "📹",
        "icon_b": "✨"
    },
    {
        "title": "The Universal Refund",
        "option_a": "Get a full cash refund on every item or service you ever bought that you regretted",
        "option_b": "Get back all the wasted hours you ever spent stuck in traffic or waiting in line",
        "icon_a": "💰",
        "icon_b": "⌛"
    },
    {
        "title": "The Wardrobe Miracle",
        "option_a": "A magical closet that dispenses any outfit you imagine, perfectly tailored and cleaned",
        "option_b": "Never need to brush your teeth, shower, or shave—you remain perpetually fresh and groomed",
        "icon_a": "👔",
        "icon_b": "✨"
    },
    {
        "title": "The Ultimate Dinner Guest",
        "option_a": "Have a private 2-hour dinner with any historical figure who has ever lived",
        "option_b": "Have a private 2-hour dinner with your great-great-grandchild from 100 years in the future",
        "icon_a": "📜",
        "icon_b": "👶"
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
