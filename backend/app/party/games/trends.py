"""Higher or Lower: Global search trends battles with streak multipliers."""
import random
from typing import Dict, Any, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


TREND_COMPARISONS = [
    {
        "item_a": {"name": "Minecraft", "volume": 24500000, "icon": "⛏️"},
        "item_b": {"name": "Fortnite", "volume": 29000000, "icon": "🔫"},
        "relation": "HIGHER"  # 29M > 24.5M
    },
    {
        "item_a": {"name": "Taylor Swift", "volume": 38000000, "icon": "🎤"},
        "item_b": {"name": "Lionel Messi", "volume": 45000000, "icon": "⚽"},
        "relation": "HIGHER"  # 45M > 38M
    },
    {
        "item_a": {"name": "Pizza", "volume": 8200000, "icon": "🍕"},
        "item_b": {"name": "Sushi", "volume": 5100000, "icon": "🍣"},
        "relation": "LOWER"  # 5.1M < 8.2M
    },
    {
        "item_a": {"name": "PlayStation 5", "volume": 14000000, "icon": "🎮"},
        "item_b": {"name": "Nintendo Switch", "volume": 11500000, "icon": "🕹️"},
        "relation": "LOWER"  # 11.5M < 14M
    },
    {
        "item_a": {"name": "Python (Programming)", "volume": 3800000, "icon": "🐍"},
        "item_b": {"name": "JavaScript", "volume": 2900000, "icon": "📜"},
        "relation": "LOWER"  # 2.9M < 3.8M
    },
    {
        "item_a": {"name": "Elon Musk", "volume": 12000000, "icon": "🚀"},
        "item_b": {"name": "Bill Gates", "volume": 4100000, "icon": "💻"},
        "relation": "LOWER"  # 4.1M < 12M
    },
    {
        "item_a": {"name": "Avengers", "volume": 7400000, "icon": "🦸"},
        "item_b": {"name": "Star Wars", "volume": 9800000, "icon": "⚔️"},
        "relation": "HIGHER"  # 9.8M > 7.4M
    },
    {
        "item_a": {"name": "Netflix", "volume": 88000000, "icon": "🍿"},
        "item_b": {"name": "Spotify", "volume": 42000000, "icon": "🎧"},
        "relation": "LOWER"  # 42M < 88M
    },
    {
        "item_a": {"name": "YouTube", "volume": 182000000, "icon": "📺"},
        "item_b": {"name": "Facebook", "volume": 151000000, "icon": "👥"},
        "relation": "LOWER"  # 151M < 182M
    },
    {
        "item_a": {"name": "Batman", "volume": 11200000, "icon": "🦇"},
        "item_b": {"name": "Spider-Man", "volume": 16500000, "icon": "🕷️"},
        "relation": "HIGHER"  # 16.5M > 11.2M
    },
    {
        "item_a": {"name": "Cristiano Ronaldo", "volume": 55000000, "icon": "🏆"},
        "item_b": {"name": "LeBron James", "volume": 18400000, "icon": "🏀"},
        "relation": "LOWER"  # 18.4M < 55M
    },
    {
        "item_a": {"name": "Grand Theft Auto", "volume": 19500000, "icon": "🚗"},
        "item_b": {"name": "Call of Duty", "volume": 13800000, "icon": "🎯"},
        "relation": "LOWER"  # 13.8M < 19.5M
    },
    {
        "item_a": {"name": "Reddit", "volume": 85000000, "icon": "👽"},
        "item_b": {"name": "Wikipedia", "volume": 68000000, "icon": "📚"},
        "relation": "LOWER"  # 68M < 85M
    },
    {
        "item_a": {"name": "Disneyland", "volume": 6100000, "icon": "🏰"},
        "item_b": {"name": "Universal Studios", "volume": 3900000, "icon": "🎢"},
        "relation": "LOWER"  # 3.9M < 6.1M
    },
    {
        "item_a": {"name": "Amazon", "volume": 125000000, "icon": "📦"},
        "item_b": {"name": "eBay", "volume": 41000000, "icon": "🏷️"},
        "relation": "LOWER"  # 41M < 125M
    },
    {
        "item_a": {"name": "Coca-Cola", "volume": 5800000, "icon": "🥤"},
        "item_b": {"name": "Pepsi", "volume": 3200000, "icon": "🥫"},
        "relation": "LOWER"  # 3.2M < 5.8M
    },
    {
        "item_a": {"name": "Pokemon", "volume": 33000000, "icon": "⚡"},
        "item_b": {"name": "Roblox", "volume": 49000000, "icon": "🧱"},
        "relation": "HIGHER"  # 49M > 33M
    },
    {
        "item_a": {"name": "Harry Potter", "volume": 14500000, "icon": "⚡"},
        "item_b": {"name": "Lord of the Rings", "volume": 8200000, "icon": "💍"},
        "relation": "LOWER"  # 8.2M < 14.5M
    },
    {
        "item_a": {"name": "Coffee", "volume": 9100000, "icon": "☕"},
        "item_b": {"name": "Tea", "volume": 6400000, "icon": "🍵"},
        "relation": "LOWER"  # 6.4M < 9.1M
    },
    {
        "item_a": {"name": "Tesla", "volume": 21000000, "icon": "⚡"},
        "item_b": {"name": "BMW", "volume": 25500000, "icon": "🚘"},
        "relation": "HIGHER"  # 25.5M > 21M
    },
    {
        "item_a": {"name": "Instagram", "volume": 140000000, "icon": "📸"},
        "item_b": {"name": "TikTok", "volume": 115000000, "icon": "🎵"},
        "relation": "LOWER"  # 115M < 140M
    },
    {
        "item_a": {"name": "Super Mario", "volume": 12800000, "icon": "🍄"},
        "item_b": {"name": "Sonic the Hedgehog", "volume": 7900000, "icon": "🦔"},
        "relation": "LOWER"  # 7.9M < 12.8M
    },
    {
        "item_a": {"name": "Guitar", "volume": 5200000, "icon": "🎸"},
        "item_b": {"name": "Piano", "volume": 7100000, "icon": "🎹"},
        "relation": "HIGHER"  # 7.1M > 5.2M
    },
    {
        "item_a": {"name": "Burger King", "volume": 9400000, "icon": "🍔"},
        "item_b": {"name": "McDonald's", "volume": 28000000, "icon": "🍟"},
        "relation": "HIGHER"  # 28M > 9.4M
    },
]


