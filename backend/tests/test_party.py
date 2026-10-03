"""Comprehensive automated tests for Sanfun Couch Co-Op & Party Games Platform."""
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import math
import pytest
import asyncio
from fastapi.testclient import TestClient
from app.main import app, get_real_client_ip
from app.party.manager import room_manager, PartyRoom
from app.party.protocol import PlayerInfo, ServerMessageType
from app.party.network import get_network_info
from app.party.games import create_game, get_available_games
from app.party.games.mafia import MafiaGame
from app.party.games.imposter import ImposterGame
from app.party.games.dialed import DialedGame, calculate_color_score, calculate_pitch_score
from app.party.games.fermi import FermiGame, score_fermi_guess
from app.party.games.auction import AuctionGame
from app.party.games.circle import CircleGame, evaluate_circle_points
from app.party.games.trolley import TrolleyGame
from app.party.games.trends import TrendsGame

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


def test_real_client_ip_extraction():
    class MockClient:
        host = "127.0.0.1"

    class MockRequest:
        client = MockClient()
        headers = {"CF-Connecting-IP": "203.0.113.195"}

    ip = get_real_client_ip(MockRequest())
    assert ip == "203.0.113.195"

    # Non-localhost should NOT trust CF header (prevents spoofing on LAN)
    MockRequest.client.host = "192.168.1.50"
    ip_lan = get_real_client_ip(MockRequest())
    assert ip_lan == "192.168.1.50"


def test_rest_endpoints():
    res = client.get("/api/party/host-info")
    assert res.status_code == 200
    data = res.json()
    assert "primary_ip" in data

    res = client.get("/api/party/games")
    assert res.status_code == 200
    games = res.json()
    assert len(games) == 8
    game_ids = [g["id"] for g in games]
    expected_ids = ["mafia", "imposter", "dialed", "fermi", "auction", "circle", "trolley", "trends"]
    for gid in expected_ids:
        assert gid in game_ids

    # Instantiation check for all 8 games
    for g in games:
        inst = create_game(g["id"], "ABCD", {"p1": PlayerInfo(id="p1", nickname="A")})
        assert inst.room_code == "ABCD"

    # Create room returns room_code and host_token
    create_res = client.post("/api/party/create")
    assert create_res.status_code == 200
    created = create_res.json()
    code = created["room_code"]
    assert len(code) == 4
    assert "host_token" in created
    assert len(created["host_token"]) > 10

    room_res = client.get(f"/api/party/room/{code}")
    assert room_res.status_code == 200
    room_data = room_res.json()
    assert room_data["room_code"] == code
    assert room_data["state"] == "LOBBY"


def test_room_lifecycle_and_reconnection():
    room = room_manager.create_room()
    code = room.code
    assert len(code) == 4
    assert len(room.host_token) > 10

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


def test_mafia_strict_plurality_and_role_masking():
    players = {f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}") for i in range(5)}
    mafia_game = MafiaGame("TEST", players)
    mafia_game.start()

    mafia_pids = [pid for pid in mafia_game.roles if mafia_game.roles[pid] == MafiaGame.ROLE_MAFIA]
    villager_pids = [pid for pid in mafia_game.roles if mafia_game.roles[pid] == MafiaGame.ROLE_VILLAGER]

    # Host state must never reveal active roles
    host_state = mafia_game.get_host_state()
    for p in host_state["players"]:
        assert p["role_revealed"] is None

    # Villager must not see mafia teammates
    v_state = mafia_game.get_player_state(villager_pids[0])
    assert "mafia_teammates" not in v_state

    # Mafia must see teammates
    m_state = mafia_game.get_player_state(mafia_pids[0])
    assert "mafia_teammates" in m_state

    # Test strict plurality tie resolution in DAY_VOTE
    mafia_game.phase = "DAY_VOTE"
    mafia_game.alive_players = {"p0", "p1", "p2", "p3", "p4"}
    mafia_game.day_votes = {"p0": "p1", "p2": "p1", "p3": "p4", "p4": "p4"}
    # p1 has 2 votes, p4 has 2 votes -> TIE!
    mafia_game.resolve_day_vote()
    assert mafia_game.last_killed_id is None
    assert "could not reach" in mafia_game.history_log[-1]


def test_imposter_disconnect_and_role_masking():
    players = {f"p{i}": PlayerInfo(id=f"p{i}", nickname=f"Player_{i}") for i in range(4)}
    game = ImposterGame("TEST", players)
    game.start()

    imp_id = game.imposter_ids[0]
    crew_ids = [pid for pid in players if pid != imp_id]

    imp_state = game.get_player_state(imp_id)
    assert imp_state["is_imposter"] is True
    assert imp_state["secret_word"] == "???"

    crew_state = game.get_player_state(crew_ids[0])
    assert crew_state["is_imposter"] is False
    assert crew_state["secret_word"] == game.secret_word

    # Disconnecting sole imposter ends game with CREW win
    game.phase = "CLUE_ROUNDS"
    game.on_player_disconnect(imp_id)
    assert game.is_over is True
    assert game.winner == "CREW"


