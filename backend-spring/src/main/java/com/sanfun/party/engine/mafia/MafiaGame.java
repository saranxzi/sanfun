package com.sanfun.party.engine.mafia;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class MafiaGame extends BasePartyGame {
    public static final String GAME_ID = "mafia";
    public static final String GAME_NAME = "Mafia";
    public static final String GAME_TAGLINE = "Trust No One. Deceive Everyone.";
    public static final String GAME_DESCRIPTION = "A battle between the cunning Mafia syndicate and the innocent Villagers.";
    public static final String GAME_ICON = "🕵️";
    public static final int MIN_PLAYERS = 4;
    public static final int MAX_PLAYERS = 16;

    public static final String ROLE_MAFIA = "MAFIA";
    public static final String ROLE_DOCTOR = "DOCTOR";
    public static final String ROLE_DETECTIVE = "DETECTIVE";
    public static final String ROLE_VILLAGER = "VILLAGER";

    private final Map<String, String> roles = new ConcurrentHashMap<>();
    private final Set<String> alivePlayers = ConcurrentHashMap.newKeySet();

    // Night actions
    private final Map<String, String> mafiaVotes = new ConcurrentHashMap<>();
    private volatile String doctorTarget = null;
    private volatile String detectiveTarget = null;
    private volatile Map<String, String> detectiveResult = null;

    // Day actions
    private final Map<String, String> dayVotes = new ConcurrentHashMap<>();
    private volatile String lastKilledId = null;
    private volatile String lastKilledRole = null;
    private volatile boolean doctorSaved = false;

    private volatile String winner = null;
    private final List<String> historyLog = new CopyOnWriteArrayList<>();

    public MafiaGame(String roomCode, Map<String, PlayerInfo> players) {
        super(GAME_ID, GAME_NAME, GAME_TAGLINE, GAME_DESCRIPTION, GAME_ICON,
                MIN_PLAYERS, MAX_PLAYERS, roomCode, players);
        alivePlayers.addAll(players.keySet());
    }

    @Override
    public synchronized void start() {
        List<String> playerIds = new ArrayList<>(players.keySet());
        Collections.shuffle(playerIds);
        int n = playerIds.size();

        int numMafia = (n <= 5) ? 1 : ((n <= 8) ? 2 : 3);
        for (int i = 0; i < n; i++) {
            String pid = playerIds.get(i);
            if (i < numMafia) {
                roles.put(pid, ROLE_MAFIA);
            } else if (i == numMafia) {
                roles.put(pid, ROLE_DOCTOR);
            } else if (i == numMafia + 1) {
                roles.put(pid, ROLE_DETECTIVE);
            } else {
                roles.put(pid, ROLE_VILLAGER);
            }
        }

        phase = "ROLE_REVEAL";
        phaseTimer = 12.0;
        historyLog.add("The game begins. Roles have been secretly assigned.");
    }

    @Override
    public synchronized String onTimerExpired() {
        switch (phase) {
            case "ROLE_REVEAL" -> {
                startNight();
                return phase;
            }
            case "NIGHT_ACTIONS" -> {
                resolveNight();
                return phase;
            }
            case "DAY_DAWN" -> {
                if (checkWinCondition()) {
                    phase = "GAME_OVER";
                    return phase;
                }
                phase = "DAY_DISCUSS";
                phaseTimer = 45.0;
                return phase;
            }
            case "DAY_DISCUSS" -> {
                phase = "DAY_VOTE";
                phaseTimer = 35.0;
                dayVotes.clear();
                return phase;
            }
            case "DAY_VOTE" -> {
                resolveDayVote();
                return phase;
            }
            case "DAY_EXECUTION" -> {
                if (checkWinCondition()) {
                    phase = "GAME_OVER";
                    return phase;
                }
                startNight();
                return phase;
            }
            default -> {
                return null;
            }
        }
    }

    private void startNight() {
        phase = "NIGHT_ACTIONS";
        phaseTimer = 30.0;
        mafiaVotes.clear();
        doctorTarget = null;
        detectiveTarget = null;
        detectiveResult = null;
        historyLog.add("Night " + roundNumber + " falls upon the village.");
    }

    private boolean checkNightComplete() {
        Set<String> aliveConn = new HashSet<>();
        for (String pid : alivePlayers) {
            PlayerInfo p = players.get(pid);
            if (p != null && p.isConnected()) {
                aliveConn.add(pid);
            }
        }

        long aliveMafia = aliveConn.stream().filter(pid -> ROLE_MAFIA.equals(roles.get(pid))).count();
        long aliveDoctor = aliveConn.stream().filter(pid -> ROLE_DOCTOR.equals(roles.get(pid))).count();
        long aliveDetective = aliveConn.stream().filter(pid -> ROLE_DETECTIVE.equals(roles.get(pid))).count();

        boolean mafiaDone = mafiaVotes.size() >= aliveMafia;
        boolean doctorDone = (aliveDoctor == 0) || (doctorTarget != null);
        boolean detectiveDone = (aliveDetective == 0) || (detectiveTarget != null);

        return mafiaDone && doctorDone && detectiveDone;
    }

    private void resolveNight() {
        String mafiaTarget = null;
        if (!mafiaVotes.isEmpty()) {
            Map<String, Integer> counts = new HashMap<>();
            for (String tgt : mafiaVotes.values()) {
                counts.put(tgt, counts.getOrDefault(tgt, 0) + 1);
            }
            mafiaTarget = counts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
        }

        doctorSaved = false;
        if (mafiaTarget != null) {
            if (mafiaTarget.equals(doctorTarget)) {
                doctorSaved = true;
                lastKilledId = null;
                lastKilledRole = null;
                historyLog.add("The Doctor intervened and saved the victim tonight!");
            } else {
                alivePlayers.remove(mafiaTarget);
                lastKilledId = mafiaTarget;
                lastKilledRole = roles.get(mafiaTarget);
                PlayerInfo victim = players.get(mafiaTarget);
                String victimName = victim != null ? victim.getNickname() : "Unknown";
                historyLog.add(victimName + " was eliminated by the Mafia.");
            }
        } else {
            lastKilledId = null;
            lastKilledRole = null;
        }

        phase = "DAY_DAWN";
        phaseTimer = 10.0;
    }

    private void resolveDayVote() {
        Map<String, Integer> tally = new HashMap<>();
        for (String tgt : dayVotes.values()) {
            if (!"SKIP".equals(tgt)) {
                tally.put(tgt, tally.getOrDefault(tgt, 0) + 1);
            }
        }

        String eliminatedId = null;
        if (!tally.isEmpty()) {
            List<Map.Entry<String, Integer>> sorted = new ArrayList<>(tally.entrySet());
            sorted.sort((a, b) -> b.getValue().compareTo(a.getValue()));

            if (sorted.size() > 1 && sorted.get(0).getValue().equals(sorted.get(1).getValue())) {
                eliminatedId = null; // Tie
            } else {
                eliminatedId = sorted.get(0).getKey();
            }
        }

        if (eliminatedId != null) {
            alivePlayers.remove(eliminatedId);
            lastKilledId = eliminatedId;
            lastKilledRole = roles.get(eliminatedId);
            PlayerInfo p = players.get(eliminatedId);
            String name = p != null ? p.getNickname() : "Unknown";
            historyLog.add("Town executed " + name + " (" + lastKilledRole + ").");
        } else {
            lastKilledId = null;
            lastKilledRole = null;
            historyLog.add("Town could not reach a majority consensus. No one was executed.");
        }

        phase = "DAY_EXECUTION";
        phaseTimer = 8.0;
        roundNumber++;
    }

    public Map<String, String> getRoles() { return roles; }
    public Set<String> getAlivePlayers() { return alivePlayers; }
    public Map<String, String> getDayVotes() { return dayVotes; }
    public String getLastKilledId() { return lastKilledId; }
    public List<String> getHistoryLog() { return historyLog; }
    public void setPhase(String phase) { this.phase = phase; }
    public void resolveDayVoteForTest() { resolveDayVote(); }

    private boolean checkWinCondition() {
        List<String> aliveMafia = new ArrayList<>();
        List<String> aliveTown = new ArrayList<>();

        for (String pid : alivePlayers) {
            if (ROLE_MAFIA.equals(roles.get(pid))) {
                aliveMafia.add(pid);
            } else {
                aliveTown.add(pid);
            }
        }

        if (aliveMafia.isEmpty()) {
            winner = "TOWN";
            isOver = true;
            for (String pid : players.keySet()) {
                if (!ROLE_MAFIA.equals(roles.get(pid))) {
                    scores.put(pid, scores.getOrDefault(pid, 0) + 250);
                }
            }
            return true;
        } else if (aliveMafia.size() >= aliveTown.size()) {
            winner = "MAFIA";
            isOver = true;
            for (String pid : players.keySet()) {
                if (ROLE_MAFIA.equals(roles.get(pid))) {
                    scores.put(pid, scores.getOrDefault(pid, 0) + 300);
                }
            }
            return true;
        }
        return false;
    }

    @Override
    public synchronized Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data) {
        if (data == null) data = Collections.emptyMap();

        if ("START_VOTING".equals(action) || "CALL_VOTE".equals(action)) {
            if ("DAY_DISCUSSION".equals(phase) || "ROLE_REVEAL".equals(phase)) {
                dayVotes.clear();
                phase = "DAY_VOTE";
                phaseTimer = 30.0;
                return Map.of("broadcast", true, "event", "PHASE_CHANGE", "new_phase", "DAY_VOTE");
            }
            return Map.of("status", "ignored");
        }

        if (!alivePlayers.contains(playerId) && !"PING".equals(action) && !"HOST".equals(playerId)) {
            return Map.of("error", "Eliminated players cannot take actions.");
        }

        String role = roles.get(playerId);

        if ("NIGHT_ACTIONS".equals(phase)) {
            String targetId = (String) data.get("target_id");

            if (ROLE_MAFIA.equals(role) && "MAFIA_KILL".equals(action)) {
                if (targetId != null && alivePlayers.contains(targetId) && !ROLE_MAFIA.equals(roles.get(targetId))) {
                    mafiaVotes.put(playerId, targetId);
                    if (checkNightComplete()) {
                        resolveNight();
                    }
                    return Map.of("broadcast", true);
                }
            } else if (ROLE_DOCTOR.equals(role) && "DOCTOR_HEAL".equals(action)) {
                if (targetId != null && alivePlayers.contains(targetId)) {
                    doctorTarget = targetId;
                    if (checkNightComplete()) {
                        resolveNight();
                    }
                    return Map.of("broadcast", true);
                }
            } else if (ROLE_DETECTIVE.equals(role) && "DETECTIVE_INVESTIGATE".equals(action)) {
                if (targetId != null && alivePlayers.contains(targetId) && !targetId.equals(playerId)) {
                    detectiveTarget = targetId;
                    String targetRole = roles.get(targetId);
                    String alignment = ROLE_MAFIA.equals(targetRole) ? "SUSPICIOUS (Mafia)" : "INNOCENT (Town)";
                    PlayerInfo targetInfo = players.get(targetId);
                    detectiveResult = Map.of(
                            "target_id", targetId,
                            "target_name", targetInfo != null ? targetInfo.getNickname() : targetId,
                            "alignment", alignment
                    );
                    if (checkNightComplete()) {
                        resolveNight();
                    }
                    return Map.of("broadcast", true);
                }
            }
        } else if ("DAY_VOTE".equals(phase) && "CAST_VOTE".equals(action)) {
            String targetId = (String) data.get("target_id");
            if ("SKIP".equals(targetId) || (targetId != null && alivePlayers.contains(targetId) && !targetId.equals(playerId))) {
                dayVotes.put(playerId, targetId);
                long aliveConnected = alivePlayers.stream()
                        .filter(pid -> players.get(pid) != null && players.get(pid).isConnected())
                        .count();
                if (dayVotes.size() >= aliveConnected) {
                    resolveDayVote();
                }
                return Map.of("broadcast", true);
            }
        }

        return Map.of("status", "ignored");
    }

    @Override
    public Map<String, Object> getHostState() {
        Map<String, Object> state = getBaseState();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> publicPlayers = (List<Map<String, Object>>) state.get("players");
        for (Map<String, Object> p : publicPlayers) {
            String pid = (String) p.get("id");
            p.put("is_alive", alivePlayers.contains(pid));
            p.put("role_revealed", (isOver || !alivePlayers.contains(pid)) ? roles.get(pid) : null);
        }

        PlayerInfo lastKilled = lastKilledId != null ? players.get(lastKilledId) : null;
        state.put("winner", winner);
        state.put("last_killed_name", lastKilled != null ? lastKilled.getNickname() : null);
        state.put("last_killed_role", lastKilledRole);
        state.put("doctor_saved", doctorSaved);
        state.put("history_log", historyLog.subList(Math.max(0, historyLog.size() - 5), historyLog.size()));
        state.put("alive_count", alivePlayers.size());
        state.put("votes_cast_count", "DAY_VOTE".equals(phase) ? dayVotes.size() : null);

        return state;
    }

    @Override
    public Map<String, Object> getPlayerState(String playerId) {
        boolean isAlive = alivePlayers.contains(playerId);
        String role = roles.getOrDefault(playerId, ROLE_VILLAGER);

        List<Map<String, Object>> aliveCandidates = new ArrayList<>();
        for (Map.Entry<String, PlayerInfo> entry : players.entrySet()) {
            String pid = entry.getKey();
            if (alivePlayers.contains(pid) && !pid.equals(playerId)) {
                aliveCandidates.add(Map.of(
                        "id", pid,
                        "nickname", entry.getValue().getNickname(),
                        "avatar", entry.getValue().getAvatar()
                ));
            }
        }

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("game_id", id);
        state.put("phase", phase);
        state.put("phase_timer", Math.round(phaseTimer * 10.0) / 10.0);
        state.put("is_alive", isAlive);
        state.put("my_role", role);
        state.put("score", scores.getOrDefault(playerId, 0));

        if (ROLE_MAFIA.equals(role)) {
            List<String> teammates = new ArrayList<>();
            for (Map.Entry<String, String> entry : roles.entrySet()) {
                if (ROLE_MAFIA.equals(entry.getValue()) && !entry.getKey().equals(playerId)) {
                    PlayerInfo p = players.get(entry.getKey());
                    if (p != null) teammates.add(p.getNickname());
                }
            }
            state.put("mafia_teammates", teammates);

            Map<String, String> voteNames = new HashMap<>();
            for (Map.Entry<String, String> entry : mafiaVotes.entrySet()) {
                PlayerInfo voter = players.get(entry.getKey());
                PlayerInfo tgt = players.get(entry.getValue());
                if (voter != null && tgt != null) {
                    voteNames.put(voter.getNickname(), tgt.getNickname());
                }
            }
            state.put("mafia_votes", voteNames);
        }

        if (ROLE_DETECTIVE.equals(role) && detectiveResult != null) {
            state.put("detective_result", detectiveResult);
        }

        if ("NIGHT_ACTIONS".equals(phase) && isAlive) {
            if (ROLE_MAFIA.equals(role)) {
                state.put("night_action", "MAFIA_KILL");
                List<Map<String, Object>> nonMafia = aliveCandidates.stream()
                        .filter(c -> !ROLE_MAFIA.equals(roles.get((String) c.get("id"))))
                        .toList();
                state.put("candidates", nonMafia);
                state.put("my_vote", mafiaVotes.get(playerId));
            } else if (ROLE_DOCTOR.equals(role)) {
                state.put("night_action", "DOCTOR_HEAL");
                List<Map<String, Object>> allAlive = new ArrayList<>();
                for (Map.Entry<String, PlayerInfo> entry : players.entrySet()) {
                    if (alivePlayers.contains(entry.getKey())) {
                        allAlive.add(Map.of(
                                "id", entry.getKey(),
                                "nickname", entry.getValue().getNickname(),
                                "avatar", entry.getValue().getAvatar()
                        ));
                    }
                }
                state.put("candidates", allAlive);
                state.put("my_heal", doctorTarget);
            } else if (ROLE_DETECTIVE.equals(role)) {
                state.put("night_action", "DETECTIVE_INVESTIGATE");
                state.put("candidates", aliveCandidates);
            } else {
                state.put("night_action", "SLEEP");
            }
        } else if ("DAY_VOTE".equals(phase) && isAlive) {
            state.put("candidates", aliveCandidates);
            state.put("my_vote", dayVotes.get(playerId));
        }

        return state;
    }
}
