package com.sanfun.party.engine.auction;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class AuctionGame extends BasePartyGame {
    public static final String GAME_ID = "auction";
    public static final String GAME_NAME = "The Auction House";
    public static final String GAME_TAGLINE = "Bid on priceless art, ancient fossils, and bizarre oddities";
    public static final String GAME_DESCRIPTION = "Inspect the catalog, submit your secret valuation, and win the lot without exceeding the hammer price.";
    public static final String GAME_ICON = "🏛️";
    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 16;

    public record AuctionItem(String title, String category, String description, long hammerPrice, String fact, String icon) {}

    public static final List<AuctionItem> ITEMS = List.of(
            new AuctionItem("Salvator Mundi by Leonardo da Vinci", "Masterpiece Art", "Lost portrait of Christ holding a crystal orb, restored before a Christie's record showdown.", 450300000L, "Sold in 2017 for $450.3 Million, remaining the most expensive painting ever sold at public auction.", "🖼️"),
            new AuctionItem("'Stan' the Tyrannosaurus Rex Skeleton", "Prehistoric Artifact", "One of the most complete T-Rex specimens ever excavated, containing 188 fossilized bones.", 31800000L, "Hammered down at Christie's in 2020 for $31.8 Million after an intense 20-minute bidding war.", "🦖"),
            new AuctionItem("Action Comics #1 (CGC 8.5)", "Pop Culture Relic", "The landmark 1938 comic book featuring the very first appearance of Superman.", 6000000L, "Sold in 2024 for an eye-watering $6.0 Million, becoming the most valuable comic book in human history.", "🦸"),
            new AuctionItem("1963 Ferrari 250 GTO (Chassis 4153GT)", "Automotive Legend", "Iconic silver-and-yellow Tour de France winning supercar, one of only 36 ever manufactured in Maranello.", 70000000L, "Sold in private auction for approximately $70 Million to WeatherTech founder David MacNeil.", "🏎️"),
            new AuctionItem("Sealed 4GB First-Generation iPhone (2007)", "Tech Artifact", "Factory-sealed in original plastic shrink-wrap, the ultra-rare 4GB launch edition discontinued after two months.", 190372L, "Hammered at LCG Auctions for $190,372 in 2023, nearly 400x its original retail price of $499.", "📱"),
            new AuctionItem("Kurt Cobain's MTV Unplugged Acoustic Guitar", "Music History", "The 1959 Martin D-18E played during Nirvana's historic 1993 MTV Unplugged in New York performance.", 6010000L, "Sold in 2020 for $6.01 Million to RØDE Microphones founder Peter Freedman.", "🎸"),
            new AuctionItem("Michael Jordan's 1998 NBA Finals Game 2 Jersey", "Sports Memorabilia", "The red Chicago Bulls away jersey worn during Game 2 of Jordan's legendary 'Last Dance' finals series.", 10100000L, "Hammered at Sotheby's in 2022 for $10.1 Million, setting an all-time record for sports apparel.", "🏀"),
            new AuctionItem("Original 1968 Prototype Apple-1 Computer (Steve Jobs)", "Tech History", "Hand-soldered by Steve Wozniak on a 'Celebration' PCB, used by Steve Jobs to demonstrate to The Byte Shop.", 677196L, "Sold at RR Auction in Boston in 2022 for $677,196.", "💻"),
            new AuctionItem("Maurizio Cattelan's 'Comedian' (Banana Duct-Taped to Wall)", "Contemporary Art", "A fresh banana affixed to a white gallery wall with silver duct tape, accompanied by certificate.", 6240000L, "Hammered at Sotheby's New York in 2024 for $6.24 Million to cryptocurrency entrepreneur Justin Sun.", "🍌")
    );

    private AuctionItem currentItem;
    private final Map<String, Long> playerBids = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> roundResults = new ConcurrentHashMap<>();
    private final List<Integer> usedIndices = new ArrayList<>();
    private volatile String winner = null;

    public AuctionGame(String roomCode, Map<String, PlayerInfo> players) {
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
        playerBids.clear();
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

        phase = "CATALOG";
        phaseTimer = 8.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "CATALOG" -> {
                phase = "BIDDING";
                phaseTimer = 25.0;
                return phase;
            }
            case "BIDDING" -> {
                resolveRound();
                phase = "HAMMER";
                phaseTimer = 12.0;
                return phase;
            }
            case "HAMMER" -> {
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
        long actual = currentItem.hammerPrice();

        Map<String, Long> underBids = new HashMap<>();
        for (Map.Entry<String, Long> entry : playerBids.entrySet()) {
            if (entry.getValue() <= actual && entry.getValue() > 0) {
                underBids.put(entry.getKey(), entry.getValue());
            }
        }

        String bestUnderPid = underBids.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        String closestPid = playerBids.entrySet().stream()
                .min(Comparator.comparingLong(e -> Math.abs(e.getValue() - actual)))
                .map(Map.Entry::getKey)
                .orElse(null);

        for (String pid : players.keySet()) {
            long bid = playerBids.getOrDefault(pid, 0L);
            boolean wentOver = bid > actual;
            boolean wonLot = (pid.equals(bestUnderPid)) || (underBids.isEmpty() && pid.equals(closestPid));

            int pts = 0;
            if (wonLot) {
                pts += !wentOver ? 800 : 400;
            }

            if (bid > 0) {
                double diffPct = (double) Math.abs(bid - actual) / actual;
                if (diffPct <= 0.10) {
                    pts += 400;
                } else if (diffPct <= 0.25) {
                    pts += 200;
                }
            }

            scores.put(pid, scores.getOrDefault(pid, 0) + pts);
            roundResults.put(pid, Map.of(
                    "bid", bid,
                    "won_lot", wonLot,
                    "went_over", wentOver,
                    "points", pts
            ));
        }
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("BIDDING".equals(phase) && ("SUBMIT_BID".equals(action) || "PLACE_BID".equals(action))) {
            long bid = 0L;
            Object bVal = data.get("bid");
            if (bVal instanceof Number n) {
                bid = Math.max(0L, n.longValue());
            } else if (bVal instanceof String s) {
                try {
                    bid = Math.max(0L, Long.parseLong(s));
                } catch (NumberFormatException ignored) {}
            }

            playerBids.put(playerId, bid);

            long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
            if (playerBids.size() >= connectedCount) {
                resolveRound();
                phase = "HAMMER";
                phaseTimer = 12.0;
            }
            return Map.of("broadcast", true);
        }
        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();
        boolean isHammer = "HAMMER".equals(phase) || isOver;

        state.put("item_title", currentItem != null ? currentItem.title() : null);
        state.put("item_category", currentItem != null ? currentItem.category() : null);
        state.put("item_description", currentItem != null ? currentItem.description() : null);
        state.put("item_icon", currentItem != null ? currentItem.icon() : null);
        state.put("hammer_price", isHammer && currentItem != null ? currentItem.hammerPrice() : null);
        state.put("fact", isHammer && currentItem != null ? currentItem.fact() : null);
        state.put("submitted_pids", new ArrayList<>(playerBids.keySet()));
        state.put("round_results", isHammer ? roundResults : Collections.emptyMap());
        state.put("winner", winner);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        Map<String, Object> state = getBaseState();
        boolean isHammer = "HAMMER".equals(phase) || isOver;

        state.put("item_title", currentItem != null ? currentItem.title() : null);
        state.put("item_category", currentItem != null ? currentItem.category() : null);
        state.put("item_description", currentItem != null ? currentItem.description() : null);
        state.put("item_icon", currentItem != null ? currentItem.icon() : null);
        state.put("hammer_price", isHammer && currentItem != null ? currentItem.hammerPrice() : null);
        state.put("my_bid", playerBids.get(playerId));
        state.put("has_bid", playerBids.containsKey(playerId));
        state.put("my_result", isHammer ? roundResults.get(playerId) : null);
        state.put("winner", winner);

        return state;
    }
}
