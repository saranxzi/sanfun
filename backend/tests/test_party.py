"""Comprehensive automated tests for Sanfun Couch Co-Op & Party Games Platform."""
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.party.manager import room_manager, PartyRoom
from app.party.protocol import PlayerInfo
from app.party.network import get_local_ip, get_network_info
from app.party.games.mafia import MafiaGame
from app.party.games.imposter import ImposterGame
from app.party.games.witclash import WitClashGame
from app.party.games.trivia import TriviaGame
from app.party.games.doodledash import DoodleDashGame

client = TestClient(app)


def test_network_info():
    info = get_network_info()
    assert "primary_ip" in info
    assert "port" in info
    assert "local_url" in info
    assert info["port"] == 8000


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_rest_endpoints():
    res = client.get("/api/party/host-info")
    assert res.status_code == 200
    data = res.json()
    assert "primary_ip" in data

    res = client.get("/api/party/games")
    assert res.status_code == 200
    games = res.json()
    assert len(games) >= 5
    game_ids = [g["id"] for g in games]
    assert "mafia" in game_ids
    assert "imposter" in game_ids
    assert "witclash" in game_ids
    assert "trivia" in game_ids
    assert "doodledash" in game_ids

    create_res = client.post("/api/party/create")
    assert create_res.status_code == 200
    created = create_res.json()
    code = created["room_code"]
    assert len(code) == 4

    room_res = client.get(f"/api/party/room/{code}")
    assert room_res.status_code == 200
    room_data = room_res.json()
    assert room_data["room_code"] == code
    assert room_data["state"] == "LOBBY"


def test_room_lifecycle_and_reconnection():
    room = room_manager.create_room()
    code = room.code
    assert len(code) == 4

    # Add players
    p1, token1 = room.add_player("Alice", "🦊", "#ff0055")
    p2, token2 = room.add_player("Bob", "🐼", "#00f0ff")

    assert len(room.players) == 2
    assert p1.nickname == "Alice"
    assert p2.nickname == "Bob"

    # Reconnection
    reconnected = room.reconnect_player(token1)
    assert reconnected is not None
    assert reconnected.id == p1.id
    assert reconnected.is_connected is True

    # Bad token reconnect
    bad_reconnect = room.reconnect_player("invalid_token_123")
    assert bad_reconnect is None


def test_mafia_role_masking_security():
    """Verify strict role masking: Villagers never receive Mafia member array."""
    players = {
        f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}")
        for i in range(5)
    }
    mafia_game = MafiaGame("TEST", players)
    mafia_game.start()

    # Find who is mafia and who is villager
    mafia_pids = [pid for pid, r in mafia_game.roles.items() if r == MafiaGame.ROLE_MAFIA]
    villager_pids = [pid for pid, r in mafia_game.roles.items() if r == MafiaGame.ROLE_VILLAGER]
    doctor_pids = [pid for pid, r in mafia_game.roles.items() if r == MafiaGame.ROLE_DOCTOR]
    detective_pids = [pid for pid, r in mafia_game.roles.items() if r == MafiaGame.ROLE_DETECTIVE]

    assert len(mafia_pids) >= 1
    assert len(villager_pids) >= 1

    # Check Host state does NOT reveal roles during active game
    host_state = mafia_game.get_host_state()
    for p in host_state["players"]:
        assert p["role_revealed"] is None

    # Check Villager state does NOT contain mafia_teammates
    v_state = mafia_game.get_player_state(villager_pids[0])
    assert "mafia_teammates" not in v_state
    assert v_state["my_role"] == MafiaGame.ROLE_VILLAGER

    # Check Mafia state DOES contain mafia_teammates
    m_state = mafia_game.get_player_state(mafia_pids[0])
    assert "mafia_teammates" in m_state


def test_mafia_night_action_resolution():
    players = {
        f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}")
        for i in range(4)
    }
    game = MafiaGame("TEST", players)
    # Manually configure roles for deterministic test
    game.roles = {
        "p0": MafiaGame.ROLE_MAFIA,
        "p1": MafiaGame.ROLE_DOCTOR,
        "p2": MafiaGame.ROLE_DETECTIVE,
        "p3": MafiaGame.ROLE_VILLAGER,
    }
    game.alive_players = {"p0", "p1", "p2", "p3"}
    game.start_night()

    # Case 1: Doctor heals the target that Mafia attacks -> Victim saved!
    game.handle_action("p0", "MAFIA_KILL", {"target_id": "p3"})
    game.handle_action("p1", "DOCTOR_HEAL", {"target_id": "p3"})
    game.handle_action("p2", "DETECTIVE_INVESTIGATE", {"target_id": "p0"})

    # Detective gets result
    det_state = game.get_player_state("p2")
    assert det_state["detective_result"]["alignment"] == "SUSPICIOUS (Mafia)"

    assert game.phase == "DAY_DAWN"
    assert game.doctor_saved is True
    assert "p3" in game.alive_players


