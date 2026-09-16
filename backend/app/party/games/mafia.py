"""Mafia (Social Deduction) Game Engine with strict role masking."""
import random
import time
from typing import Optional, Dict, Any, List
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


class MafiaGame(BasePartyGame):
    id = "mafia"
    name = "Mafia"
    tagline = "Trust No One. Deceive Everyone."
    description = "A battle between the cunning Mafia syndicate and the innocent Villagers."
    icon = "🕵️"
    min_players = 4
    max_players = 16

    ROLE_MAFIA = "MAFIA"
    ROLE_DOCTOR = "DOCTOR"
    ROLE_DETECTIVE = "DETECTIVE"
    ROLE_VILLAGER = "VILLAGER"

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo]):
        super().__init__(room_code, players)
        self.roles: Dict[str, str] = {}
        self.alive_players: set = set(self.players.keys())
        
        # Night actions
        self.mafia_votes: Dict[str, str] = {}  # mafia_player_id -> target_player_id
        self.doctor_target: Optional[str] = None
        self.detective_target: Optional[str] = None
        self.detective_result: Optional[Dict[str, str]] = None  # {target_id, target_name, alignment}
        
        # Day actions
        self.day_votes: Dict[str, str] = {}  # voter_id -> target_id (or "SKIP")
        self.last_killed_id: Optional[str] = None
        self.last_killed_role: Optional[str] = None
        self.doctor_saved: bool = False
        
        self.winner: Optional[str] = None
        self.history_log: List[str] = []

    def start(self) -> None:
        player_ids = list(self.players.keys())
        random.shuffle(player_ids)
        n = len(player_ids)

        # Distribute roles
        num_mafia = 1 if n <= 5 else (2 if n <= 8 else 3)
        for i, pid in enumerate(player_ids):
            if i < num_mafia:
                self.roles[pid] = self.ROLE_MAFIA
            elif i == num_mafia:
                self.roles[pid] = self.ROLE_DOCTOR
            elif i == num_mafia + 1:
                self.roles[pid] = self.ROLE_DETECTIVE
            else:
                self.roles[pid] = self.ROLE_VILLAGER

        self.phase = "ROLE_REVEAL"
        self.phase_timer = 12.0
        self.history_log.append("The game begins. Roles have been secretly assigned.")

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "ROLE_REVEAL":
            self.start_night()
            return self.phase
        elif self.phase == "NIGHT_ACTIONS":
            self.resolve_night()
            return self.phase
        elif self.phase == "DAY_DAWN":
            if self.check_win_condition():
                self.phase = "GAME_OVER"
                return self.phase
            self.phase = "DAY_DISCUSS"
            self.phase_timer = 45.0
            return self.phase
        elif self.phase == "DAY_DISCUSS":
            self.phase = "DAY_VOTE"
            self.phase_timer = 35.0
            self.day_votes.clear()
            return self.phase
        elif self.phase == "DAY_VOTE":
            self.resolve_day_vote()
            return self.phase
        elif self.phase == "DAY_EXECUTION":
            if self.check_win_condition():
                self.phase = "GAME_OVER"
                return self.phase
            self.start_night()
            return self.phase
        return None

    def start_night(self) -> None:
        self.phase = "NIGHT_ACTIONS"
        self.phase_timer = 30.0
        self.mafia_votes.clear()
        self.doctor_target = None
        self.detective_target = None
        self.detective_result = None
        self.history_log.append(f"Night {self.round_number} falls upon the village.")

    def check_night_complete(self) -> bool:
        alive_mafia = [pid for pid in self.alive_players if self.roles[pid] == self.ROLE_MAFIA]
        alive_doctor = [pid for pid in self.alive_players if self.roles[pid] == self.ROLE_DOCTOR]
        alive_detective = [pid for pid in self.alive_players if self.roles[pid] == self.ROLE_DETECTIVE]

        mafia_done = len(self.mafia_votes) == len(alive_mafia)
        doctor_done = (len(alive_doctor) == 0) or (self.doctor_target is not None)
        detective_done = (len(alive_detective) == 0) or (self.detective_target is not None)

        return mafia_done and doctor_done and detective_done

    def resolve_night(self) -> None:
        # Determine mafia target (most frequent vote)
        mafia_target = None
        if self.mafia_votes:
            counts: Dict[str, int] = {}
            for target in self.mafia_votes.values():
                counts[target] = counts.get(target, 0) + 1
            mafia_target = max(counts, key=counts.get)

        self.doctor_saved = False
        if mafia_target:
            if mafia_target == self.doctor_target:
                self.doctor_saved = True
                self.last_killed_id = None
                self.last_killed_role = None
                self.history_log.append("The Doctor intervened and saved the victim tonight!")
            else:
                self.alive_players.discard(mafia_target)
                self.last_killed_id = mafia_target
                self.last_killed_role = self.roles.get(mafia_target)
                victim_name = self.players[mafia_target].nickname
                self.history_log.append(f"{victim_name} was eliminated by the Mafia.")
        else:
            self.last_killed_id = None
            self.last_killed_role = None

        self.phase = "DAY_DAWN"
        self.phase_timer = 10.0

    def resolve_day_vote(self) -> None:
        tally: Dict[str, int] = {}
        for target in self.day_votes.values():
            if target != "SKIP":
                tally[target] = tally.get(target, 0) + 1

        eliminated_id = None
        if tally:
            top_target, top_votes = max(tally.items(), key=lambda item: item[1])
            # Strict majority of alive players voting
            if top_votes > len(self.alive_players) // 2:
                eliminated_id = top_target

        if eliminated_id:
            self.alive_players.discard(eliminated_id)
            self.last_killed_id = eliminated_id
            self.last_killed_role = self.roles.get(eliminated_id)
            name = self.players[eliminated_id].nickname
            self.history_log.append(f"Town executed {name} ({self.last_killed_role}).")
        else:
            self.last_killed_id = None
            self.last_killed_role = None
            self.history_log.append("Town could not reach a majority consensus. No one was executed.")

        self.phase = "DAY_EXECUTION"
        self.phase_timer = 8.0
        self.round_number += 1

    def check_win_condition(self) -> bool:
        alive_mafia = [pid for pid in self.alive_players if self.roles[pid] == self.ROLE_MAFIA]
        alive_town = [pid for pid in self.alive_players if self.roles[pid] != self.ROLE_MAFIA]

        if not alive_mafia:
            self.winner = "TOWN"
            self.is_over = True
            for pid in self.players:
                if self.roles[pid] != self.ROLE_MAFIA:
                    self.scores[pid] += 250
            return True
        elif len(alive_mafia) >= len(alive_town):
            self.winner = "MAFIA"
            self.is_over = True
            for pid in self.players:
                if self.roles[pid] == self.ROLE_MAFIA:
                    self.scores[pid] += 300
            return True
        return False

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if player_id not in self.alive_players and action != "PING":
            return {"error": "Eliminated players cannot take actions."}

        role = self.roles.get(player_id)

        if self.phase == "NIGHT_ACTIONS":
            target_id = data.get("target_id")

            if role == self.ROLE_MAFIA and action == "MAFIA_KILL":
                if target_id and target_id in self.alive_players and self.roles.get(target_id) != self.ROLE_MAFIA:
                    self.mafia_votes[player_id] = target_id
                    if self.check_night_complete():
                        self.resolve_night()
                    return {"broadcast": True}

            elif role == self.ROLE_DOCTOR and action == "DOCTOR_HEAL":
                if target_id and target_id in self.alive_players:
                    self.doctor_target = target_id
                    if self.check_night_complete():
                        self.resolve_night()
                    return {"broadcast": True}

            elif role == self.ROLE_DETECTIVE and action == "DETECTIVE_INVESTIGATE":
                if target_id and target_id in self.alive_players and target_id != player_id:
                    self.detective_target = target_id
                    target_role = self.roles.get(target_id)
                    alignment = "SUSPICIOUS (Mafia)" if target_role == self.ROLE_MAFIA else "INNOCENT (Town)"
                    self.detective_result = {
                        "target_id": target_id,
                        "target_name": self.players[target_id].nickname,
                        "alignment": alignment
                    }
                    if self.check_night_complete():
                        self.resolve_night()
                    return {"broadcast": True}

        elif self.phase == "DAY_VOTE" and action == "CAST_VOTE":
            target_id = data.get("target_id")
            if target_id == "SKIP" or (target_id in self.alive_players and target_id != player_id):
                self.day_votes[player_id] = target_id
                if len(self.day_votes) == len(self.alive_players):
                    self.resolve_day_vote()
                return {"broadcast": True}

        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        """Big Screen display projection. Never reveals secrets during active game!"""
        state = self.get_base_state()
        for p in state["players"]:
            pid = p["id"]
            p["is_alive"] = pid in self.alive_players
            p["role_revealed"] = self.roles.get(pid) if (self.phase == "GAME_OVER" or pid not in self.alive_players) else None

        state.update({
            "winner": self.winner,
            "last_killed_name": self.players[self.last_killed_id].nickname if self.last_killed_id else None,
            "last_killed_role": self.last_killed_role,
            "doctor_saved": self.doctor_saved,
            "history_log": self.history_log[-5:],
            "alive_count": len(self.alive_players),
            "votes_cast_count": len(self.day_votes) if self.phase == "DAY_VOTE" else None,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        """Strictly role-masked controller projection."""
        is_alive = player_id in self.alive_players
        role = self.roles.get(player_id, self.ROLE_VILLAGER)

        alive_candidates = [
            {"id": pid, "nickname": p.nickname, "avatar": p.avatar}
            for pid, p in self.players.items()
            if pid in self.alive_players and pid != player_id
        ]

        state: Dict[str, Any] = {
            "game_id": self.id,
            "phase": self.phase,
            "phase_timer": round(self.phase_timer, 1),
            "is_alive": is_alive,
            "my_role": role,
            "score": self.scores.get(player_id, 0),
        }

        # Mafia sees fellow mafia members and teammate votes
        if role == self.ROLE_MAFIA:
            state["mafia_teammates"] = [
                self.players[pid].nickname for pid, r in self.roles.items() if r == self.ROLE_MAFIA and pid != player_id
            ]
            state["mafia_votes"] = {
                self.players[voter].nickname: self.players[tgt].nickname
                for voter, tgt in self.mafia_votes.items()
                if tgt in self.players
            }

        if role == self.ROLE_DETECTIVE and self.detective_result:
            state["detective_result"] = self.detective_result

        if self.phase == "NIGHT_ACTIONS" and is_alive:
            if role == self.ROLE_MAFIA:
                state["night_action"] = "MAFIA_KILL"
                state["candidates"] = [c for c in alive_candidates if self.roles.get(c["id"]) != self.ROLE_MAFIA]
                state["my_vote"] = self.mafia_votes.get(player_id)
            elif role == self.ROLE_DOCTOR:
                state["night_action"] = "DOCTOR_HEAL"
                all_alive = [{"id": pid, "nickname": p.nickname, "avatar": p.avatar} for pid, p in self.players.items() if pid in self.alive_players]
                state["candidates"] = all_alive
                state["my_heal"] = self.doctor_target
            elif role == self.ROLE_DETECTIVE:
                state["night_action"] = "DETECTIVE_INVESTIGATE"
                state["candidates"] = alive_candidates
            else:
                state["night_action"] = "SLEEP"


        elif self.phase == "DAY_VOTE" and is_alive:
            state["candidates"] = alive_candidates
            state["my_vote"] = self.day_votes.get(player_id)

        return state
