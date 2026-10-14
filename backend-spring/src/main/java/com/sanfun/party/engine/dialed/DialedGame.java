package com.sanfun.party.engine.dialed;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class DialedGame extends BasePartyGame {
    public static final String GAME_ID = "dialed";
    public static final String GAME_NAME = "Dialed";
    public static final String GAME_TAGLINE = "Test your visual memory with pure color matching";
    public static final String GAME_DESCRIPTION = "Inspect the secret target color, then recreate its exact Hue, Contrast, and Brightness on your phone.";
    public static final String GAME_ICON = "🎨";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record TargetColor(String name, double h, double s, double v, String hex) {}

    public static final List<TargetColor> TARGET_COLORS = List.of(
            new TargetColor("Electric Cyan", 184, 0.95, 1.0, "#0df0ff"),
            new TargetColor("Crimson Velvet", 348, 0.88, 0.85, "#d91a45"),
            new TargetColor("Amber Sunrise", 38, 0.92, 0.98, "#faa014"),
            new TargetColor("Neon Emerald", 142, 0.85, 0.92, "#23eb6a"),
            new TargetColor("Royal Purple", 272, 0.78, 0.82, "#7d2ed1"),
            new TargetColor("Hot Magenta", 315, 0.90, 0.95, "#f218b7"),
            new TargetColor("Tangerine Burst", 22, 0.94, 0.96, "#f55d0f"),
            new TargetColor("Cobalt Blue", 220, 0.86, 0.90, "#2058e6"),
            new TargetColor("Matcha Cream", 85, 0.65, 0.82, "#8fc24a"),
            new TargetColor("Sunset Coral", 10, 0.75, 0.98, "#fa5b3f"),
            new TargetColor("Cyber Yellow", 52, 0.96, 0.98, "#fae30a"),
            new TargetColor("Deep Indigo", 245, 0.80, 0.70, "#2f24b3"),
            new TargetColor("Aqua Mint", 165, 0.75, 0.92, "#3aeab0"),
            new TargetColor("Golden Honey", 44, 0.82, 0.94, "#f0bb2b"),
            new TargetColor("Ultramarine", 230, 0.92, 0.88, "#123fe0"),
            new TargetColor("Lime Flash", 115, 0.90, 0.95, "#40f218")
    );

    private TargetColor targetColor;
    private final Map<String, Map<String, Object>> playerDials = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private volatile String winner = null;

    public DialedGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 3;
    }

    private static double[] hsvToCone(double h, double s, double v) {
        double rad = Math.toRadians(h % 360.0);
        double x = v * s * Math.cos(rad);
        double y = v * s * Math.sin(rad);
        double z = v;
        return new double[]{x, y, z};
    }

    public static double calculateColorScore(TargetColor target, Map<String, Object> guess) {
        if (target == null) return 0.0;
        double[] t = hsvToCone(target.h(), target.s(), target.v());

        double gh = 0.0;
        double gs = 1.0;
        double gv = 1.0;

        if (guess != null) {
            Object hVal = guess.get("h");
            if (hVal instanceof Number n) gh = n.doubleValue();
            Object sVal = guess.get("s");
            if (sVal instanceof Number n) {
                gs = n.doubleValue();
                if (gs > 1.0) gs /= 100.0;
            }
            Object vVal = guess.get("v");
            if (vVal instanceof Number n) {
                gv = n.doubleValue();
                if (gv > 1.0) gv /= 100.0;
            }
        }

        double[] g = hsvToCone(gh, gs, gv);
        double dist = Math.sqrt(Math.pow(t[0] - g[0], 2) + Math.pow(t[1] - g[1], 2) + Math.pow(t[2] - g[2], 2)) * 100.0;
        return Math.max(0.0, Math.round((100.0 - dist) * 10.0) / 10.0);
    }

    public static double calculateColorScore(Map<String, Object> targetMap, Map<String, Object> guessMap) {
        if (targetMap == null) return 0.0;
        double h = ((Number) targetMap.getOrDefault("h", 0.0)).doubleValue();
        double s = ((Number) targetMap.getOrDefault("s", 1.0)).doubleValue();
        double v = ((Number) targetMap.getOrDefault("v", 1.0)).doubleValue();
        String name = (String) targetMap.getOrDefault("name", "Target");
        String hex = (String) targetMap.getOrDefault("hex", "#ffffff");
        return calculateColorScore(new TargetColor(name, h, s, v, hex), guessMap);
    }

    @Override
    public void start() {
        this.roundNumber = 1;
        this.isOver = false;
        this.winner = null;
        startRound();
    }

    private void startRound() {
        this.playerDials.clear();
        this.roundResults.clear();

        List<TargetColor> pool = new ArrayList<>(TARGET_COLORS);
        Collections.shuffle(pool);
        this.targetColor = pool.get(0);

        this.phase = "INSPECT";
        this.phaseTimer = 10.0; // 10 seconds to memorize target color
    }

    @Override
    public String onTimerExpired() {
        if ("INSPECT".equals(phase)) {
            this.phase = "DIAL";
            this.phaseTimer = getEffectiveTimer(25.0); // dialed in color timer
            return "DIAL";
        } else if ("DIAL".equals(phase)) {
            evaluateRound();
            this.phase = "REVEAL";
            this.phaseTimer = 10.0;
            return "REVEAL";
        } else if ("REVEAL".equals(phase)) {
            if (this.roundNumber >= this.maxRounds) {
                this.phase = "GAME_OVER";
                this.isOver = true;
                this.phaseTimer = 0.0;
                determineWinner();
                return "GAME_OVER";
            } else {
                this.roundNumber++;
                startRound();
                return "INSPECT";
            }
        }
        return null;
    }

    private void evaluateRound() {
        for (PlayerInfo p : players.values()) {
            Map<String, Object> dial = playerDials.get(p.getId());
            double score = calculateColorScore(targetColor, dial);
            int pts = (int) Math.round(score * 10); // up to 1000 points

            scores.merge(p.getId(), pts, Integer::sum);
            p.setScore(scores.get(p.getId()));

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("player_id", p.getId());
            res.put("nickname", p.getNickname());
            res.put("dial", dial);
            res.put("score", score);
            res.put("points_earned", pts);
            roundResults.put(p.getId(), res);
        }
    }

    private void determineWinner() {
        String bestPid = null;
        int bestScore = -1;
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            if (entry.getValue() > bestScore) {
                bestScore = entry.getValue();
                bestPid = entry.getKey();
            }
        }
        if (bestPid != null && players.containsKey(bestPid)) {
            this.winner = players.get(bestPid).getNickname();
        } else {
            this.winner = "Nobody";
        }
    }

    @Override
    public Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if ("SUBMIT_DIAL".equals(action) && "DIAL".equals(phase)) {
            if (data != null) {
                playerDials.put(playerId, new LinkedHashMap<>(data));
            }
            if (playerDials.size() >= players.size()) {
                String next = onTimerExpired();
                return Map.of("broadcast", true, "event", "PHASE_CHANGE", "new_phase", next);
            }
            return Map.of("broadcast", true);
        }
        return Collections.emptyMap();
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        state.put("target_color", targetColor);
        state.put("results", roundResults);
        state.put("winner", winner);
        state.put("submitted_count", playerDials.size());
        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        if ("INSPECT".equals(phase) || "REVEAL".equals(phase) || "GAME_OVER".equals(phase)) {
            state.put("target_color", targetColor);
        }
        state.put("has_submitted", playerDials.containsKey(playerId));
        state.put("my_dial", playerDials.get(playerId));
        state.put("results", roundResults);
        state.put("winner", winner);
        return state;
    }

    public TargetColor getTargetColor() { return targetColor; }
}