def test_dialed_cone_distance_and_pitch_guard():
    # 1. Hue 2 deg and 358 deg should be close in 3D cone distance, scoring near 100%
    target = {"h": 2.0, "s": 0.9, "v": 1.0}
    close_guess = {"h": 358.0, "s": 0.9, "v": 1.0}
    score = calculate_color_score(target, close_guess)
    assert score > 90.0

    # Opposite hue (180 deg away) should score low
    far_guess = {"h": 182.0, "s": 0.9, "v": 1.0}
    far_score = calculate_color_score(target, far_guess)
    assert far_score < score

    # 2. Pitch guard on negative or zero frequency
    assert calculate_pitch_score(440.0, 0.0) == 0.0
    assert calculate_pitch_score(440.0, -100.0) == 0.0
    # Exact pitch should score 100.0
    assert calculate_pitch_score(440.0, 440.0) == 100.0


def test_fermi_zero_division_guard_and_log_scoring():
    # 0 guess must not crash with ZeroDivisionError
    pts_zero, d_zero = score_fermi_guess(0, 1000000)
    assert pts_zero == 0
    assert d_zero > 5.0

    # Negative guess
    pts_neg, _ = score_fermi_guess(-500, 1000)
    assert pts_neg == 0

    # Exact guess gives full 1000 points
    pts_exact, d_exact = score_fermi_guess(1000, 1000)
    assert pts_exact == 1000
    assert d_exact == 0.0

    # Within 1 order of magnitude (e.g. 5000 vs 10000)
    pts_close, d_close = score_fermi_guess(5000, 10000)
    assert pts_close > 850
    assert d_close < 0.5


def test_auction_house_hammer_and_rules():
    players = {"p0": PlayerInfo(id="p0", nickname="P0"), "p1": PlayerInfo(id="p1", nickname="P1")}
    game = AuctionGame("TEST", players)
    game.start()

    actual = game.current_item["hammer_price"]
    game.phase = "BIDDING"

    # p0 bids 80% of hammer price (under), p1 bids 110% (over)
    game.handle_action("p0", "SUBMIT_BID", {"bid": int(actual * 0.8)})
    game.handle_action("p1", "SUBMIT_BID", {"bid": int(actual * 1.1)})

    assert game.phase == "HAMMER"
    assert game.round_results["p0"]["won_lot"] is True
    assert game.round_results["p0"]["went_over"] is False
    assert game.round_results["p1"]["went_over"] is True
    assert game.scores["p0"] > game.scores["p1"]


def test_circle_geometry_eval_and_bin_check():
    # 1. Under 30 points rejected
    score_few, res_few = evaluate_circle_points([[10, 10], [20, 20]])
    assert score_few == 0.0
    assert "minimum 30" in res_few["reason"]

    # 2. Perfect mathematical circle with 60 points
    cx, cy, r = 200.0, 200.0, 100.0
    circle_pts = []
    for i in range(60):
        th = 2.0 * 3.14159265 * (i / 60.0)
        circle_pts.append([cx + r * 1.0 * (1.0 if i < 60 else 0) * 0 + cx + r * 0, cy])
    # Let's generate a genuine circle
    circle_pts = [
        [cx + r * 1.0 * (1.0) * math.cos(2.0 * math.pi * i / 60.0),
         cy + r * 1.0 * math.sin(2.0 * math.pi * i / 60.0)]
        for i in range(60)
    ]
    # Add final point closing the circle
    circle_pts.append(circle_pts[0])

    score_perf, res_perf = evaluate_circle_points(circle_pts)
    assert score_perf > 90.0
    assert res_perf["angular_coverage_pct"] >= 95.0

    # 3. Short 15-degree arc (should be heavily penalized for low angular coverage)
    arc_pts = [
        [cx + r * math.cos(math.radians(i * 0.5)), cy + r * math.sin(math.radians(i * 0.5))]
        for i in range(35)
    ]
    score_arc, res_arc = evaluate_circle_points(arc_pts)
    assert score_arc < 5.0  # C^3 penalty kills short arc score


def test_trolley_choices_and_consensus():
    players = {
        "p0": PlayerInfo(id="p0", nickname="P0"),
        "p1": PlayerInfo(id="p1", nickname="P1"),
        "p2": PlayerInfo(id="p2", nickname="P2"),
    }
    game = TrolleyGame("TEST", players)
    game.start()

    # p0 and p1 pick A (bet majority=True), p2 picks B (bet majority=True)
    game.handle_action("p0", "SUBMIT_CHOICE", {"choice": "A", "bet_majority": True})
    game.handle_action("p1", "SUBMIT_CHOICE", {"choice": "A", "bet_majority": True})
    game.handle_action("p2", "SUBMIT_CHOICE", {"choice": "B", "bet_majority": True})

    assert game.phase == "REVEAL"
    assert game.majority_choice == "A"
    assert game.round_results["p0"]["predicted_correctly"] is True
    assert game.round_results["p1"]["predicted_correctly"] is True
    assert game.round_results["p2"]["predicted_correctly"] is False
    assert game.scores["p0"] > game.scores["p2"]


