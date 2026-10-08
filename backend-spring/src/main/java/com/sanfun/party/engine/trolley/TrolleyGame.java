package com.sanfun.party.engine.trolley;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class TrolleyGame extends BasePartyGame {
    public static final String GAME_ID = "trolley";
    public static final String GAME_NAME = "Absurd Dilemmas";
    public static final String GAME_TAGLINE = "Ethical paradoxes, trolley problems, and consensus betting";
    public static final String GAME_DESCRIPTION = "Make an impossible moral choice, then bet whether your friends will agree with you or choose chaos.";
    public static final String GAME_ICON = "🚋";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record Dilemma(String title, String optionA, String optionB, String iconA, String iconB) {}

    public static final List<Dilemma> DILEMMAS = List.of(
            new Dilemma("The Time Loop Paradox", "Relive the best year of your life on an infinite 1-year loop forever", "Jump 30 years into the future with perfect health and $10 Million", "⏳", "🚀"),
            new Dilemma("The Social Truth Ray", "Everyone in the world can hear whatever you think about them", "You can hear what everyone in the room secretly thinks of you at all times", "📢", "🧠"),
            new Dilemma("The Digital Diet", "Never use the internet or smartphones ever again for the rest of your life", "Never eat hot cooked food again (only room-temperature or chilled foods)", "📵", "🥗"),
            new Dilemma("The Sleep Trade-off", "Never have to sleep again with zero fatigue (24 waking hours every day)", "Every time you wake up, you find a crisp $200 bill under your pillow", "⚡", "💵"),
            new Dilemma("The Quantum Trolley", "Divert the trolley to hit 5 clones of yourself from parallel universes", "Let the trolley hit 1 completely random stranger", "👥", "👤"),
            new Dilemma("The Superpower Curse", "Invisibility, but only while you are singing show tunes at full volume", "Teleportation, but you always arrive completely soaking wet", "🎶", "🌊"),
            new Dilemma("The Animal Whisperer", "You can speak fluent English with every dog and cat on Earth", "You can speak and understand every human language fluently", "🐕", "🌐"),
            new Dilemma("The Rewind Button", "A button that rewinds time by 10 minutes (usable once per day)", "A button that pauses universal time for 1 hour (usable once per week)", "⏪", "⏸️"),
            new Dilemma("The Culinary Monolith", "Eat world-class gourmet dining every day, but drink only plain lukewarm tap water", "Drink any top-tier beverage for free forever, but all food tastes like unsalted mashed potatoes", "🥩", "🍷"),
            new Dilemma("The Career Lottery", "Earn $500,000/year doing a deeply boring data entry job 40 hours a week", "Earn $60,000/year working only 10 hours a week at your dream creative passion", "💼", "🎨"),
            new Dilemma("The Soundtrack of Life", "Epic cinematic orchestra music plays in the background matching your emotions", "A studio sitcom laugh-track plays whenever you do something awkward or funny", "🎻", "😂")
    );

    public record PlayerChoice(String choice, boolean betMajority) {}

    private Dilemma currentDilemma;
    private final Map<String, PlayerChoice> playerChoices = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final Map<String, Integer> tally = new ConcurrentHashMap<>();
    private volatile String majorityChoice = null;
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public TrolleyGame(String roomCode, Map<String, PlayerInfo> players) {
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
        roundResults.clear();
        tally.clear();
        tally.put("A", 0);
        tally.put("B", 0);
        majorityChoice = null;

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
        phaseTimer = 22.0;
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
        int aCount = 0;
        int bCount = 0;
        for (PlayerChoice c : playerChoices.values()) {
            if ("A".equals(c.choice())) aCount++;
            else if ("B".equals(c.choice())) bCount++;
        }

        tally.put("A", aCount);
        tally.put("B", bCount);

        if (aCount > bCount) majorityChoice = "A";
        else if (bCount > aCount) majorityChoice = "B";
        else majorityChoice = "TIE";

        boolean isChaosTie = (aCount > 0 && aCount == bCount);
        boolean isUnanimous = (aCount == 0 || bCount == 0) && (aCount + bCount > 1);

        for (String pid : players.keySet()) {
            PlayerChoice choiceData = playerChoices.get(pid);
            int pts = 0;
            boolean predictedCorrectly = false;

            if (choiceData != null && choiceData.choice() != null) {
                boolean isWithMajority = choiceData.choice().equals(majorityChoice);
                if (!"TIE".equals(majorityChoice) && choiceData.betMajority() == isWithMajority) {
                    pts += 500;
                    predictedCorrectly = true;
                }

                if (isChaosTie) pts += 300;
                else if (isUnanimous) pts += 200;
            }

            scores.put(pid, scores.getOrDefault(pid, 0) + pts);
            roundResults.put(pid, Map.of(
                    "choice", choiceData != null ? choiceData.choice() : "",
                    "bet_majority", choiceData != null && choiceData.betMajority(),
                    "predicted_correctly", predictedCorrectly,
                    "points", pts
            ));
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("CHOICE".equals(phase) && ("SUBMIT_CHOICE".equals(action) || "LOCK_IN".equals(action))) {
            String choice = (String) data.get("choice");
            boolean betMajority = true;
            Object bm = data.get("bet_majority");
            if (bm instanceof Boolean b) betMajority = b;

            if ("A".equals(choice) || "B".equals(choice)) {
                playerChoices.put(playerId, new PlayerChoice(choice, betMajority));
            }

            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerChoices.size() >= connectedCount) {
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

        state.put("dilemma_title", currentDilemma != null ? currentDilemma.title() : null);
        state.put("option_a", currentDilemma != null ? currentDilemma.optionA() : null);
        state.put("option_b", currentDilemma != null ? currentDilemma.optionB() : null);
        state.put("icon_a", currentDilemma != null ? currentDilemma.iconA() : null);
        state.put("icon_b", currentDilemma != null ? currentDilemma.iconB() : null);
        state.put("submitted_pids", new ArrayList<>(playerChoices.keySet()));
        state.put("tally", isReveal ? tally : Collections.emptyMap());
        state.put("majority_choice", isReveal ? majorityChoice : null);
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        state.put("dilemma_title", currentDilemma != null ? currentDilemma.title() : null);
        state.put("option_a", currentDilemma != null ? currentDilemma.optionA() : null);
        state.put("option_b", currentDilemma != null ? currentDilemma.optionB() : null);
        state.put("icon_a", currentDilemma != null ? currentDilemma.iconA() : null);
        state.put("icon_b", currentDilemma != null ? currentDilemma.iconB() : null);

        PlayerChoice pc = playerChoices.get(playerId);
        state.put("my_choice", pc != null ? Map.of("choice", pc.choice(), "bet_majority", pc.betMajority()) : null);
        state.put("has_chosen", playerChoices.containsKey(playerId));
        state.put("tally", isReveal ? tally : Collections.emptyMap());
        state.put("majority_choice", isReveal ? majorityChoice : null);
        state.put("my_result", isReveal ? roundResults.get(playerId) : null);
        state.put("winner", winner);

        return state;
    }
}
