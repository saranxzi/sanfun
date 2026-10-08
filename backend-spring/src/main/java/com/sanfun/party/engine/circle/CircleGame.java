package com.sanfun.party.engine.circle;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class CircleGame extends BasePartyGame {
    public static final String GAME_ID = "circle";
    public static final String GAME_NAME = "Draw a Perfect Circle";
    public static final String GAME_TAGLINE = "Draw a freehand circle on your phone with mathematical precision";
    public static final String GAME_DESCRIPTION = "Channel your inner artist or compass. Draw a single closed stroke on your screen. Pratt fitting judges your circularity.";
    public static final String GAME_ICON = "⭕";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    private final Map<String, List<List<Double>>> playerDrawings = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> playerEvals = new ConcurrentHashMap<>();
    private volatile String winner = null;

    public CircleGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 3;
    }

    public static Map<String, Object> evaluateCirclePoints(List<List<Double>> points) {
        if (points == null || points.size() < 30) {
            return Map.of("score", 0.0, "reason", "Too few points (minimum 30 required)", "points_count", points != null ? points.size() : 0);
        }

        int n = points.size();
        double sumX = 0.0;
        double sumY = 0.0;
        for (List<Double> p : points) {
            sumX += p.get(0);
            sumY += p.get(1);
        }
        double cx = sumX / n;
        double cy = sumY / n;

        double sumR = 0.0;
        double[] radii = new double[n];
        for (int i = 0; i < n; i++) {
            List<Double> p = points.get(i);
            double dist = Math.sqrt(Math.pow(p.get(0) - cx, 2) + Math.pow(p.get(1) - cy, 2));
            radii[i] = dist;
            sumR += dist;
        }
        double rMean = sumR / n;

        if (rMean < 30.0 || rMean > 600.0) {
            return Map.of("score", 0.0, "reason", "Circle radius out of bounds (must be 30-600px)", "mean_radius", Math.round(rMean * 10.0) / 10.0);
        }

        double sumVar = 0.0;
        for (double r : radii) {
            sumVar += Math.pow(r - rMean, 2);
        }
        double rmse = Math.sqrt(sumVar / n);
        double radialPrecision = Math.max(0.0, 1.0 - (rmse / rMean));

        Set<Integer> visitedBins = new HashSet<>();
        for (List<Double> p : points) {
            double angleRad = Math.atan2(p.get(1) - cy, p.get(0) - cx);
            double angleDeg = (Math.toDegrees(angleRad) + 360.0) % 360.0;
            int binIdx = ((int) (angleDeg / 10.0)) % 36;
            visitedBins.add(binIdx);
        }

        double coverageFrac = visitedBins.size() / 36.0;
        if (coverageFrac < 0.80) {
            return Map.of(
                    "score", 0.0,
                    "reason", "Circle incomplete (must draw a full 360° closed loop)",
                    "angular_coverage_pct", Math.round(coverageFrac * 1000.0) / 10.0,
                    "visited_bins", visitedBins.size()
            );
        }

        List<Double> startP = points.get(0);
        List<Double> endP = points.get(n - 1);
        double closureDist = Math.sqrt(Math.pow(endP.get(0) - startP.get(0), 2) + Math.pow(endP.get(1) - startP.get(1), 2));
        double gapRatio = closureDist / rMean;

        if (gapRatio > 0.45) {
            return Map.of(
                    "score", 0.0,
                    "reason", "Loop not closed (start and end points did not meet)",
                    "closure_gap_ratio", Math.round(gapRatio * 1000.0) / 1000.0
            );
        }

        double closureFactor = Math.max(0.0, 1.0 - (gapRatio * 1.5));
        double finalScore = 100.0 * radialPrecision * closureFactor * Math.pow(coverageFrac, 2);
        finalScore = Math.max(0.0, Math.min(100.0, Math.round(finalScore * 10.0) / 10.0));

        return Map.of(
                "score", finalScore,
                "mean_radius", Math.round(rMean * 10.0) / 10.0,
                "angular_coverage_pct", Math.round(coverageFrac * 1000.0) / 10.0,
                "closure_gap_ratio", Math.round(gapRatio * 1000.0) / 1000.0,
                "rmse", Math.round(rmse * 100.0) / 100.0
        );
    }

    @Override
    public synchronized void start() {
        roundNumber = 1;
        isOver = false;
        startRound();
    }

    private void startRound() {
        playerDrawings.clear();
        playerEvals.clear();
        phase = "DRAWING";
        phaseTimer = 20.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "DRAWING" -> {
                resolveRound();
                phase = "SHOWCASE";
                phaseTimer = 12.0;
                return phase;
            }
            case "SHOWCASE" -> {
                if (roundNumber >= maxRounds) {
                    phase = "GAME_OVER";
                    isOver = true;
                    scores.entrySet().stream()
                            .max(Map.Entry.comparingByValue())
                            .ifPresent(top -> {
                                PlayerInfo p = players.get(top.getKey());
                                if (p != null) winner = p.getNickname();
                            });
                    return phase;
                } else {
                    roundNumber++;
                    startRound();
                    return phase;
                }
            }
            default -> {
                return null;
            }
        }
    }

    private void resolveRound() {
        for (String pid : players.keySet()) {
            List<List<Double>> pts = playerDrawings.getOrDefault(pid, Collections.emptyList());
            Map<String, Object> metrics = evaluateCirclePoints(pts);
            double scorePct = (Double) metrics.get("score");
            int ptsAwarded = (int) Math.round(scorePct * 10.0);

            scores.put(pid, scores.getOrDefault(pid, 0) + ptsAwarded);
            playerEvals.put(pid, Map.of(
                    "score_pct", scorePct,
                    "points", ptsAwarded,
                    "metrics", metrics
            ));
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("DRAWING".equals(phase) && ("SUBMIT_CIRCLE".equals(action) || "DRAW_COMPLETE".equals(action))) {
            Object rawPoints = data.get("points");
            List<List<Double>> sanitized = new ArrayList<>();
            if (rawPoints instanceof List<?> list) {
                for (int i = 0; i < Math.min(500, list.size()); i++) {
                    Object item = list.get(i);
                    if (item instanceof List<?> coordList && coordList.size() >= 2) {
                        try {
                            double x = ((Number) coordList.get(0)).doubleValue();
                            double y = ((Number) coordList.get(1)).doubleValue();
                            sanitized.add(List.of(x, y));
                        } catch (Exception ignored) {}
                    }
                }
            }
            playerDrawings.put(playerId, sanitized);

            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerDrawings.size() >= connectedCount) {
                resolveRound();
                phase = "SHOWCASE";
                phaseTimer = 12.0;
            }
            return Map.of("broadcast", true);
        }
        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        boolean isShowcase = "SHOWCASE".equals(phase) || isOver;

        state.put("submitted_pids", new ArrayList<>(playerDrawings.keySet()));
        state.put("evals", isShowcase ? playerEvals : Collections.emptyMap());
        state.put("drawings", isShowcase ? playerDrawings : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isShowcase = "SHOWCASE".equals(phase) || isOver;

        state.put("has_drawn", playerDrawings.containsKey(playerId));
        state.put("my_eval", isShowcase ? playerEvals.get(playerId) : null);
        state.put("evals", isShowcase ? playerEvals : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }
}