def test_trends_higher_lower_and_streaks():
    players = {"p0": PlayerInfo(id="p0", nickname="P0"), "p1": PlayerInfo(id="p1", nickname="P1")}
    game = TrendsGame("TEST", players)
    game.start()

    correct_rel = game.current_matchup["relation"]
    wrong_rel = "LOWER" if correct_rel == "HIGHER" else "HIGHER"

    game.handle_action("p0", "SUBMIT_GUESS", {"guess": correct_rel})
    game.handle_action("p1", "SUBMIT_GUESS", {"guess": wrong_rel})

    assert game.phase == "REVEAL"
    assert game.round_results["p0"]["is_correct"] is True
    assert game.streaks["p0"] == 1
    assert game.scores["p0"] > 0

    assert game.round_results["p1"]["is_correct"] is False
    assert game.streaks["p1"] == 0
    assert game.scores["p1"] == 0


@pytest.mark.asyncio
async def test_concurrent_broadcast_resilient_to_slow_client():
    room = room_manager.create_room()
    p1, _ = room.add_player("Fast")
    p2, _ = room.add_player("Slow")

    captured = []

    class FastWS:
        async def send_json(self, msg):
            captured.append("fast")

    class SlowWS:
        async def send_json(self, msg):
            await asyncio.sleep(0.01)
            captured.append("slow")

    room.player_sockets[p1.id] = FastWS()
    room.player_sockets[p2.id] = SlowWS()

    await room.broadcast_all(ServerMessageType.TIMER_TICK, {"phase_timer": 5.0})
    assert "fast" in captured
    assert "slow" in captured


def test_spa_api_404_protection():
    res = client.get("/api/party/nonexistent-endpoint-123")
    assert res.status_code == 404
    assert "detail" in res.json()


def test_dialed_game_round_flow():
    players = {"p0": PlayerInfo(id="p0", nickname="P0"), "p1": PlayerInfo(id="p1", nickname="P1")}
    game = DialedGame("TEST", players)
    game.start()
    assert game.phase == "INSPECT"
    # Transition to DIAL
    next_phase = game.on_timer_expired()
    assert next_phase == "DIAL"

    # Players submit dials
    game.handle_action("p0", "SUBMIT_DIAL", {"h": 180, "s": 0.9, "v": 1.0})
    game.handle_action("p1", "SUBMIT_DIAL", {"h": 200, "s": 0.8, "v": 1.0})
    assert game.phase == "REVEAL"
    assert "p0" in game.round_results
    assert "p1" in game.round_results


def test_circle_game_action_flow():
    players = {"p0": PlayerInfo(id="p0", nickname="P0"), "p1": PlayerInfo(id="p1", nickname="P1")}
    game = CircleGame("TEST", players)
    game.start()
    assert game.phase == "DRAWING"

    # Perfect circle points
    circle_pts = [
        [200.0 + 80.0 * math.cos(2.0 * math.pi * i / 40.0),
         200.0 + 80.0 * math.sin(2.0 * math.pi * i / 40.0)]
        for i in range(40)
    ]
    circle_pts.append(circle_pts[0])

    game.handle_action("p0", "SUBMIT_CIRCLE", {"points": circle_pts})
    game.handle_action("p1", "SUBMIT_CIRCLE", {"points": circle_pts})
    assert game.phase == "SHOWCASE"
    assert game.player_evals["p0"]["score_pct"] > 80.0


def test_fermi_game_action_flow():
    players = {"p0": PlayerInfo(id="p0", nickname="P0"), "p1": PlayerInfo(id="p1", nickname="P1")}
    game = FermiGame("TEST", players)
    game.start()
    assert game.phase == "QUESTION"

    # Guess close to actual
    actual = game.current_q["actual"]
    game.handle_action("p0", "SUBMIT_GUESS", {"guess": actual})
    game.handle_action("p1", "SUBMIT_GUESS", {"guess": actual * 1.5})
    assert game.phase == "REVEAL"
    assert game.scores["p0"] == 1000
    assert game.scores["p1"] > 0


def test_host_websocket_authentication():
    room = room_manager.create_room()
    code = room.code

    # Connect with wrong host token -> receives ERROR and is closed
    with client.websocket_connect(f"/api/party/ws/{code}?role=host&host_token=wrong_token") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "ERROR"
        assert "Unauthorized" in msg["payload"]["message"]

    # Connect with correct host token -> succeeds
    with client.websocket_connect(f"/api/party/ws/{code}?role=host&host_token={room.host_token}") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "ROOM_STATE"


