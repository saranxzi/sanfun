package com.sanfun.party.engine.imposter;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class ImposterGame extends BasePartyGame {
    public static final String GAME_ID = "imposter";
    public static final String GAME_NAME = "Find the Imposter";
    public static final String GAME_TAGLINE = "Spot the Chameleon Among You.";
    public static final String GAME_DESCRIPTION = "One player is the Imposter who doesn't know the secret word. Can the crew catch them before they blend in?";
    public static final String GAME_ICON = "🦎";
    public static final int MIN_PLAYERS = 3;
    public static final int MAX_PLAYERS = 16;

    public record WordPair(String word, String vagueHint, String hint) {}

    public static final Map<String, List<WordPair>> WORD_PACKS = Map.of(
            "Locations & Travel", List.of(
                    new WordPair("Airport", "Transit & Flights", "A bustling transit hub with runways, terminals, and security checkpoints."),
                    new WordPair("Hospital", "Medical & Healing", "A medical facility with emergency rooms, doctors, and operating theaters."),
                    new WordPair("Space Station", "Orbit & Zero Gravity", "An orbital research facility floating high above Earth in zero gravity."),
                    new WordPair("Submarine", "Deep Sea Navigation", "A naval vessel engineered to submerge and navigate deep underwater."),
                    new WordPair("Casino", "Luck & High Stakes", "An entertainment venue filled with roulette wheels, slot machines, and card tables."),
                    new WordPair("Cruise Ship", "Ocean Voyage & Resorts", "A massive luxury ocean liner with pools, buffets, and cabins."),
                    new WordPair("Amusement Park", "Thrills & Rides", "An outdoor recreation center with roller coasters, games, and cotton candy."),
                    new WordPair("Art Museum", "Gallery & Masterpieces", "A quiet cultural gallery displaying paintings, sculptures, and historical artifacts."),
                    new WordPair("Pirate Ship", "High Seas & Galleons", "A wooden sailing vessel with skull flags, cannons, and wooden decks."),
                    new WordPair("Movie Theater", "Screenings & Popcorn", "A darkened auditorium with plush seating, surround sound, and a giant screen."),
                    new WordPair("Public Library", "Books & Quiet Study", "A quiet sanctuary packed with bookshelves, study desks, and librarians."),
                    new WordPair("Subway Station", "Commuting & Metro", "An underground transit platform with turnstiles, tracks, and arriving trains.")
            ),
            "Animals & Wildlife", List.of(
                    new WordPair("Penguin", "Polar Seabird", "A flightless bird equipped with flippers and a tuxedo-like coat in cold regions."),
                    new WordPair("Chameleon", "Camouflage Reptile", "A color-shifting reptile known for camouflage and independently moving eyes."),
                    new WordPair("Kangaroo", "Australian Marsupial", "A hopping Australian marsupial with powerful hind legs and a pouch."),
                    new WordPair("Great White Shark", "Ocean Apex Predator", "An apex ocean predator with rows of serrated teeth and a dorsal fin."),
                    new WordPair("Platypus", "Odd Semi-Aquatic Mammal", "An Australian semi-aquatic mammal featuring a duck-like bill and webbed feet."),
                    new WordPair("Cheetah", "Fast Savannah Hunter", "The fastest land animal on earth, characterized by black tear stripes and spots."),
                    new WordPair("Octopus", "Eight-Armed Invertebrate", "A highly intelligent sea creature with eight flexible arms and an ink defense."),
                    new WordPair("Flamingo", "Pink Wading Bird", "A tall pink wading bird often seen balancing gracefully on a single leg."),
                    new WordPair("Bald Eagle", "Bird of Prey & Talons", "A majestic bird of prey with a white head, sharp talons, and a hooked yellow beak."),
                    new WordPair("Sloth", "Slow Tree Climber", "An extremely slow tree-dwelling tropical mammal that spends life hanging upside down.")
            ),
            "Food & Dining", List.of(
                    new WordPair("Sushi", "Raw Fish & Rolls", "A Japanese delicacy composed of vinegared rice paired with raw fish and seaweed."),
                    new WordPair("Pizza", "Baked Crust & Toppings", "An oven-baked flatbread crust traditionally topped with melted mozzarella and tomato sauce."),
                    new WordPair("Tacos", "Tortilla & Street Food", "A folded corn or flour tortilla packed with seasoned meat, cilantro, onions, and salsa."),
                    new WordPair("Espresso", "Strong Roasted Brew", "A concentrated shot of rich coffee brewed by forcing near-boiling water through grounds."),
                    new WordPair("Croissant", "Flaky French Pastry", "A buttery, crescent-shaped French pastry famous for its flaky golden layers."),
                    new WordPair("Ice Cream Sundae", "Cold Sweet Dessert", "A dessert of cold scoops topped with hot fudge, whipped cream, and a cherry."),
                    new WordPair("Ramen", "Hot Savory Broth Noodles", "A steaming Japanese noodle soup served in rich broth with scallions and sliced pork."),
                    new WordPair("Cheeseburger", "Grilled Patty on Bun", "A grilled ground beef patty topped with melted cheese nestled in a sesame bun."),
                    new WordPair("Chocolate Fondue", "Warm Melted Dipping Treat", "A pot of melted warm chocolate used for dipping fruit and marshmallows.")
            ),
            "Video Games & Tech", List.of(
                    new WordPair("Minecraft", "Block Crafting & Mining", "A blockbuster sandbox game where players mine blocky resources and build worlds."),
                    new WordPair("Super Mario", "Platforming Plumber", "The Nintendo hero who stomps Goombas, eats mushrooms, and rescues Princess Peach."),
                    new WordPair("Pokemon", "Monster Collecting & Battles", "A creature-catching adventure where trainers collect monsters in capsules."),
                    new WordPair("Tetris", "Falling Block Puzzles", "A legendary puzzle game where falling geometric tetromino blocks must be cleared."),
                    new WordPair("Pac-Man", "Maze Chasing & Dots", "An arcade icon who navigates blue mazes eating dots while fleeing four ghosts."),
                    new WordPair("Virtual Reality Headset", "Head-Mounted 3D Display", "A wearable display unit that immerses vision and senses in a 3D digital world."),
                    new WordPair("Drone", "Flying Remote Quadcopter", "An unmanned aerial quadcopter controlled remotely with cameras for photography."),
                    new WordPair("Smartwatch", "Wrist Wearable Computer", "A wearable wristwatch computer that tracks fitness metrics and notifications."),
                    new WordPair("Cybersecurity Hacker", "Code & Network Infiltration", "A digital specialist who tests, penetrates, or defends networks.")
            )
    );

    private final List<String> recentImposters;
    private final List<String> imposterIds = new ArrayList<>();
    private String category = "";
    private String secretWord = "";
    private String vagueHint = "";
    private String wordHint = "";
    private final List<String> clueOrder = new ArrayList<>();
    private final Map<String, String> votes = new ConcurrentHashMap<>();
    private volatile String votedOutId = null;
    private volatile String imposterGuess = null;
    private volatile boolean imposterGuessCorrect = false;
    private volatile String winner = null;

    public ImposterGame(String roomCode, Map<String, PlayerInfo> players, List<String> recentImposters) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        this.recentImposters = recentImposters != null ? new ArrayList<>(recentImposters) : new ArrayList<>();
    }

    public List<String> getImposterIds() {
        return imposterIds;
    }

    @Override
    public synchronized void start() {
        List<String> pids = new ArrayList<>(players.keySet());

        List<String> eligible = new ArrayList<>();
        for (String pid : pids) {
            if (!recentImposters.contains(pid)) {
                eligible.add(pid);
            }
        }
        if (eligible.isEmpty()) {
            String lastImp = !recentImposters.isEmpty() ? recentImposters.get(recentImposters.size() - 1) : null;
            for (String pid : pids) {
                if (!pid.equals(lastImp)) {
                    eligible.add(pid);
                }
            }
            if (eligible.isEmpty()) eligible.addAll(pids);
        }

        Collections.shuffle(eligible);
        int numImposters = (pids.size() < 7) ? 1 : 2;
        for (int i = 0; i < Math.min(numImposters, eligible.size()); i++) {
            imposterIds.add(eligible.get(i));
        }
        if (imposterIds.size() < numImposters) {
            List<String> rem = new ArrayList<>(pids);
            rem.removeAll(imposterIds);
            Collections.shuffle(rem);
            for (int i = 0; i < numImposters - imposterIds.size() && i < rem.size(); i++) {
                imposterIds.add(rem.get(i));
            }
        }

        clueOrder.addAll(pids);
        Collections.shuffle(clueOrder);

        if (clueOrder.size() > 2 && imposterIds.contains(clueOrder.get(0))) {
            int swapIdx = 1 + new Random().nextInt(clueOrder.size() - 1);
            Collections.swap(clueOrder, 0, swapIdx);
        }

        List<String> categories = new ArrayList<>(WORD_PACKS.keySet());
        category = categories.get(new Random().nextInt(categories.size()));
        List<WordPair> pairs = WORD_PACKS.get(category);
        WordPair chosen = pairs.get(new Random().nextInt(pairs.size()));
        secretWord = chosen.word();
        vagueHint = chosen.vagueHint();
        wordHint = chosen.hint();

        phase = "WORD_REVEAL";
        phaseTimer = 10.0;
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "WORD_REVEAL" -> {
                phase = "CLUE_ROUNDS";
                phaseTimer = 75.0;
                return phase;
            }
            case "CLUE_ROUNDS" -> {
                phase = "VOTING";
                phaseTimer = 30.0;
                votes.clear();
                return phase;
            }
            case "VOTING" -> {
                resolveVoting();
                return phase;
            }
            case "IMPOSTER_GUESS" -> {
                resolveGuess();
                return phase;
            }
            default -> {
                return null;
            }
        }
    }

    private void resolveVoting() {
        Map<String, Integer> tally = new HashMap<>();
        for (String target : votes.values()) {
            tally.put(target, tally.getOrDefault(target, 0) + 1);
        }

        if (!tally.isEmpty()) {
            List<Map.Entry<String, Integer>> sorted = new ArrayList<>(tally.entrySet());
            sorted.sort((a, b) -> b.getValue().compareTo(a.getValue()));

            if (sorted.size() > 1 && sorted.get(0).getValue().equals(sorted.get(1).getValue())) {
                votedOutId = null;
            } else {
                votedOutId = sorted.get(0).getKey();
            }
        } else {
            votedOutId = null;
        }

        if (votedOutId != null && imposterIds.contains(votedOutId)) {
            phase = "IMPOSTER_GUESS";
            phaseTimer = 18.0;
        } else {
            winner = "IMPOSTER";
            for (String imp : imposterIds) {
                scores.put(imp, scores.getOrDefault(imp, 0) + 300);
            }
            phase = "GAME_OVER";
            isOver = true;
        }
    }

    private void resolveGuess() {
        if (imposterGuess != null && imposterGuess.trim().equalsIgnoreCase(secretWord)) {
            imposterGuessCorrect = true;
            winner = "IMPOSTER";
            for (String imp : imposterIds) {
                scores.put(imp, scores.getOrDefault(imp, 0) + 400);
            }
        } else {
            imposterGuessCorrect = false;
            winner = "CREW";
            for (String pid : players.keySet()) {
                if (!imposterIds.contains(pid)) {
                    scores.put(pid, scores.getOrDefault(pid, 0) + 200);
                }
            }
        }

        phase = "GAME_OVER";
        isOver = true;
    }

    @Override
    public synchronized void onPlayerDisconnect(String playerId) {
        super.onPlayerDisconnect(playerId);
        if (imposterIds.contains(playerId) && !isOver && !"INIT".equals(phase) && !"GAME_OVER".equals(phase)) {
            boolean hasConnectedImposter = false;
            for (String imp : imposterIds) {
                PlayerInfo p = players.get(imp);
                if (p != null && p.isConnected()) {
                    hasConnectedImposter = true;
                    break;
                }
            }
            if (!hasConnectedImposter) {
                phase = "GAME_OVER";
                isOver = true;
                winner = "CREW";
            }
        }
    }

    public String getSecretWord() { return secretWord; }
    public String getWinner() { return winner; }
    public Map<String, String> getVotes() { return votes; }
    public String getVotedOutId() { return votedOutId; }
    public void setPhase(String phase) { this.phase = phase; }
    public void resolveVotingForTest() { resolveVoting(); }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("START_VOTING".equals(action) || "CALL_VOTE".equals(action)) {
            if ("CLUE_ROUNDS".equals(phase) || "WORD_REVEAL".equals(phase)) {
                phase = "VOTING";
                phaseTimer = 30.0;
                return Map.of("broadcast", true, "event", "PHASE_CHANGE", "new_phase", "VOTING");
            }
            return Map.of("status", "ignored");
        }

        if ("VOTING".equals(phase) && "CAST_VOTE".equals(action)) {
            String targetId = (String) data.get("target_id");
            if (targetId != null && players.containsKey(targetId) && !targetId.equals(playerId)) {
                votes.put(playerId, targetId);
                long connectedCount = players.values().stream().filter(PlayerInfo::isConnected).count();
                if (votes.size() >= connectedCount) {
                    resolveVoting();
                }
                return Map.of("broadcast", true);
            }
        } else if ("IMPOSTER_GUESS".equals(phase) && ("GUESS_WORD".equals(action) || "SUBMIT_GUESS".equals(action))) {
            if (imposterIds.contains(playerId)) {
                imposterGuess = (String) data.getOrDefault("guess", "");
                resolveGuess();
                return Map.of("broadcast", true);
            }
        }

        return Map.of("status", "ignored");
    }

    private List<String> getCandidateWords() {
        List<WordPair> pairs = WORD_PACKS.get(category);
        if (pairs == null) return Collections.emptyList();
        return pairs.stream().map(WordPair::word).toList();
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> publicPlayers = (List<Map<String, Object>>) state.get("players");
        for (Map<String, Object> p : publicPlayers) {
            String pid = (String) p.get("id");
            p.put("is_imposter", isOver ? imposterIds.contains(pid) : null);
        }

        List<String> orderNames = new ArrayList<>();
        for (String pid : clueOrder) {
            PlayerInfo p = players.get(pid);
            if (p != null) orderNames.add(p.getNickname());
        }

        PlayerInfo votedOut = votedOutId != null ? players.get(votedOutId) : null;

        state.put("category", category);
        state.put("secret_word", isOver ? secretWord : null);
        state.put("clue_order", orderNames);
        state.put("voted_out_name", votedOut != null ? votedOut.getNickname() : null);
        state.put("voted_out_was_imposter", votedOutId != null ? imposterIds.contains(votedOutId) : null);
        state.put("imposter_guess", imposterGuess);
        state.put("imposter_guess_correct", imposterGuessCorrect);
        state.put("winner", winner);
        state.put("candidate_words", getCandidateWords());

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        boolean isImposter = imposterIds.contains(playerId);

        List<Map<String, Object>> candidates = new ArrayList<>();
        for (Map.Entry<String, PlayerInfo> entry : players.entrySet()) {
            if (!entry.getKey().equals(playerId)) {
                candidates.add(Map.of(
                        "id", entry.getKey(),
                        "nickname", entry.getValue().getNickname(),
                        "avatar", entry.getValue().getAvatar()
                ));
            }
        }

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("game_id", id);
        state.put("phase", phase);
        state.put("phase_timer", Math.round(phaseTimer * 10.0) / 10.0);
        state.put("category", category);
        state.put("is_imposter", isImposter);
        state.put("secret_word", isImposter ? "???" : secretWord);
        state.put("imposter_hint", isImposter ? vagueHint : null);
        state.put("vague_hint", isImposter ? vagueHint : null);
        state.put("candidates", candidates);
        state.put("my_vote", votes.get(playerId));
        state.put("candidate_words", getCandidateWords());
        state.put("score", scores.getOrDefault(playerId, 0));

        return state;
    }
}
