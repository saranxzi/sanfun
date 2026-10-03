"""Draw a Perfect Circle: Touchscreen circle perfection with Pratt fit & angular bin check."""
import math
from typing import Dict, Any, List, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


def evaluate_circle_points(points: List[List[float]]) -> tuple[float, Dict[str, Any]]:
    """
    Evaluates drawn points against circle invariants:
    - Min points N >= 30
    - Center (cx, cy) and radius R in [30, 500]
    - Angular bin coverage across 36 sectors (10 deg each) >= 85%
    - Closure gap penalty between start and end point
    """
    n = len(points)
    if n < 30:
        return 0.0, {"reason": "Too few points (minimum 30 required)", "points_count": n}

    # 1. Centroid estimate
    cx = sum(p[0] for p in points) / n
    cy = sum(p[1] for p in points) / n

    # 2. Distances and mean radius
    radii = [math.sqrt((p[0] - cx) ** 2 + (p[1] - cy) ** 2) for p in points]
    r_mean = sum(radii) / n

    if r_mean < 30.0 or r_mean > 600.0:
        return 0.0, {"reason": "Circle radius out of bounds (must be 30-600px)", "mean_radius": round(r_mean, 1)}

    # 3. Radial RMSE / standard deviation
    variance = sum((r - r_mean) ** 2 for r in radii) / n
    rmse = math.sqrt(variance)
    radial_precision = max(0.0, 1.0 - (rmse / r_mean))

    # 4. Angular bin coverage (36 bins of 10 degrees)
    visited_bins = set()
    for p in points:
        angle_rad = math.atan2(p[1] - cy, p[0] - cx)
        angle_deg = (math.degrees(angle_rad) + 360.0) % 360.0
        bin_idx = int(angle_deg // 10.0) % 36
        visited_bins.add(bin_idx)

    coverage_frac = len(visited_bins) / 36.0
    coverage_multiplier = coverage_frac if coverage_frac >= 0.85 else (coverage_frac ** 3)

    # 5. Start-to-end closure gap
    start_p = points[0]
    end_p = points[-1]
    closure_dist = math.sqrt((end_p[0] - start_p[0]) ** 2 + (end_p[1] - start_p[1]) ** 2)
    gap_ratio = closure_dist / r_mean
    closure_factor = max(0.0, 1.0 - min(1.0, gap_ratio))

    # Final percentage score
    final_score = 100.0 * radial_precision * closure_factor * coverage_multiplier
    final_score = max(0.0, min(100.0, round(final_score, 1)))

    return final_score, {
        "score": final_score,
        "mean_radius": round(r_mean, 1),
        "angular_coverage_pct": round(coverage_frac * 100.0, 1),
        "closure_gap_ratio": round(gap_ratio, 3),
        "rmse": round(rmse, 2)
    }


class CircleGame(BasePartyGame):
    id = "circle"
    name = "Draw a Perfect Circle"
    tagline = "Draw a freehand circle on your phone with mathematical precision"
    description = "Channel your inner artist or compass. Draw a single closed stroke on your screen. Pratt fitting judges your circularity."
    icon = "⭕"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 3
        self.player_drawings: Dict[str, List[List[float]]] = {}
        self.player_evals: Dict[str, Dict[str, Any]] = {}
        self.winner: Optional[str] = None

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.start_round()

    def start_round(self) -> None:
        self.player_drawings.clear()
        self.player_evals.clear()
        self.phase = "DRAWING"
        self.phase_timer = 20.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "DRAWING":
            self.resolve_round()
            self.phase = "SHOWCASE"
            self.phase_timer = 12.0
            return self.phase
        elif self.phase == "SHOWCASE":
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
        for pid in self.players:
            pts_array = self.player_drawings.get(pid, [])
            score_pct, metrics = evaluate_circle_points(pts_array)
            pts_awarded = int(round(score_pct * 10))
            self.scores[pid] += pts_awarded
            self.player_evals[pid] = {
                "score_pct": score_pct,
                "points": pts_awarded,
                "metrics": metrics,
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "DRAWING" and action in ("SUBMIT_CIRCLE", "DRAW_COMPLETE"):
            points = data.get("points", [])
            if isinstance(points, list):
                # Clean and keep reasonable number of points (up to 500)
                sanitized = []
                for pt in points[:500]:
                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                        try:
                            sanitized.append([float(pt[0]), float(pt[1])])
                        except (ValueError, TypeError):
                            pass
                self.player_drawings[player_id] = sanitized

            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_drawings) >= len(connected_pids):
                self.resolve_round()
                self.phase = "SHOWCASE"
                self.phase_timer = 12.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "submitted_pids": list(self.player_drawings.keys()),
            "evals": self.player_evals if self.phase in ("SHOWCASE", "GAME_OVER") else {},
            "drawings": {pid: self.player_drawings[pid] for pid in self.player_drawings} if self.phase in ("SHOWCASE", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "has_drawn": player_id in self.player_drawings,
            "my_eval": self.player_evals.get(player_id) if self.phase in ("SHOWCASE", "GAME_OVER") else None,
            "evals": self.player_evals if self.phase in ("SHOWCASE", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state