class TrendsGame(BasePartyGame):
    id = "trends"
    name = "Higher or Lower"
    tagline = "Global search volumes showdown with streak multipliers"
    description = "Does Item B get HIGHER or LOWER average monthly search volume than Item A? Keep your streak alive to multiply points."
    icon = "📈"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 4
        self.current_matchup: Dict[str, Any] = {}
        self.player_guesses: Dict[str, str] = {}  # pid -> "HIGHER" | "LOWER"
        self.streaks: Dict[str, int] = {pid: 0 for pid in players}
        self.round_results: Dict[str, Dict[str, Any]] = {}
        self.used_indices: list[int] = []
        self.winner: Optional[str] = None

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.streaks = {pid: 0 for pid in self.players}
        self.start_round()

    def start_round(self) -> None:
        self.player_guesses.clear()
        self.round_results.clear()

        avail = [i for i in range(len(TREND_COMPARISONS)) if i not in self.used_indices]
        if not avail:
            self.used_indices.clear()
            avail = list(range(len(TREND_COMPARISONS)))

        idx = random.choice(avail)
        self.used_indices.append(idx)
        self.current_matchup = TREND_COMPARISONS[idx]

        self.phase = "GUESS"
        self.phase_timer = 16.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "GUESS":
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
        correct_relation = self.current_matchup["relation"]

        for pid in self.players:
            guess = self.player_guesses.get(pid)
            is_correct = (guess == correct_relation)

            if is_correct:
                current_streak = self.streaks.get(pid, 0) + 1
                self.streaks[pid] = current_streak
                # Streak multiplier: 1x, 1.5x, 2.0x, 2.5x
                mult = min(2.5, 1.0 + (current_streak - 1) * 0.5)
                pts = int(round(300 * mult))
            else:
                self.streaks[pid] = 0
                pts = 0

            self.scores[pid] += pts
            self.round_results[pid] = {
                "guess": guess,
                "is_correct": is_correct,
                "streak": self.streaks.get(pid, 0),
                "points": pts,
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "GUESS" and action in ("SUBMIT_GUESS", "GUESS_TREND"):
            choice = data.get("guess", "").upper()
            if choice in ("HIGHER", "LOWER"):
                self.player_guesses[player_id] = choice

            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_guesses) >= len(connected_pids):
                self.resolve_round()
                self.phase = "REVEAL"
                self.phase_timer = 10.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "item_a": self.current_matchup.get("item_a"),
            "item_b": {
                "name": self.current_matchup["item_b"]["name"],
                "icon": self.current_matchup["item_b"]["icon"],
                "volume": self.current_matchup["item_b"]["volume"] if self.phase in ("REVEAL", "GAME_OVER") else None
            } if "item_b" in self.current_matchup else None,
            "relation": self.current_matchup.get("relation") if self.phase in ("REVEAL", "GAME_OVER") else None,
            "submitted_pids": list(self.player_guesses.keys()),
            "streaks": self.streaks,
            "round_results": self.round_results if self.phase in ("REVEAL", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "item_a": self.current_matchup.get("item_a"),
            "item_b": {
                "name": self.current_matchup["item_b"]["name"],
                "icon": self.current_matchup["item_b"]["icon"],
                "volume": self.current_matchup["item_b"]["volume"] if self.phase in ("REVEAL", "GAME_OVER") else None
            } if "item_b" in self.current_matchup else None,
            "my_guess": self.player_guesses.get(player_id),
            "has_guessed": player_id in self.player_guesses,
            "my_streak": self.streaks.get(player_id, 0),
            "my_result": self.round_results.get(player_id) if self.phase in ("REVEAL", "GAME_OVER") else None,
            "winner": self.winner,
        })
        return state
