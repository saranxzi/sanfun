package com.sanfun.party.engine.trends;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class TrendsGame extends BasePartyGame {
    public static final String GAME_ID = "trends";
    public static final String GAME_NAME = "Higher or Lower";
    public static final String GAME_TAGLINE = "Global search volumes showdown with streak multipliers";
    public static final String GAME_DESCRIPTION = "Does Item B get HIGHER or LOWER average monthly search volume than Item A? Keep your streak alive to multiply points.";
    public static final String GAME_ICON = "📈";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record TrendItem(String name, long volume, String icon) {}
    public record Matchup(TrendItem itemA, TrendItem itemB, String relation) {}

    public static final List<Matchup> MATCHUPS = List.of(
            new Matchup(new TrendItem("Minecraft", 24500000L, "⛏️"), new TrendItem("Fortnite", 29000000L, "🔫"), "HIGHER"),
            new Matchup(new TrendItem("Taylor Swift", 38000000L, "🎤"), new TrendItem("Lionel Messi", 45000000L, "⚽"), "HIGHER"),
            new Matchup(new TrendItem("Pizza", 8200000L, "🍕"), new TrendItem("Sushi", 5100000L, "🍣"), "LOWER"),
            new Matchup(new TrendItem("PlayStation 5", 14000000L, "🎮"), new TrendItem("Nintendo Switch", 11500000L, "🕹️"), "LOWER"),
            new Matchup(new TrendItem("Python (Programming)", 3800000L, "🐍"), new TrendItem("JavaScript", 2900000L, "📜"), "LOWER"),
            new Matchup(new TrendItem("Elon Musk", 12000000L, "🚀"), new TrendItem("Bill Gates", 4100000L, "💻"), "LOWER"),
            new Matchup(new TrendItem("Avengers", 7400000L, "🦸"), new TrendItem("Star Wars", 9800000L, "⚔️"), "HIGHER"),
            new Matchup(new TrendItem("Netflix", 88000000L, "🍿"), new TrendItem("Spotify", 42000000L, "🎧"), "LOWER"),
            new Matchup(new TrendItem("YouTube", 182000000L, "📺"), new TrendItem("Facebook", 151000000L, "👥"), "LOWER"),
            new Matchup(new TrendItem("Batman", 11200000L, "🦇"), new TrendItem("Spider-Man", 16500000L, "🕷️"), "HIGHER"),
            new Matchup(new TrendItem("Grand Theft Auto", 19500000L, "🚗"), new TrendItem("Call of Duty", 13800000L, "🎯"), "LOWER"),
            new Matchup(new TrendItem("Amazon", 125000000L, "📦"), new TrendItem("eBay", 41000000L, "🏷️"), "LOWER"),
            new Matchup(new TrendItem("Coca-Cola", 5800000L, "🥤"), new TrendItem("Pepsi", 3200000L, "🥫"), "LOWER"),
            new Matchup(new TrendItem("Pokemon", 33000000L, "⚡"), new TrendItem("Roblox", 49000000L, "🧱"), "HIGHER"),
            new Matchup(new TrendItem("Coffee", 9100000L, "☕"), new TrendItem("Tea", 6400000L, "🍵"), "LOWER"),
            new Matchup(new TrendItem("Super Mario", 12800000L, "🍄"), new TrendItem("Sonic the Hedgehog", 7900000L, "🦔"), "LOWER")
    );

    private Matchup currentMatchup;
    private final Map<String, String> playerGuesses = new ConcurrentHashMap<>();
    private final Map<String, Integer> streaks = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public TrendsGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 4;
        for (String pid : players.keySet()) {
            streaks.put(pid, 0);
        }
    }

    @Override
    public synchronized void start() {
        roundNumber = 1;
        isOver = false;
        for (String pid : players.keySet()) {
            streaks.put(pid, 0);
        }
        startRound();
    }

    private void startRound() {
        playerGuesses.clear();
        roundResults.clear();

        List<Integer> avail = new ArrayList<>();
        for (int i = 0; i < MATCHUPS.size(); i++) {
            if (!usedIndices.contains(i)) avail.add(i);
        }
        if (avail.isEmpty()) {
            usedIndices.clear();
            for (int i = 0; i < MATCHUPS.size(); i++) avail.add(i);
        }

        int idx = avail.get(new Random().nextInt(avail.size()));
        usedIndices.add(idx);
        currentMatchup = MATCHUPS.get(idx);

        phase = "GUESS";
        phaseTimer = 16.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "GUESS" -> {
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
        String correct = currentMatchup.relation();

        for (String pid : players.keySet()) {
            String guess = playerGuesses.get(pid);
            boolean isCorrect = correct.equalsIgnoreCase(guess);
            int pts = 0;

            if (isCorrect) {
                int curStreak = streaks.getOrDefault(pid, 0) + 1;
                streaks.put(pid, curStreak);
                double mult = Math.min(2.5, 1.0 + (curStreak - 1) * 0.5);
                pts = (int) Math.round(300.0 * mult);
            } else {
                streaks.put(pid, 0);
            }

            scores.put(pid, scores.getOrDefault(pid, 0) + pts);
            roundResults.put(pid, Map.of(
                    "guess", guess != null ? guess : "",
                    "is_correct", isCorrect,
                    "streak", streaks.getOrDefault(pid, 0),
                    "points", pts
            ));
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("GUESS".equals(phase) && ("SUBMIT_GUESS".equals(action) || "GUESS_TREND".equals(action))) {
            String choice = (String) data.get("guess");
            if (choice != null) {
                choice = choice.toUpperCase().trim();
                if ("HIGHER".equals(choice) || "LOWER".equals(choice)) {
                    playerGuesses.put(playerId, choice);
                }
            }

            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerGuesses.size() >= connectedCount) {
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
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        if (currentMatchup != null) {
            state.put("item_a", Map.of(
                    "name", currentMatchup.itemA().name(),
                    "volume", currentMatchup.itemA().volume(),
                    "icon", currentMatchup.itemA().icon()
            ));
            Map<String, Object> bMap = new HashMap<>();
            bMap.put("name", currentMatchup.itemB().name());
            bMap.put("icon", currentMatchup.itemB().icon());
            bMap.put("volume", isReveal ? currentMatchup.itemB().volume() : null);
            state.put("item_b", bMap);
            state.put("relation", isReveal ? currentMatchup.relation() : null);
        }

        state.put("submitted_pids", new ArrayList<>(playerGuesses.keySet()));
        state.put("streaks", new LinkedHashMap<>(streaks));
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        if (currentMatchup != null) {
            state.put("item_a", Map.of(
                    "name", currentMatchup.itemA().name(),
                    "volume", currentMatchup.itemA().volume(),
                    "icon", currentMatchup.itemA().icon()
            ));
            Map<String, Object> bMap = new HashMap<>();
            bMap.put("name", currentMatchup.itemB().name());
            bMap.put("icon", currentMatchup.itemB().icon());
            bMap.put("volume", isReveal ? currentMatchup.itemB().volume() : null);
            state.put("item_b", bMap);
        }

        state.put("my_guess", playerGuesses.get(playerId));
        state.put("has_guessed", playerGuesses.containsKey(playerId));
        state.put("my_streak", streaks.getOrDefault(playerId, 0));
        state.put("my_result", isReveal ? roundResults.get(playerId) : null);
        state.put("winner", winner);

        return state;
    }
}
