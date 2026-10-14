package com.sanfun.party.engine.rather;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class WouldYouRatherGame extends BasePartyGame {
    public static final String GAME_ID = "rather";
    public static final String GAME_NAME = "Would You Rather?";
    public static final String GAME_TAGLINE = "Impossible dilemmas, room consensus, and majority bets";
    public static final String GAME_DESCRIPTION = "Pick between two absurd dilemmas. Predict if your friends agree with you to win big points!";
    public static final String GAME_ICON = "⚡";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record Dilemma(
            String optionA,
            String iconA,
            String optionB,
            String iconB,
            String topic
    ) {}

    public static final List<Dilemma> DILEMMAS = List.of(
            new Dilemma(
                    "Always sprint at full speed whenever running any errand",
                    "🏃",
                    "Speak only in rhyming verse during all serious conversations",
                    "🎤",
                    "Eccentric Habits"
            ),
            new Dilemma(
                    "Fight 1 horse-sized duck in a gladiator arena",
                    "🦆",
                    "Fight 100 duck-sized horses in a brawl",
                    "🐴",
                    "Mythical Combat"
            ),
            new Dilemma(
                    "Never need to sleep again with zero physical fatigue",
                    "⚡",
                    "Teleport anywhere instantly, but arrive completely soaking wet",
                    "🌊",
                    "Superpowers"
            ),
            new Dilemma(
                    "Hear the internal monologue of everyone within 10 feet of you",
                    "🧠",
                    "Have your entire search history narrated by Morgan Freeman on a loudspeaker once a month",
                    "📢",
                    "Privacy Nightmares"
            ),
            new Dilemma(
                    "Permanently lose the ability to eat spicy food forever",
                    "🌶️",
                    "Permanently lose the ability to listen to music forever",
                    "🎵",
                    "Sensory Sacrifices"
            ),
            new Dilemma(
                    "Always arrive 20 minutes late to every appointment and party",
                    "⏰",
                    "Always arrive 20 minutes early, but have to wait outside in silence",
                    "🚪",
                    "Punctuality"
            ),
            new Dilemma(
                    "Have fingers as long as baguettes",
                    "🥖",
                    "Have toes that squeak like bicycle horns with every step",
                    "🚲",
                    "Physical Quirks"
            ),
            new Dilemma(
                    "Live in a luxury treehouse mansion in the Amazon rainforest",
                    "🌳",
                    "Live in a glass submerged underwater penthouse in the Caribbean",
                    "🐬",
                    "Dream Residences"
            ),
            new Dilemma(
                    "Know the complete secret history of every object you touch",
                    "🔮",
                    "Speak fluently with every animal, but they are all sarcastic and rude to you",
                    "🐾",
                    "Mystic Gifts"
            ),
            new Dilemma(
                    "Rewind time by 10 seconds (usable once per day)",
                    "⏪",
                    "Fast-forward time by 10 minutes (unlimited daily uses)",
                    "⏩",
                    "Temporal Controls"
            ),
            new Dilemma(
                    "Never use any smartphone or tablet again for the rest of your life",
                    "📵",
                    "Eat strictly raw, uncooked food for the rest of your life",
                    "🥗",
                    "Modern Sacrifices"
            ),
            new Dilemma(
                    "An unlimited lifetime supply of free wood-fired pizza and tacos",
                    "🍕",
                    "A magical kitchen box that produces whatever food you crave in 5 seconds",
                    "🍔",
                    "Culinary Magic"
            )
    );

    private Dilemma currentDilemma;
    private final Map<String, String> playerChoices = new ConcurrentHashMap<>(); // "A" or "B"
    private final Map<String, Boolean> playerBets = new ConcurrentHashMap<>(); // bet on majority
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public WouldYouRatherGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 3;
    }

    @Override
    public synchronized void start() {
        roundNumber = 1;
        isOver = false;
        startRound();
    }

    private void startRound() {
        playerChoices.clear();
        playerBets.clear();
        roundResults.clear();

        List<Integer> avail = new ArrayList<>();
        for (int i = 0; i < DILEMMAS.size(); i++) {
            if (!usedIndices.contains(i)) avail.add(i);
        }
        if (avail.isEmpty()) {
            usedIndices.clear();
            for (int i = 0; i < DILEMMAS.size(); i++) avail.add(i);
        }

        int idx = avail.get(new Random().nextInt(avail.size()));
        usedIndices.add(idx);
        currentDilemma = DILEMMAS.get(idx);

        phase = "CHOICE";
        phaseTimer = getEffectiveTimer(30.0);
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "CHOICE" -> {
                resolveRound();
                phase = "REVEAL";
                phaseTimer = 12.0;
                return phase;
            }
            case "REVEAL" -> {
                if (roundNumber >= maxRounds) {
                    phase = "GAME_OVER";
                    isOver = true;
                    phaseTimer = 0.0;
                    determineWinner();
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
        int countA = 0;
        int countB = 0;
        for (String c : playerChoices.values()) {
            if ("A".equalsIgnoreCase(c)) countA++;
            else if ("B".equalsIgnoreCase(c)) countB++;
        }

        String majority = "TIE";
        if (countA > countB) majority = "A";
        else if (countB > countA) majority = "B";

        for (PlayerInfo p : players.values()) {
            String choice = playerChoices.get(p.getId());
            boolean betMajority = playerBets.getOrDefault(p.getId(), false);

            int pts = 0;
            String verdict = "No Choice Made";

            if (choice != null) {
                if (betMajority) {
                    if ("TIE".equals(majority)) {
                        pts = 0;
                        verdict = "Dead Heat Tie! Bet Pushed (0 pts) ⚖️";
                    } else if (choice.equalsIgnoreCase(majority)) {
                        pts = 500;
                        verdict = "Majority Bet Won! (+500 pts) 🎉";
                    } else {
                        pts = -500;
                        verdict = "Majority Bet Lost! (-500 pts) 💀";
                    }
                } else {
                    pts = 200;
                    verdict = choice.equalsIgnoreCase(majority) ? "Safe Vote with Majority (+200 pts)" : "Safe Counter-Culture Vote (+200 pts)";
                }
            }

            scores.merge(p.getId(), pts, Integer::sum);
            p.setScore(scores.get(p.getId()));

            Map<String, Object> rMap = new LinkedHashMap<>();
            rMap.put("player_id", p.getId());
            rMap.put("nickname", p.getNickname());
            rMap.put("avatar", p.getAvatar());
            rMap.put("color", p.getColor());
            rMap.put("choice", choice);
            rMap.put("bet_majority", betMajority);
            rMap.put("points_earned", pts);
            rMap.put("verdict", verdict);

            roundResults.put(p.getId(), rMap);
        }
    }

    private void determineWinner() {
        String bestPid = null;
        int bestScore = -1;
        for (Map.Entry<String, Integer> e : scores.entrySet()) {
            if (e.getValue() > bestScore) {
                bestScore = e.getValue();
                bestPid = e.getKey();
            }
        }
        if (bestPid != null && players.containsKey(bestPid)) {
            winner = players.get(bestPid).getNickname();
        } else {
            winner = "Nobody";
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("CHOICE".equals(phase) && ("SUBMIT_CHOICE".equals(action) || "CHOOSE".equals(action) || "LOCK_IN".equals(action))) {
            String choice = (String) data.get("choice");
            if (choice != null) {
                choice = choice.trim().toUpperCase();
                if ("A".equals(choice) || "B".equals(choice)) {
                    playerChoices.put(playerId, choice);
                    boolean betMajority = Boolean.TRUE.equals(data.get("bet_majority"));
                    playerBets.put(playerId, betMajority);

                    long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
                    if (playerChoices.size() >= connectedCount) {
                        resolveRound();
                        phase = "REVEAL";
                        phaseTimer = 12.0;
                    }
                    return Map.of("broadcast", true);
                }
            }
        }
        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        if (currentDilemma != null) {
            state.put("option_a", currentDilemma.optionA());
            state.put("icon_a", currentDilemma.iconA());
            state.put("option_b", currentDilemma.optionB());
            state.put("icon_b", currentDilemma.iconB());
            state.put("topic", currentDilemma.topic());
        }

        int countA = 0;
        int countB = 0;
        for (String c : playerChoices.values()) {
            if ("A".equalsIgnoreCase(c)) countA++;
            else if ("B".equalsIgnoreCase(c)) countB++;
        }
        int total = countA + countB;
        double pctA = total > 0 ? (countA * 100.0 / total) : 50.0;
        double pctB = total > 0 ? (countB * 100.0 / total) : 50.0;

        state.put("submitted_pids", new ArrayList<>(playerChoices.keySet()));
        state.put("count_a", isReveal ? countA : null);
        state.put("count_b", isReveal ? countB : null);
        state.put("pct_a", isReveal ? Math.round(pctA) : null);
        state.put("pct_b", isReveal ? Math.round(pctB) : null);
        state.put("majority", isReveal ? (countA > countB ? "A" : (countB > countA ? "B" : "TIE")) : null);
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());
        state.put("winner", winner);
        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        if (currentDilemma != null) {
            state.put("option_a", currentDilemma.optionA());
            state.put("icon_a", currentDilemma.iconA());
            state.put("option_b", currentDilemma.optionB());
            state.put("icon_b", currentDilemma.iconB());
            state.put("topic", currentDilemma.topic());
        }

        int countA = 0;
        int countB = 0;
        for (String c : playerChoices.values()) {
            if ("A".equalsIgnoreCase(c)) countA++;
            else if ("B".equalsIgnoreCase(c)) countB++;
        }
        int total = countA + countB;
        double pctA = total > 0 ? (countA * 100.0 / total) : 50.0;
        double pctB = total > 0 ? (countB * 100.0 / total) : 50.0;

        state.put("submitted_pids", new ArrayList<>(playerChoices.keySet()));
        state.put("count_a", isReveal ? countA : null);
        state.put("count_b", isReveal ? countB : null);
        state.put("pct_a", isReveal ? Math.round(pctA) : null);
        state.put("pct_b", isReveal ? Math.round(pctB) : null);
        state.put("majority", isReveal ? (countA > countB ? "A" : (countB > countA ? "B" : "TIE")) : null);
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());

        state.put("my_choice", playerChoices.get(playerId));
        state.put("my_bet", playerBets.get(playerId));
        state.put("has_locked", playerChoices.containsKey(playerId));
        state.put("my_result", isReveal ? roundResults.get(playerId) : null);
        state.put("winner", winner);
        return state;
    }

    public Dilemma getCurrentDilemma() { return currentDilemma; }
    public Map<String, String> getPlayerChoices() { return playerChoices; }
}