def test_imposter_role_masking_and_guessing():
    players = {
        f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}")
        for i in range(4)
    }
    game = ImposterGame("TEST", players)
    game.start()

    imposter_id = game.imposter_ids[0]
    crew_ids = [pid for pid in players if pid != imposter_id]

    # Check Imposter private state
    imp_state = game.get_player_state(imposter_id)
    assert imp_state["is_imposter"] is True
    assert imp_state["secret_word"] == "???"

    # Check Crew private state
    crew_state = game.get_player_state(crew_ids[0])
    assert crew_state["is_imposter"] is False
    assert crew_state["secret_word"] == game.secret_word

    # Test imposter guess resolution
    game.phase = "IMPOSTER_GUESS"
    game.handle_action(imposter_id, "GUESS_WORD", {"guess": game.secret_word})
    assert game.is_over is True
    assert game.winner == "IMPOSTER"
    assert game.imposter_guess_correct is True


def test_witclash_matchups_and_voting():
    players = {
        f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}")
        for i in range(3)
    }
    game = WitClashGame("TEST", players)
    game.start()
    assert game.phase == "PROMPT_INPUT"
    assert len(game.prompts) == 3

    # Submit answers
    for p in game.prompts:
        game.handle_action(p["p1_id"], "SUBMIT_ANSWER", {"prompt_id": p["id"], "answer": "Hilarious joke"})
        game.handle_action(p["p2_id"], "SUBMIT_ANSWER", {"prompt_id": p["id"], "answer": "Even funnier joke"})

    # Transitions to showdown
    assert game.phase == "SHOWDOWN_VOTE"
    m = game.prompts[game.matchup_index]
    eligible_voters = [pid for pid in players if pid not in (m["p1_id"], m["p2_id"])]
    assert len(eligible_voters) == 1

    # Cast vote
    game.handle_action(eligible_voters[0], "CAST_VOTE", {"choice": 1})
    assert game.phase == "SHOWDOWN_REVEAL"


def test_trivia_scoring_and_streaks():
    players = {
        "p0": PlayerInfo(id="p0", nickname="P0"),
        "p1": PlayerInfo(id="p1", nickname="P1"),
    }
    game = TriviaGame("TEST", players)
    game.start()

    q = game.questions[game.current_idx]
    correct = q["correct"]
    wrong = (correct + 1) % 4

    game.handle_action("p0", "SUBMIT_ANSWER", {"choice": correct})
    game.handle_action("p1", "SUBMIT_ANSWER", {"choice": wrong})

    assert game.phase == "REVEAL"
    assert game.scores["p0"] > 0
    assert game.scores["p1"] == 0
    assert game.streaks["p0"] == 1
    assert game.streaks["p1"] == 0


def test_doodledash_guess_matching():
    players = {
        "p0": PlayerInfo(id="p0", nickname="Drawer"),
        "p1": PlayerInfo(id="p1", nickname="Guesser"),
    }
    game = DoodleDashGame("TEST", players)
    game.start()
    game.drawer_order = ["p0", "p1"]
    game.current_drawer_idx = 0

    # Stroke drawing
    res = game.handle_action("p0", "DRAW_STROKE", {"stroke": {"points": [[10, 10], [20, 20]], "color": "#ff0000"}})
    assert res.get("broadcast") is True

    # Exact guess
    word = game.secret_word
    guess_res = game.handle_action("p1", "SUBMIT_GUESS", {"guess": word})
    assert guess_res.get("broadcast") is True
    assert "p1" in game.correct_guessers


@pytest.mark.asyncio
async def test_broadcast_game_state_includes_player_identity():
    """Verify that broadcast_game_state explicitly includes player identity so controllers never get kicked to join screen."""
    room = room_manager.create_room()
    p1, _ = room.add_player("Hero", "🦊", "#00f0ff")
    
    # Start Trivia with 1 player
    room.selected_game_id = "trivia"
    started = await room.start_game()
    assert started is True
    assert room.state == "IN_GAME"

    # Mock a fake websocket to capture broadcast message
    captured = []
    class FakeWS:
        async def send_json(self, msg):
            captured.append(msg)

    fake_ws = FakeWS()
    room.player_sockets[p1.id] = fake_ws

    await room.broadcast_game_state()

    assert len(captured) == 1
    msg = captured[0]
    assert msg["type"] == "PLAYER_STATE"
    payload = msg["payload"]
    assert payload["player_id"] == p1.id
    assert payload["nickname"] == "Hero"
    assert payload["avatar"] == "🦊"
    assert payload["color"] == "#00f0ff"
    assert payload["room_code"] == room.code
    assert payload["state"] == "IN_GAME"


def test_register_tunnel_endpoint():
    res = client.post("/api/party/tunnel", json={"tunnel_url": "https://cool-tunnel.trycloudflare.com"})
    assert res.status_code == 200
    assert res.json()["tunnel_url"] == "https://cool-tunnel.trycloudflare.com"

    # Verify get_network_info now includes this tunnel
    info = get_network_info()
    assert info["tunnel_url"] == "https://cool-tunnel.trycloudflare.com"

