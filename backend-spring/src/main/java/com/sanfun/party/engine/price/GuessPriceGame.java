package com.sanfun.party.engine.price;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class GuessPriceGame extends BasePartyGame {
    public static final String GAME_ID = "guess_price";
    public static final String GAME_NAME = "Guess the Price";
    public static final String GAME_TAGLINE = "Appraise eccentric luxury artifacts, relics, and treasures";
    public static final String GAME_DESCRIPTION = "From solid gold toilets to rare dinosaur skeletons, how close can you guess the true price tag?";
    public static final String GAME_ICON = "🏷️";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record PriceItem(
            String name,
            long actualPrice,
            String category,
            String description,
            String imageIcon,
            String funFact
    ) {}

    public static final List<PriceItem> ITEMS = List.of(
            new PriceItem(
                    "Solid Gold Toilet ('America' by Cattelan)",
                    6000000L,
                    "Luxury Modern Art",
                    "A fully functional 18-karat solid gold toilet created by Italian artist Maurizio Cattelan.",
                    "🚽",
                    "Valued at $6 Million, it was stolen from Blenheim Palace in England and remains missing."
            ),
            new PriceItem(
                    "First Ever Tweet by Jack Dorsey (NFT)",
                    2900000L,
                    "Digital Relics",
                    "The non-fungible token representing the historic first tweet: 'just setting up my twttr'.",
                    "🐦",
                    "Purchased for $2.9 Million in March 2021; an attempted resale in 2022 fetched a top bid under $300."
            ),
            new PriceItem(
                    "Operational Apple-1 Computer (1976)",
                    905000L,
                    "Vintage Computing",
                    "One of only ~63 surviving original Apple-1 circuit boards, hand-soldered by Steve Wozniak.",
                    "🍏",
                    "Sold at Bonhams auction for $905,000, over 1,300 times its original $666.66 price."
            ),
            new PriceItem(
                    "Leonardo da Vinci's 'Salvator Mundi'",
                    450300000L,
                    "Renaissance Masterpieces",
                    "The famous painting depicting Christ holding a crystal orb, dating to circa 1500.",
                    "🎨",
                    "Sold at Christie's New York for $450.3 Million, the most expensive artwork in human history."
            ),
            new PriceItem(
                    "T-Rex Skeleton 'Stan' (Complete Fossil)",
                    31800000L,
                    "Paleontology",
                    "One of the most complete and best-preserved Tyrannosaurus Rex skeletons ever discovered.",
                    "🦖",
                    "Sold at Christie's in 2020 for $31.8 Million to an Abu Dhabi natural history museum."
            ),
            new PriceItem(
                    "Action Comics #1 (First Superman, 1938)",
                    6000000L,
                    "Rare Comic Books",
                    "CGC 8.5 graded original copy of the comic book that launched the entire superhero genre.",
                    "🦸",
                    "Sold for a world-record $6 Million in April 2024 at Heritage Auctions."
            ),
            new PriceItem(
                    "1963 Ferrari 250 GTO (Chassis 4153 GT)",
                    70000000L,
                    "Collector Supercars",
                    "Tour de France Automobile winner; universally regarded as the Holy Grail of sports cars.",
                    "🏎️",
                    "Purchased privately by WeatherTech founder David MacNeil for $70 Million in 2018."
            ),
            new PriceItem(
                    "Hermès Himalaya Niloticus Crocodile Birkin 30",
                    380000L,
                    "Haute Couture",
                    "A hand-dyed Niloticus crocodile handbag with 18-karat white gold and diamond hardware.",
                    "👜",
                    "Sold at Christie's Hong Kong for $380,000, setting a world record for luxury handbags."
            ),
            new PriceItem(
                    "Napoleon Bonaparte's Iconic Black Bicorne Hat",
                    2100000L,
                    "Historical Relics",
                    "The signature black beaver felt hat worn by Napoleon during his reign as Emperor.",
                    "🎩",
                    "Sold at an auction in Fontainebleau in November 2023 for $2.1 Million."
            ),
            new PriceItem(
                    "Original Nintendo PlayStation Prototype (1991)",
                    360000L,
                    "Gaming Archaeology",
                    "The extremely rare joint Sony-Nintendo CD-ROM console prototype before Sony created PlayStation.",
                    "🕹️",
                    "Discovered in a forgotten company storage box, it was auctioned for $360,000."
            ),
            new PriceItem(
                    "Michael Jordan's 1998 'Last Dance' Finals Game 2 Jersey",
                    10100000L,
                    "Sports Memorabilia",
                    "The iconic red Chicago Bulls jersey worn by Jordan during Game 2 of the 1998 NBA Finals.",
                    "🏀",
                    "Sold at Sotheby's in 2022 for $10.1 Million, the most valuable game-worn sports item ever sold."
            ),
            new PriceItem(
                    "70-Million-Year-Old Oviraptor Dinosaur Egg",
                    420000L,
                    "Fossils",
                    "An intact Cretaceous-era dinosaur egg with embryonic bone structure preserved in stone.",
                    "🥚",
                    "Auctioned at Heritage Auctions for $420,000 to a private European collector."
            )
    );

    private PriceItem currentItem;
    private final Map<String, Long> playerGuesses = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public GuessPriceGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.maxRounds = 3;
    }

    public static Map<String, Object> calculatePriceScore(long guess, long actualPrice) {
        long safeGuess = Math.max(1L, guess);
        long safeActual = Math.max(1L, actualPrice);
        long diff = Math.abs(safeGuess - safeActual);
        double errorRatio = (double) diff / safeActual;

        int pts;
        String verdict;
        if (safeGuess == safeActual) {
            pts = 1500;
            verdict = "EXACT PINPOINT! 🎯";
        } else if (errorRatio <= 0.05) {
            pts = 1000;
            verdict = "BULLSEYE! (Within 5%) 🎯";
        } else if (errorRatio <= 0.20) {
            pts = 800;
            verdict = "SHARP APPRAISER! (Within 20%) ✨";
        } else if (errorRatio <= 0.50) {
            pts = 500;
            verdict = "CLOSE ENOUGH! (Within 50%) 🏷️";
        } else if (errorRatio <= 1.0) {
            pts = 250;
            verdict = "IN THE BALLPARK! (Within 100%) 👍";
        } else {
            pts = 50;
            verdict = "WAY OFF! 🚀";
        }

        return Map.of(
                "points", pts,
                "error_ratio", Math.round(errorRatio * 1000.0) / 1000.0,
                "verdict", verdict
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
        for (int i = 0; i < ITEMS.size(); i++) {
            if (!usedIndices.contains(i)) avail.add(i);
        }
        if (avail.isEmpty()) {
            usedIndices.clear();
            for (int i = 0; i < ITEMS.size(); i++) avail.add(i);
        }

        int idx = avail.get(new Random().nextInt(avail.size()));
        usedIndices.add(idx);
        currentItem = ITEMS.get(idx);

        phase = "GUESS";
        phaseTimer = 30.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "GUESS" -> {
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
        long actual = currentItem != null ? currentItem.actualPrice() : 1000000L;

        for (PlayerInfo p : players.values()) {
            Long guess = playerGuesses.get(p.getId());
            if (guess == null) guess = 0L;

            Map<String, Object> scoreRes = calculatePriceScore(guess, actual);
            int pts = (int) scoreRes.get("points");

            scores.merge(p.getId(), pts, Integer::sum);
            p.setScore(scores.get(p.getId()));

            Map<String, Object> rMap = new LinkedHashMap<>();
            rMap.put("player_id", p.getId());
            rMap.put("nickname", p.getNickname());
            rMap.put("avatar", p.getAvatar());
            rMap.put("color", p.getColor());
            rMap.put("guess", guess);
            rMap.put("actual", actual);
            rMap.put("points_earned", pts);
            rMap.put("error_ratio", scoreRes.get("error_ratio"));
            rMap.put("verdict", scoreRes.get("verdict"));

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

        if ("GUESS".equals(phase) && ("SUBMIT_GUESS".equals(action) || "SUBMIT_PRICE".equals(action) || "LOCK_IN".equals(action))) {
            Object gVal = data.get("guess");
            long val = 0L;
            if (gVal instanceof Number n) {
                val = n.longValue();
            } else if (gVal instanceof String s) {
                try {
                    val = Long.parseLong(s.replaceAll("[^0-9]", ""));
                } catch (NumberFormatException ignored) {}
            }
            val = Math.max(0L, val);
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

        if (currentItem != null) {
            state.put("item_name", currentItem.name());
            state.put("category", currentItem.category());
            state.put("description", currentItem.description());
            state.put("image_icon", currentItem.imageIcon());
            state.put("actual_price", isReveal ? currentItem.actualPrice() : null);
            state.put("fun_fact", isReveal ? currentItem.funFact() : null);
        }

        state.put("submitted_pids", new ArrayList<>(playerGuesses.keySet()));
        state.put("round_results", isReveal ? roundResults : Collections.emptyMap());
        state.put("winner", winner);
        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isReveal = "REVEAL".equals(phase) || isOver;

        if (currentItem != null) {
            state.put("item_name", currentItem.name());
            state.put("category", currentItem.category());
            state.put("description", currentItem.description());
            state.put("image_icon", currentItem.imageIcon());
            state.put("actual_price", isReveal ? currentItem.actualPrice() : null);
            state.put("fun_fact", isReveal ? currentItem.funFact() : null);
        }

        state.put("my_guess", playerGuesses.get(playerId));
        state.put("has_locked", playerGuesses.containsKey(playerId));
        state.put("my_result", isReveal ? roundResults.get(playerId) : null);
        state.put("winner", winner);
        return state;
    }

    public PriceItem getCurrentItem() { return currentItem; }
    public Map<String, Long> getPlayerGuesses() { return playerGuesses; }
}
