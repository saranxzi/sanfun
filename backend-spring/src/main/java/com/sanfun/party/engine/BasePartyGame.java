package com.sanfun.party.engine;

import com.sanfun.party.model.PlayerInfo;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public abstract class BasePartyGame {
    protected final String id;
    protected final String name;
    protected final String tagline;
    protected final String description;
    protected final String icon;
    protected final int minPlayers;
    protected final int maxPlayers;

    protected final String roomCode;
    protected final Map<String, PlayerInfo> players;
    protected final Map<String, Object> roundData = new ConcurrentHashMap<>();
    protected volatile String phase = "INIT";
    protected volatile double phaseTimer = 0.0;
    protected volatile int roundNumber = 1;
    protected volatile int maxRounds = 3;
    protected final Map<String, Integer> scores = new ConcurrentHashMap<>();
    protected volatile boolean isOver = false;

    public BasePartyGame(String id, String name, String tagline, String description, String icon,
                         int minPlayers, int maxPlayers, String roomCode, Map<String, PlayerInfo> players) {
        this.id = id;
        this.name = name;
        this.tagline = tagline;
        this.description = description;
        this.icon = icon;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
        this.roomCode = roomCode;
        this.players = players;

        for (Map.Entry<String, PlayerInfo> entry : players.entrySet()) {
            this.scores.put(entry.getKey(), entry.getValue().getScore());
        }
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getTagline() { return tagline; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public int getMinPlayers() { return minPlayers; }
    public int getMaxPlayers() { return maxPlayers; }
    public String getRoomCode() { return roomCode; }
    public String getPhase() { return phase; }
    public double getPhaseTimer() { return phaseTimer; }
    public int getRoundNumber() { return roundNumber; }
    public int getMaxRounds() { return maxRounds; }
    public Map<String, Integer> getScores() { return scores; }
    public boolean isOver() { return isOver; }

    public abstract void start();

    public abstract Map<String, Object> handleAction(String playerId, String action, Map<String, Object> data);

    public synchronized String tick(double deltaTime) {
        if (this.phaseTimer > 0) {
            this.phaseTimer = Math.max(0.0, this.phaseTimer - deltaTime);
            if (this.phaseTimer == 0.0) {
                return onTimerExpired();
            }
        }
        return null;
    }

    public String onTimerExpired() {
        return null;
    }

    public List<Map<String, Object>> getPublicPlayers() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (PlayerInfo p : players.values()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("nickname", p.getNickname());
            map.put("avatar", p.getAvatar());
            map.put("color", p.getColor());
            map.put("score", scores.getOrDefault(p.getId(), 0));
            map.put("is_connected", p.isConnected());
            list.add(map);
        }
        return list;
    }

    public Map<String, Object> getBaseState() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("game_id", id);
        state.put("room_code", roomCode);
        state.put("phase", phase);
        state.put("phase_timer", Math.round(phaseTimer * 10.0) / 10.0);
        state.put("round_number", roundNumber);
        state.put("max_rounds", maxRounds);
        state.put("is_over", isOver);
        state.put("scores", new LinkedHashMap<>(scores));
        state.put("players", getPublicPlayers());
        return state;
    }

    public abstract Map<String, Object> getHostState();

    public abstract Map<String, Object> getPlayerState(String playerId);

    public void onPlayerDisconnect(String playerId) {
        PlayerInfo p = players.get(playerId);
        if (p != null) {
            p.setConnected(false);
        }
    }

    public void onPlayerReconnect(String playerId) {
        PlayerInfo p = players.get(playerId);
        if (p != null) {
            p.setConnected(true);
        }
    }
}
