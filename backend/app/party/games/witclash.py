"""WitClash (Quiplash-style Head-to-Head Comedy Battle)."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

PROMPTS = [
    "The worst thing to say right after a romantic first kiss.",
    "A rejected title for the next Marvel movie.",
    "Something you should never shout in a crowded airport.",
    "The secret ingredient in cafeteria mystery meat.",
    "A terrible name for a brand of luxury perfume.",
    "An awkward thing to whisper in your boss\'s ear during a meeting.",
    "The most useless superpower imaginable.",
    "A terrifying warning label to find on a children\'s toy.",
    "What aliens really think when they look at human beings.",
    "The weirdest reason to break up with someone on the first date.",
    "A disastrous slogan for a dental clinic.",
    "What dogs are actually saying when they bark at nothing.",
    "The absolute worst song to play at a wedding.",
    "Something that instantly ruins a job interview in 5 seconds.",
    "A bizarre item to bring to a deserted island.",
    "The worst theme for an amusement park.",
    "A phrase that sounds reassuring until you hear the doctor say it.",
    "The real reason cats knock glasses off tables.",
    "A terrible slogan for an airline company.",
    "Something you never want to find floating in your bathtub.",
    "The worst possible mascot for a children\'s hospital.",
    "A ridiculous excuse for being late to your own wedding.",
    "The strangest thing to find in a hotel nightstand.",
    "A movie title that describes your current love life.",
    "The worst gift to bring to a housewarming party."
]


class WitClashGame(BasePartyGame):
    id = "witclash"
    name = "WitClash"
    tagline = "The Head-to-Head Battle of Wits."
    description = "Answer hilarious prompts on your phone, then vote on the funniest responses on the big screen!"
    icon = "🎭"
    min_players = 3
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo]):
        super().__init__(room_code, players)
        self.prompts: List[Dict[str, Any]] = []  # [{id, text, p1_id, p2_id, a1, a2, votes: {voter_id: 1 or 2}}]
        self.matchup_index: int = 0
        self.submissions: Dict[str, Dict[int, str]] = {}  # pid -> {prompt_id: text}

    def start(self) -> None:
        pids = list(self.players.keys())
        random.shuffle(pids)
        available_prompts = random.sample(PROMPTS, min(len(pids), len(PROMPTS)))

        # Assign each prompt to adjacent pairs of players in a ring
        self.prompts.clear()
        for i, prompt_text in enumerate(available_prompts):
            p1 = pids[i]
            p2 = pids[(i + 1) % len(pids)]
            self.prompts.append({
                "id": i,
                "text": prompt_text,
                "p1_id": p1,
                "p2_id": p2,
                "a1": None,
                "a2": None,
                "votes": {}
            })

        self.phase = "PROMPT_INPUT"
        self.phase_timer = 50.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "PROMPT_INPUT":
            # Auto-fill any blanks
            for p in self.prompts:
                if not p["a1"]:
                    p["a1"] = f"A completely blank mind from {self.players[p['p1_id']].nickname}"
                if not p["a2"]:
                    p["a2"] = f"Total radio silence from {self.players[p['p2_id']].nickname}"
            self.matchup_index = 0
            self.start_matchup()
            return self.phase
        elif self.phase == "SHOWDOWN_VOTE":
            self.resolve_matchup_vote()
            return self.phase
        elif self.phase == "SHOWDOWN_REVEAL":
            self.matchup_index += 1
            if self.matchup_index < len(self.prompts):
                self.start_matchup()
            else:
                self.phase = "GAME_OVER"
                self.is_over = True
            return self.phase
        return None

    def start_matchup(self) -> None:
        self.phase = "SHOWDOWN_VOTE"
        self.phase_timer = 18.0

    def resolve_matchup_vote(self) -> None:
        matchup = self.prompts[self.matchup_index]
        v1 = sum(1 for v in matchup["votes"].values() if v == 1)
        v2 = sum(1 for v in matchup["votes"].values() if v == 2)
        total = v1 + v2

        pts1 = int((v1 / total * 500)) if total > 0 else 0
        pts2 = int((v2 / total * 500)) if total > 0 else 0

        # Double WitClash bonus for sweeping 100% of the votes
        if total > 0 and v1 == total:
            pts1 += 250
        elif total > 0 and v2 == total:
            pts2 += 250

        self.scores[matchup["p1_id"]] += pts1
        self.scores[matchup["p2_id"]] += pts2

        self.phase = "SHOWDOWN_REVEAL"
        self.phase_timer = 8.0

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "PROMPT_INPUT" and action == "SUBMIT_ANSWER":
            prompt_idx = data.get("prompt_id")
            answer = str(data.get("answer", "")).strip()[:100]
            if answer and prompt_idx is not None and 0 <= prompt_idx < len(self.prompts):
                p = self.prompts[prompt_idx]
                if p["p1_id"] == player_id:
                    p["a1"] = answer
                elif p["p2_id"] == player_id:
                    p["a2"] = answer

                # Check if all submitted
                all_done = all(p["a1"] is not None and p["a2"] is not None for p in self.prompts)
                if all_done:
                    self.matchup_index = 0
                    self.start_matchup()
                return {"broadcast": True}

        elif self.phase == "SHOWDOWN_VOTE" and action == "CAST_VOTE":
            choice = data.get("choice")  # 1 or 2
            matchup = self.prompts[self.matchup_index]
            # Authors cannot vote on their own matchup
            if player_id not in (matchup["p1_id"], matchup["p2_id"]) and choice in (1, 2):
                matchup["votes"][player_id] = choice
                eligible_voters = [pid for pid in self.players if pid not in (matchup["p1_id"], matchup["p2_id"])]
                if len(matchup["votes"]) == len(eligible_voters):
                    self.resolve_matchup_vote()
                return {"broadcast": True}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        current_matchup = None
        if self.phase in ("SHOWDOWN_VOTE", "SHOWDOWN_REVEAL"):
            m = self.prompts[self.matchup_index]
            v1 = sum(1 for v in m["votes"].values() if v == 1)
            v2 = sum(1 for v in m["votes"].values() if v == 2)
            current_matchup = {
                "prompt": m["text"],
                "answer_1": m["a1"],
                "answer_2": m["a2"],
                "votes_count": len(m["votes"]),
                "author_1": self.players[m["p1_id"]].nickname if self.phase == "SHOWDOWN_REVEAL" else None,
                "author_2": self.players[m["p2_id"]].nickname if self.phase == "SHOWDOWN_REVEAL" else None,
                "votes_1": v1 if self.phase == "SHOWDOWN_REVEAL" else None,
                "votes_2": v2 if self.phase == "SHOWDOWN_REVEAL" else None,
                "is_sweep": (v1 > 0 and v2 == 0) or (v2 > 0 and v1 == 0) if self.phase == "SHOWDOWN_REVEAL" else False
            }

        state.update({
            "matchup_index": self.matchup_index,
            "total_matchups": len(self.prompts),
            "current_matchup": current_matchup,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "score": self.scores.get(player_id, 0),
        }

        if self.phase == "PROMPT_INPUT":
            my_prompts = []
            for p in self.prompts:
                if p["p1_id"] == player_id:
                    my_prompts.append({"id": p["id"], "text": p["text"], "answered": p["a1"] is not None})
                elif p["p2_id"] == player_id:
                    my_prompts.append({"id": p["id"], "text": p["text"], "answered": p["a2"] is not None})
            state["my_prompts"] = my_prompts

        elif self.phase == "SHOWDOWN_VOTE":
            m = self.prompts[self.matchup_index]
            is_author = player_id in (m["p1_id"], m["p2_id"])
            state["can_vote"] = not is_author
            state["prompt"] = m["text"]
            state["answer_1"] = m["a1"]
            state["answer_2"] = m["a2"]
            state["my_vote"] = m["votes"].get(player_id)

        return state
