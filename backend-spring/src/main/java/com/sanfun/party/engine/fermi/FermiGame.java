package com.sanfun.party.engine.fermi;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class FermiGame extends BasePartyGame {
    public static final String GAME_ID = "fermi";
    public static final String GAME_NAME = "Fermi Estimator";
    public static final String GAME_TAGLINE = "Order-of-magnitude estimation on cosmic and chaotic scales";
    public static final String GAME_DESCRIPTION = "How many golf balls fit in a 747? Guess quantities across vast orders of magnitude without crashing into zero.";
    public static final String GAME_ICON = "🪐";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record FermiQuestion(String prompt, double actual, String unit, String fact) {}

    public static final List<FermiQuestion> QUESTIONS = List.of(
            new FermiQuestion("How many seconds has modern recorded human history (~5,000 years) lasted?", 157680000000.0, "seconds", "5,000 years * 365.25 days * 86,400 seconds = ~157.7 Billion seconds."),
            new FermiQuestion("How many standard golf balls could fit inside the passenger cabin of a Boeing 747?", 16000000.0, "golf balls", "A 747 passenger volume is ~876 m³, yielding ~16 Million balls."),
            new FermiQuestion("How many liters of water are in all the Earth's oceans combined?", 1.335e21, "liters", "Total ocean volume is ~1.335 billion km³, which equals 1.335 Sextillion liters."),
            new FermiQuestion("How many total heartbeats does an average human experience in an 80-year lifetime?", 3360000000.0, "heartbeats", "At 80 bpm, an 80-year life has ~3.36 Billion heartbeats."),
            new FermiQuestion("How many pizza slices are consumed in the United States every single day?", 30000000.0, "slices", "Americans eat roughly 350 slices per second, totaling ~30 Million slices each day."),
            new FermiQuestion("What is the total mass of the Earth's entire atmosphere in kilograms?", 5.15e18, "kg", "Atmospheric surface pressure multiplied by Earth's area gives ~5.15 * 10^18 kg."),
            new FermiQuestion("How many active piano tuners are estimated to work in Chicago? (The classic Fermi problem)", 125.0, "piano tuners", "Enrico Fermi's celebrated analysis: ~5 million population -> ~125 full-time tuners."),
            new FermiQuestion("How many spoken words does an average human utter across an entire 75-year lifetime?", 860000000.0, "words", "Speaking ~16,000 words per day over 75 years totals roughly 860 Million words."),
            new FermiQuestion("How many cells make up the human body?", 3.72e13, "cells", "Biochemists estimate ~37.2 Trillion human cells in an average adult."),
            new FermiQuestion("How many trees are currently growing on planet Earth?", 3.04e12, "trees", "A landmark Nature satellite study counted approximately 3.04 Trillion trees globally."),
            new FermiQuestion("How many grains of sand are there on all the beaches and deserts of Earth combined?", 7.5e18, "grains of sand", "Geologists estimate ~7.5 Quintillion grains across Earth's coastlines and dunes."),
            new FermiQuestion("How many seconds does it take for light from the Sun to reach Pluto?", 19680.0, "seconds", "At 5.9 billion km, light travels for ~19,680 seconds (about 5.5 hours)."),
            new FermiQuestion("How many LEGO bricks have been manufactured worldwide since 1958?", 600000000000.0, "bricks", "The LEGO Group has produced over 600 Billion plastic elements."),
            new FermiQuestion("How many search queries does Google process in one single day?", 8500000000.0, "searches", "Google serves around 99,000 searches per second, surpassing 8.5 Billion queries each day."),
            new FermiQuestion("How many kilometers does light travel in one full year (1 Light-Year)?", 9460730472580.0, "km", "Traveling at 299,792 km/s, light covers ~9.46 Trillion kilometers in one year."),
            new FermiQuestion("How many ants are estimated to be alive on Earth right now?", 2e16, "ants", "A 2022 global census estimated 20 Quadrillion ants crawling on Earth."),
            new FermiQuestion("How many stars are in the Milky Way galaxy?", 250000000000.0, "stars", "Astronomers estimate between 100 Billion and 400 Billion stars, median 250 Billion.")
    );

    private FermiQuestion currentQ;
    private final Map<String, Double> playerGuesses = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public FermiGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 3;
    }

    public static Map<String, Object> scoreFermiGuess(double guess, double actual) {
        double safeGuess = Math.max(1e-9, (Double.isNaN(guess) || Double.isInfinite(guess)) ? 1e-9 : guess);
        double safeActual = Math.max(1e-9, actual);

        double dLog = Math.abs(Math.log10(safeGuess) - Math.log10(safeActual));
        double scoreFraction = Math.max(0.0, 1.0 - (dLog / 3.0));
        int pts = (int) Math.round(1000.0 * scoreFraction);

        return Map.of(
                "points", pts,
                "d_log", Math.round(dLog * 100.0) / 100.0
        );
    }

    @Override
    public synchronized void start() {
        roundNumber = 1;
        isOver = false;
        startRound();
    }

    private void startRound() {
        playerGuesses.clear();
        roundResults.clear();

        List<Integer> avail = new ArrayList<>();
        for (int i = 0; i < QUESTIONS.size(); i++) {
            if (!usedIndices.contains(i)) avail.add(i);
        }
        if (avail.isEmpty()) {
            usedIndices.clear();
            for (int i = 0; i < QUESTIONS.size(); i++) avail.add(i);
        }

        int idx = avail.get(new Random().nextInt(avail.size()));
        usedIndices.add(idx);
        currentQ = QUESTIONS.get(idx);

        phase = "QUESTION";
        phaseTimer = getEffectiveTimer(30.0);
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "QUESTION" -> {
                resolveRound();
                phase = "REVEAL";
                phaseTimer = 12.0;
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
        double actual = currentQ.actual();
        for (String pid : players.keySet()) {
            double guessVal = playerGuesses.getOrDefault(pid, 0.0);
            Map<String, Object> scored = scoreFermiGuess(guessVal, actual);
            int pts = (Integer) scored.get("points");
            scores.put(pid, scores.getOrDefault(pid, 0) + pts);

            roundResults.put(pid, Map.of(
                    "guess", guessVal,
                    "d_log", scored.get("d_log"),
                    "points", pts
            ));
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("QUESTION".equals(phase) && ("SUBMIT_GUESS".equals(action) || "LOCK_IN".equals(action))) {
            double val = 0.0;
            Object gVal = data.get("guess");
            if (gVal instanceof Number n) {
                val = n.doubleValue();
            } else if (gVal instanceof String s) {
                try {
                    val = Double.parseDouble(s);
                } catch (NumberFormatException ignored) {}
            }
            if (Double.isNaN(val) || Double.isInfinite(val)) val = 0.0;

            playerGuesses.put(playerId, val);

            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerGuesses.size() >= connectedCount) {
                resolveRound();
                phase = "REVEAL";
                phaseTimer = 12.0;
            }
            return Map.of("broadcast", true);
        }
        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        state.put("prompt", currentQ != null ? currentQ.prompt() : null);
        state.put("unit", currentQ != null ? currentQ.unit() : null);
        state.put("actual", isReveal && currentQ != null ? currentQ.actual() : null);
        state.put("fact", isReveal && currentQ != null ? currentQ.fact() : null);
        state.put("submitted_pids", new ArrayList<>(playerGuesses.keySet()));
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        state.put("prompt", currentQ != null ? currentQ.prompt() : null);
        state.put("unit", currentQ != null ? currentQ.unit() : null);
        state.put("actual", isReveal && currentQ != null ? currentQ.actual() : null);
        state.put("my_guess", playerGuesses.get(playerId));
        state.put("has_locked", playerGuesses.containsKey(playerId));
        state.put("my_result", isReveal ? roundResults.get(playerId) : null);
        state.put("winner", winner);

        return state;
    }
}
