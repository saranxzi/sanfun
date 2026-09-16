"""Find the Imposter (Chameleon/Spyfall) Game Engine."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

WORD_PACKS = {
    "Locations": ["Airport", "Hospital", "Space Station", "Submarine", "Casino", "Cruise Ship", "Amusement Park", "Art Museum", "Pirate Ship", "Movie Theater", "Police Station", "Ski Resort"],
    "Animals": ["Penguin", "Chameleon", "Kangaroo", "Great White Shark", "Platypus", "Grizzly Bear", "Cheetah", "Octopus", "Flamingo", "Bald Eagle", "Sloth", "Hippopotamus"],
    "Food & Drink": ["Sushi", "Pizza", "Tacos", "Espresso", "Croissant", "Dim Sum", "Ice Cream Sundae", "Ramen", "Pad Thai", "Cheeseburger", "Apple Pie", "Guacamole"],
    "Movies": ["Titanic", "Jurassic Park", "The Matrix", "Inception", "Avatar", "Star Wars", "Harry Potter", "The Lion King", "Avengers", "Gladiator", "Shrek", "Interstellar"],
    "Professions": ["Astronaut", "Detective", "Brain Surgeon", "Magician", "Deep Sea Diver", "Pilot", "Secret Agent", "Archaeologist", "Rock Star", "Firefighter", "Chef", "Blacksmith"],
    "Household Objects": ["Toaster", "Blender", "Vacuum Cleaner", "Microwave", "Alarm Clock", "Television", "Refrigerator", "Washing Machine", "Coffee Maker", "Hairdryer"]
}


class ImposterGame(BasePartyGame):
    id = "imposter"
    name = "Find the Imposter"
    tagline = "Spot the Chameleon Among You."
    description = "One player is the Imposter who doesn't know the secret word. Can the crew catch them before they blend in?"
    icon = "🦎"
    min_players = 3
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo]):
        super().__init__(room_code, players)
        self.imposter_ids: List[str] = []
        self.category: str = ""
        self.secret_word: str = ""
        self.clue_order: List[str] = []
        self.votes: Dict[str, str] = {}
        self.voted_out_id: Optional[str] = None
        self.imposter_guess: Optional[str] = None
        self.imposter_guess_correct: bool = False
        self.winner: Optional[str] = None

    def start(self) -> None:
        pids = list(self.players.keys())
        random.shuffle(pids)

        num_imposters = 1 if len(pids) < 7 else 2
        self.imposter_ids = pids[:num_imposters]
        self.clue_order = pids[:]

        self.category = random.choice(list(WORD_PACKS.keys()))
        self.secret_word = random.choice(WORD_PACKS[self.category])

        self.phase = "WORD_REVEAL"
        self.phase_timer = 10.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "WORD_REVEAL":
            self.phase = "CLUE_ROUNDS"
            self.phase_timer = 75.0
            return self.phase
        elif self.phase == "CLUE_ROUNDS":
            self.phase = "VOTING"
            self.phase_timer = 30.0
            self.votes.clear()
            return self.phase
        elif self.phase == "VOTING":
            self.resolve_voting()
            return self.phase
        elif self.phase == "IMPOSTER_GUESS":
            self.resolve_guess()
            return self.phase
        return None

    def resolve_voting(self) -> None:
        tally: Dict[str, int] = {}
        for target in self.votes.values():
            tally[target] = tally.get(target, 0) + 1

        if tally:
            self.voted_out_id = max(tally, key=tally.get)
        else:
            self.voted_out_id = random.choice(list(self.players.keys()))

        if self.voted_out_id in self.imposter_ids:
            # Imposter caught! Give them 15 seconds to clutch-guess the word
            self.phase = "IMPOSTER_GUESS"
            self.phase_timer = 18.0
        else:
            # Imposter escaped detection! Imposter wins!
            self.winner = "IMPOSTER"
            for imp in self.imposter_ids:
                self.scores[imp] += 300
            self.phase = "GAME_OVER"
            self.is_over = True

    def resolve_guess(self) -> None:
        if self.imposter_guess and self.imposter_guess.strip().lower() == self.secret_word.lower():
            self.imposter_guess_correct = True
            self.winner = "IMPOSTER"
            for imp in self.imposter_ids:
                self.scores[imp] += 400
        else:
            self.imposter_guess_correct = False
            self.winner = "CREW"
            for pid in self.players:
                if pid not in self.imposter_ids:
                    self.scores[pid] += 200

        self.phase = "GAME_OVER"
        self.is_over = True

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "VOTING" and action == "CAST_VOTE":
            target_id = data.get("target_id")
            if target_id and target_id in self.players and target_id != player_id:
                self.votes[player_id] = target_id
                if len(self.votes) == len(self.players):
                    self.resolve_voting()
                return {"broadcast": True}

        elif self.phase == "IMPOSTER_GUESS" and action in ("GUESS_WORD", "SUBMIT_GUESS"):
            if player_id in self.imposter_ids:
                self.imposter_guess = data.get("guess", "").strip()
                self.resolve_guess()
                return {"broadcast": True}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        """Big Screen TV view. Does NOT leak secret word or imposter identity until GAME_OVER!"""
        state = self.get_base_state()
        for p in state["players"]:
            p["is_imposter"] = (p["id"] in self.imposter_ids) if self.phase == "GAME_OVER" else None

        state.update({
            "category": self.category,
            "secret_word": self.secret_word if self.phase == "GAME_OVER" else None,
            "clue_order": [self.players[pid].nickname for pid in self.clue_order if pid in self.players],
            "voted_out_name": self.players[self.voted_out_id].nickname if self.voted_out_id else None,
            "voted_out_was_imposter": (self.voted_out_id in self.imposter_ids) if self.voted_out_id else None,
            "imposter_guess": self.imposter_guess,
            "imposter_guess_correct": self.imposter_guess_correct,
            "winner": self.winner,
            "candidate_words": WORD_PACKS.get(self.category, []),
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """Private mobile controller view. Imposter never gets the secret word!"""
        is_imposter = player_id in self.imposter_ids

        candidates = [
            {"id": pid, "nickname": p.nickname, "avatar": p.avatar}
            for pid, p in self.players.items()
            if pid != player_id
        ]

        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "category": self.category,
            "is_imposter": is_imposter,
            "secret_word": "???" if is_imposter else self.secret_word,
            "candidates": candidates,
            "my_vote": self.votes.get(player_id),
            "candidate_words": WORD_PACKS.get(self.category, []),
            "score": self.scores.get(player_id, 0),
        }
