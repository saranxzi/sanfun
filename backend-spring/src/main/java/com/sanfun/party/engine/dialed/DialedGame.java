package com.sanfun.party.engine.dialed;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class DialedGame extends BasePartyGame {
    public static final String GAME_ID = "dialed";
    public static final String GAME_NAME = "Dialed";
    public static final String GAME_TAGLINE = "Tune your senses to exact color hues and audio pitches";
    public static final String GAME_DESCRIPTION = "Test your memory and perception. Match exact target colors and frequencies on your phone dial.";
    public static final String GAME_ICON = "🎯";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record TargetColor(String name, double h, double s, double v, String hex) {}
    public record TargetPitch(String name, String note, double freq) {}

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

    public static final List<TargetPitch> TARGET_PITCHES = List.of(
            new TargetPitch("Tenor C (C3)", "C3", 130.81),
            new TargetPitch("Deep F (F3)", "F3", 174.61),
            new TargetPitch("Low G (G3)", "G3", 196.00),
            new TargetPitch("Middle C (C4)", "C4", 261.63),
            new TargetPitch("D in Octave 4 (D4)", "D4", 293.66),
            new TargetPitch("Golden E (E4)", "E4", 329.63),
            new TargetPitch("Bright F (F4)", "F4", 349.23),
            new TargetPitch("Concert G (G4)", "G4", 392.00),
            new TargetPitch("Concert A (A4)", "A4", 440.00),
            new TargetPitch("Warm B (B4)", "B4", 493.88),
            new TargetPitch("High C (C5)", "C5", 523.25)
    );

    private String roundType = "COLOR";
    private TargetColor targetColor;
    private TargetPitch targetPitch;
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

    @SuppressWarnings("unchecked")
    public static double calculateColorScore(Map<String, ?> targetHsv, Map<String, ?> guessHsv) {
        if (targetHsv == null) return 0.0;
        double th = 0.0, ts = 1.0, tv = 1.0;
        if (targetHsv.get("h") instanceof Number n) th = n.doubleValue();
        if (targetHsv.get("s") instanceof Number n) {
            ts = n.doubleValue();
            if (ts > 1.0) ts /= 100.0;
        }
        if (targetHsv.get("v") instanceof Number n) {
            tv = n.doubleValue();
            if (tv > 1.0) tv /= 100.0;
        }
        return calculateColorScore(new TargetColor("Custom", th, ts, tv, ""), (Map<String, Object>) guessHsv);
    }

    public static double calculatePitchScore(double targetFreq, double guessFreq) {
        if (Double.isNaN(guessFreq) || Double.isInfinite(guessFreq) ||
            Double.isNaN(targetFreq) || Double.isInfinite(targetFreq) ||
            guessFreq <= 0 || targetFreq <= 0) {
            return 0.0;
        }
        double cents = 1200.0 * Math.abs(Math.log(guessFreq / targetFreq) / Math.log(2.0));
        return Math.max(0.0, Math.round((100.0 - (cents / 12.0)) * 10.0) / 10.0);
    }

    @Override
    public synchronized void start() {
        roundNumber = 1;
        isOver = false;
        startRound();
    }

    private void startRound() {
        playerDials.clear();
        roundResults.clear();
        Random rng = new Random();

        if (roundNumber == 2) {
            roundType = "PITCH";
            targetPitch = TARGET_PITCHES.get(rng.nextInt(TARGET_PITCHES.size()));
            targetColor = null;
        } else {
            roundType = "COLOR";
            targetColor = TARGET_COLORS.get(rng.nextInt(TARGET_COLORS.size()));
            targetPitch = null;
        }

        phase = "INSPECT";
        phaseTimer = 6.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "INSPECT" -> {
                phase = "DIAL";
                phaseTimer = 20.0;
                return phase;
            }
            case "DIAL" -> {
                resolveRound();
                phase = "REVEAL";
                phaseTimer = 10.0;
                return phase;
            }
            case "REVEAL" -> {
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
            Map<String, Object> guess = playerDials.getOrDefault(pid, Collections.emptyMap());
            double scorePct;
            if ("COLOR".equals(roundType)) {
                scorePct = calculateColorScore(targetColor, guess);
            } else {
                double guessF = 0.0;
                Object pVal = guess.get("pitch");
                if (pVal instanceof Number n) guessF = n.doubleValue();
                scorePct = calculatePitchScore(targetPitch.freq(), guessF);
            }

            int pts = (int) Math.round(scorePct * 10.0);
            scores.put(pid, scores.getOrDefault(pid, 0) + pts);
            roundResults.put(pid, Map.of(
                    "score_pct", scorePct,
                    "points_awarded", pts,
                    "guess", guess
            ));
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("DIAL".equals(phase) && ("SUBMIT_DIAL".equals(action) || "LOCK_IN".equals(action))) {
            playerDials.put(playerId, data);
            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerDials.size() >= connectedCount) {
                resolveRound();
                phase = "REVEAL";
                phaseTimer = 10.0;
            }
            return Map.of("broadcast", true);
        }
        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        state.put("round_type", roundType);
        boolean showTarget = "INSPECT".equals(phase) || "REVEAL".equals(phase) || isOver;

        if (showTarget) {
            if ("COLOR".equals(roundType) && targetColor != null) {
                state.put("target_color", Map.of(
                        "name", targetColor.name(),
                        "h", targetColor.h(),
                        "s", targetColor.s(),
                        "v", targetColor.v(),
                        "hex", targetColor.hex()
                ));
            } else if ("PITCH".equals(roundType) && targetPitch != null) {
                state.put("target_pitch", Map.of(
                        "name", targetPitch.name(),
                        "note", targetPitch.note(),
                        "freq", targetPitch.freq()
                ));
            }
        } else {
            state.put("target_color", null);
            state.put("target_pitch", null);
        }

        state.put("round_results", ("REVEAL".equals(phase) || isOver) ? roundResults : Collections.emptyMap());
        state.put("submitted_pids", new ArrayList<>(playerDials.keySet()));
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        state.put("round_type", roundType);

        if ("INSPECT".equals(phase)) {
            if ("COLOR".equals(roundType) && targetColor != null) {
                state.put("target_color", Map.of(
                        "name", targetColor.name(),
                        "h", targetColor.h(),
                        "s", targetColor.s(),
                        "v", targetColor.v(),
                        "hex", targetColor.hex()
                ));
            } else if ("PITCH".equals(roundType) && targetPitch != null) {
                state.put("target_pitch", Map.of(
                        "name", targetPitch.name(),
                        "note", targetPitch.note(),
                        "freq", targetPitch.freq()
                ));
            }
        } else {
            state.put("target_color", null);
            state.put("target_pitch", null);
        }

        state.put("my_dial", playerDials.get(playerId));
        state.put("has_locked", playerDials.containsKey(playerId));
        state.put("my_result", ("REVEAL".equals(phase) || isOver) ? roundResults.get(playerId) : null);
        state.put("winner", winner);

        return state;
    }
}
