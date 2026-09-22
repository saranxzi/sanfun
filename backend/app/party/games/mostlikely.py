"""Most Likely To (Social Voting & Roasting) Game Engine."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

MOST_LIKELY_QUESTIONS = [
    "Who is most likely to survive a zombie apocalypse?",
    "Who has the most chaotic or unhinged search history?",
    "Who would accidentally join a cult and not realize it?",
    "Who is most likely to become a billionaire and lose it all on crypto?",
    "Who would be the first person to die in a horror movie?",
    "Who spends the absolute most time checking themselves in mirrors?",
    "Who would be the worst person to get stuck in an elevator with?",
    "Who is most likely to start drama at a family wedding?",
    "Who falls asleep 5 minutes into every movie?",
    "Who is secretly living a double life as a superhero or villain?",
    "Who would forget their own birthday?",
    "Who is most likely to get banned from a buffet?",
    "Who screams the loudest at a jump scare?",
    "Who would survive the longest on a deserted island?",
    "Who has the worst sense of direction and gets lost with GPS?",
    "Who is most likely to talk their way out of a speeding ticket?",
    "Who laughs at the most inappropriate times?",
    "Who would accidentally text the person they are talking about?",
    "Who is most likely to win a reality TV survival show?",
    "Who would spend all their life savings on a quirky impulse purchase?",
    "Who takes 45 minutes to order at a drive-thru?",
    "Who is the biggest sore loser when playing board games?",
    "Who has the messiest room right now at this very moment?",
    "Who is most likely to go viral on TikTok for something embarrassing?",
    "Who would eat food that fell on the floor after 10 seconds?",
]


class MostLikelyGame(BasePartyGame):
    id = "mostlikely"
    name = "Most Likely To"
    tagline = "Vote, Roast & Crown Your Friends."
    description = "Absurd questions about people in the room! Vote secretly, reveal the culprits, and score with the majority."
    icon = "👑"
    min_players = 3
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = min(5, max(3, len(players)))
        self.question_deck: List[str] = []
        self.current_question: str = ""
        self.votes: Dict[str, str] = {}  # voter_id -> target_id
        self.vote_counts: Dict[str, int] = {}  # target_id -> count
        self.top_voted_id: Optional[str] = None
        self.top_voted_count: int = 0

    def start(self) -> None:
        self.question_deck = list(MOST_LIKELY_QUESTIONS)
        random.shuffle(self.question_deck)
        self.round_number = 1
        self.start_round()

    def start_round(self) -> None:
        self.votes.clear()
        self.vote_counts.clear()
        self.top_voted_id = None
        self.top_voted_count = 0
        self.current_question = self.question_deck.pop() if self.question_deck else random.choice(MOST_LIKELY_QUESTIONS)
        self.phase = "QUESTION_VOTE"
        self.phase_timer = 20.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "QUESTION_VOTE":
            self.resolve_votes()
            return self.phase
        elif self.phase == "VOTE_REVEAL":
            self.round_number += 1
            if self.round_number <= self.max_rounds:
                self.start_round()
            else:
                self.phase = "GAME_OVER"
                self.is_over = True
            return self.phase
        return None

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "QUESTION_VOTE" and action == "CAST_VOTE":
            target_id = data.get("target_id")
            if target_id and target_id in self.players:
                self.votes[player_id] = target_id
                if len(self.votes) >= len(self.players):
                    self.resolve_votes()
                return {"broadcast": True}
        return {"status": "ignored"}

    def resolve_votes(self) -> None:
        self.vote_counts = {pid: 0 for pid in self.players}
        for tgt in self.votes.values():
            if tgt in self.vote_counts:
                self.vote_counts[tgt] += 1

        if self.vote_counts:
            sorted_targets = sorted(self.vote_counts.items(), key=lambda item: item[1], reverse=True)
            self.top_voted_id, self.top_voted_count = sorted_targets[0]

            # Award 150 points to anyone who voted for the majority winner!
            for voter_id, voted_target in self.votes.items():
                if voted_target == self.top_voted_id and self.top_voted_count > 0:
                    self.scores[voter_id] += 150

        self.phase = "VOTE_REVEAL"
        self.phase_timer = 9.0

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "question": self.current_question,
            "votes_cast_count": len(self.votes),
            "vote_counts": self.vote_counts if self.phase in ("VOTE_REVEAL", "GAME_OVER") else None,
            "top_voted_name": self.players[self.top_voted_id].nickname if self.top_voted_id and self.phase == "VOTE_REVEAL" else None,
            "top_voted_avatar": self.players[self.top_voted_id].avatar if self.top_voted_id and self.phase == "VOTE_REVEAL" else None,
            "top_voted_count": self.top_voted_count if self.phase == "VOTE_REVEAL" else 0,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        candidates = [
            {"id": pid, "nickname": p.nickname, "avatar": p.avatar}
            for pid, p in self.players.items()
        ]
        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "question": self.current_question,
            "candidates": candidates,
            "my_vote": self.votes.get(player_id),
            "score": self.scores.get(player_id, 0),
            "has_voted": player_id in self.votes,
        }
