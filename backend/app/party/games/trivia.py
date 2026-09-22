"""Trivia Blitz Game Engine."""
import random
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo

TRIVIA_QUESTIONS = [
    {
        "q": "Which planet in our solar system has the most moons?",
        "options": ["Jupiter", "Saturn", "Mars", "Neptune"],
        "correct": 1
    },
    {
        "q": "What is the highest-grossing video game franchise of all time?",
        "options": ["Call of Duty", "Grand Theft Auto", "Pokémon", "Super Mario"],
        "correct": 2
    },
    {
        "q": "How many hearts does an octopus have?",
        "options": ["1", "2", "3", "4"],
        "correct": 2
    },
    {
        "q": "Which chemical element has the symbol 'Fe'?",
        "options": ["Fluorine", "Iron", "Francium", "Fermium"],
        "correct": 1
    },
    {
        "q": "What year was the original iPhone released?",
        "options": ["2005", "2007", "2009", "2010"],
        "correct": 1
    },
    {
        "q": "What is the capital of Australia?",
        "options": ["Sydney", "Melbourne", "Canberra", "Brisbane"],
        "correct": 2
    },
    {
        "q": "In 'The Matrix', what color pill does Neo take to wake up?",
        "options": ["Blue", "Red", "Green", "Yellow"],
        "correct": 1
    },
    {
        "q": "Which mammal is known to have the most powerful bite force relative to size?",
        "options": ["Hippopotamus", "Hyena", "Tasmanian Devil", "Grizzly Bear"],
        "correct": 2
    },
    {
        "q": "Who wrote the play 'Romeo and Juliet'?",
        "options": ["William Shakespeare", "Charles Dickens", "Oscar Wilde", "Jane Austen"],
        "correct": 0
    },
    {
        "q": "What is the largest organ in the human body?",
        "options": ["Liver", "Brain", "Skin", "Lungs"],
        "correct": 2
    }
]


class TriviaGame(BasePartyGame):
    id = "trivia"
    name = "Trivia Blitz"
    tagline = "Speed, Knowledge, and Instant Bragging Rights."
    description = "Fast-paced trivia. The faster you answer on your phone, the higher your score!"
    icon = "⚡"
    min_players = 1
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.questions: List[Dict[str, Any]] = []
        self.current_idx: int = 0
        self.answers: Dict[str, Dict[str, Any]] = {}  # pid -> {choice: int, time_left: float}
        self.streaks: Dict[str, int] = {pid: 0 for pid in players}

    def start(self) -> None:
        self.questions = random.sample(TRIVIA_QUESTIONS, min(6, len(TRIVIA_QUESTIONS)))
        self.current_idx = 0
        self.start_question()

    def start_question(self) -> None:
        self.phase = "QUESTION"
        self.phase_timer = 15.0
        self.answers.clear()

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "QUESTION":
            self.resolve_question()
            return self.phase
        elif self.phase == "REVEAL":
            self.current_idx += 1
            if self.current_idx < len(self.questions):
                self.start_question()
            else:
                self.phase = "GAME_OVER"
                self.is_over = True
            return self.phase
        return None

    def resolve_question(self) -> None:
        q = self.questions[self.current_idx]
        correct_opt = q["correct"]

        for pid in self.players:
            ans = self.answers.get(pid)
            if ans and ans.get("choice") == correct_opt:
                # Speed points: 500 base + up to 500 bonus based on remaining time
                time_bonus = int((ans.get("time_left", 0.0) / 15.0) * 500)
                streak = self.streaks.get(pid, 0) + 1
                self.streaks[pid] = streak
                streak_bonus = min(streak * 50, 250)
                self.scores[pid] += 500 + time_bonus + streak_bonus
            else:
                self.streaks[pid] = 0

        self.phase = "REVEAL"
        self.phase_timer = 7.0

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "QUESTION" and action == "SUBMIT_ANSWER":
            choice = data.get("choice")
            if choice in (0, 1, 2, 3) and player_id not in self.answers:
                self.answers[player_id] = {
                    "choice": choice,
                    "time_left": self.phase_timer
                }
                if len(self.answers) == len(self.players):
                    self.resolve_question()
                return {"broadcast": True}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        for p in state["players"]:
            pid = p["id"]
            p["streak"] = self.streaks.get(pid, 0)
            p["answered"] = pid in self.answers

        q = self.questions[self.current_idx] if self.current_idx < len(self.questions) else None
        stats = [0, 0, 0, 0]
        if self.phase == "REVEAL":
            for ans in self.answers.values():
                c = ans.get("choice")
                if c is not None and 0 <= c < 4:
                    stats[c] += 1

        state.update({
            "question_index": self.current_idx + 1,
            "total_questions": len(self.questions),
            "question": q["q"] if q else "",
            "options": q["options"] if q else [],
            "correct_option": q["correct"] if self.phase == "REVEAL" else None,
            "option_stats": stats if self.phase == "REVEAL" else None,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        ans = self.answers.get(player_id)
        q = self.questions[self.current_idx] if self.current_idx < len(self.questions) else None

        return {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "has_answered": ans is not None,
            "selected_choice": ans.get("choice") if ans else None,
            "correct_option": q["correct"] if self.phase == "REVEAL" and q else None,
            "is_correct": (ans.get("choice") == q["correct"]) if self.phase == "REVEAL" and ans and q else None,
            "streak": self.streaks.get(player_id, 0),
            "score": self.scores.get(player_id, 0),
        }
