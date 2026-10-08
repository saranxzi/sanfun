package com.sanfun.party.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.engine.GameFactory;
import com.sanfun.party.model.GameMetadataDTO;
import com.sanfun.party.model.PlayerInfo;
import com.sanfun.party.model.ServerMessageType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class PartyRoom {
    private static final Logger log = LoggerFactory.getLogger(PartyRoom.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static final List<String> AVATARS = List.of("🦊", "🐼", "🦁", "🐯", "🐨", "🐸", "🐙", "🦄", "🤖", "👾", "🦖", "🚀");
    public static final List<String> COLORS = List.of("#E25241", "#F5A623", "#2B6CB0", "#2A9D8F", "#8E44AD", "#FF8E72", "#10b981", "#06b6d4");

    private final String code;
    private final String hostToken;
    private volatile WebSocketSession hostSocket;
    private final Map<String, PlayerInfo> players = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> playerSockets = new ConcurrentHashMap<>();
    private final Map<String, String> sessionTokens = new ConcurrentHashMap<>(); // sessionToken -> playerId

    private volatile String selectedGameId = "mafia";
    private volatile BasePartyGame gameInstance;
    private volatile String state = "LOBBY"; // LOBBY | IN_GAME
    private final List<String> recentImposters = new CopyOnWriteArrayList<>();
    private final long createdAt = System.currentTimeMillis();
    private volatile long lastActiveAt = System.currentTimeMillis();

    private final NetworkDiscoveryService networkDiscoveryService;

    public PartyRoom(String code, NetworkDiscoveryService networkDiscoveryService) {
        this.code = code;
        this.hostToken = UUID.randomUUID().toString().replace("-", "");
        this.networkDiscoveryService = networkDiscoveryService;
    }

    public String getCode() { return code; }
    public String getHostToken() { return hostToken; }
    public WebSocketSession getHostSocket() { return hostSocket; }
    public void setHostSocket(WebSocketSession hostSocket) { this.hostSocket = hostSocket; }
    public Map<String, PlayerInfo> getPlayers() { return players; }
    public Map<String, WebSocketSession> getPlayerSockets() { return playerSockets; }
    public String getSelectedGameId() { return selectedGameId; }
    public void setSelectedGameId(String selectedGameId) { this.selectedGameId = selectedGameId; }
    public BasePartyGame getGameInstance() { return gameInstance; }
    public String getState() { return state; }
    public long getLastActiveAt() { return lastActiveAt; }

    public void touch() {
        this.lastActiveAt = System.currentTimeMillis();
    }

    public List<Map<String, Object>> getPublicPlayers() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (PlayerInfo p : players.values()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("nickname", p.getNickname());
            map.put("avatar", p.getAvatar());
            map.put("color", p.getColor());
            map.put("is_host", p.isHost());
            map.put("is_connected", p.isConnected());
            map.put("score", p.getScore());
            list.add(map);
        }
        return list;
    }

    public Map<String, Object> getLobbyState() {
        Map<String, Object> lobby = new LinkedHashMap<>();
        lobby.put("room_code", code);
        lobby.put("state", state);
        lobby.put("selected_game_id", selectedGameId);
        lobby.put("available_games", GameFactory.getAvailableGames());
        lobby.put("players", getPublicPlayers());
        lobby.put("player_count", players.size());
        lobby.put("host_connected", hostSocket != null && hostSocket.isOpen());
        lobby.put("network_info", networkDiscoveryService.getNetworkInfo());
        return lobby;
    }

    public void sendJsonSafe(WebSocketSession session, ServerMessageType msgType, Map<String, Object> payload) {
        if (session == null || !session.isOpen()) return;
        try {
            Map<String, Object> msg = Map.of(
                    "type", msgType.name(),
                    "payload", payload
            );
            byte[] bytes = MAPPER.writeValueAsBytes(msg);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(bytes));
                }
            }
        } catch (IOException e) {
            log.debug("Error sending websocket message to session: {}", e.getMessage());
        }
    }

    public void broadcastAll(ServerMessageType msgType, Map<String, Object> payload) {
        if (hostSocket != null && hostSocket.isOpen()) {
            sendJsonSafe(hostSocket, msgType, payload);
        }
        for (WebSocketSession s : playerSockets.values()) {
            if (s != null && s.isOpen()) {
                sendJsonSafe(s, msgType, payload);
            }
        }
    }

    public void broadcastRoomState() {
        broadcastAll(ServerMessageType.ROOM_STATE, getLobbyState());
    }

    public void broadcastGameState() {
        if (gameInstance == null) return;

        // 1. Host Screen projection (Never reveals secret roles during hidden phases)
        if (hostSocket != null && hostSocket.isOpen()) {
            Map<String, Object> hostState = new LinkedHashMap<>(gameInstance.getHostState());
            hostState.put("room_code", code);
            hostState.put("state", state);
            sendJsonSafe(hostSocket, ServerMessageType.ROOM_STATE, hostState);
        }

        // 2. Each Player (Strict Role-Masking!)
        for (Map.Entry<String, WebSocketSession> entry : playerSockets.entrySet()) {
            String pid = entry.getKey();
            WebSocketSession session = entry.getValue();
            PlayerInfo pInfo = players.get(pid);
            if (pInfo != null && session != null && session.isOpen()) {
                Map<String, Object> playerState = new LinkedHashMap<>(gameInstance.getPlayerState(pid));
                playerState.put("room_code", code);
                playerState.put("state", state);
                playerState.put("player_id", pid);
                playerState.put("nickname", pInfo.getNickname());
                playerState.put("avatar", pInfo.getAvatar());
                playerState.put("color", pInfo.getColor());
                sendJsonSafe(session, ServerMessageType.PLAYER_STATE, playerState);
            }
        }
    }

    public void broadcastTimerTick(double phaseTimer) {
        broadcastAll(ServerMessageType.TIMER_TICK, Map.of("phase_timer", phaseTimer));
    }

    public void broadcastEvent(String eventName, Map<String, Object> eventData) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", eventName);
        if (eventData != null) {
            payload.putAll(eventData);
        }
        broadcastAll(ServerMessageType.GAME_EVENT, payload);
    }

    public synchronized boolean startGame() {
        Optional<GameMetadataDTO> metaOpt = GameFactory.getGameMetadata(selectedGameId);
        if (metaOpt.isEmpty() || players.size() < metaOpt.get().minPlayers()) {
            return false;
        }

        // Persist previous scores if needed
        if (gameInstance != null) {
            for (Map.Entry<String, Integer> e : gameInstance.getScores().entrySet()) {
                PlayerInfo p = players.get(e.getKey());
                if (p != null) p.setScore(e.getValue());
            }
        }

        gameInstance = GameFactory.createGame(selectedGameId, code, players, recentImposters);
        gameInstance.start();

        if (gameInstance instanceof com.sanfun.party.engine.imposter.ImposterGame impGame) {
            for (String imp : impGame.getImposterIds()) {
                if (!recentImposters.contains(imp)) {
                    recentImposters.add(imp);
                }
            }
            while (recentImposters.size() > players.size()) {
                recentImposters.remove(0);
            }
        }

        state = "IN_GAME";
        broadcastGameState();
        broadcastEvent("GAME_STARTED", Map.of("game_id", selectedGameId));
        return true;
    }

    public synchronized void backToLobby() {
        if (gameInstance != null) {
            for (Map.Entry<String, Integer> e : gameInstance.getScores().entrySet()) {
                PlayerInfo p = players.get(e.getKey());
                if (p != null) p.setScore(e.getValue());
            }
        }
        state = "LOBBY";
        gameInstance = null;

        // 1. Broadcast ROOM_STATE
        broadcastRoomState();

        // 2. Broadcast updated PLAYER_STATE to each player socket
        for (Map.Entry<String, WebSocketSession> entry : playerSockets.entrySet()) {
            String pid = entry.getKey();
            WebSocketSession session = entry.getValue();
            PlayerInfo pInfo = players.get(pid);
            if (session != null && session.isOpen()) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("room_code", code);
                payload.put("state", "LOBBY");
                payload.put("game_id", null);
                payload.put("phase", "LOBBY");
                payload.put("phase_timer", 0);
                payload.put("player_id", pid);
                payload.put("nickname", pInfo != null ? pInfo.getNickname() : "");
                payload.put("avatar", pInfo != null ? pInfo.getAvatar() : "🎮");
                payload.put("color", pInfo != null ? pInfo.getColor() : "#E25241");
                payload.put("is_host", pInfo != null && pInfo.isHost());
                payload.put("score", pInfo != null ? pInfo.getScore() : 0);
                sendJsonSafe(session, ServerMessageType.PLAYER_STATE, payload);
            }
        }

        // 3. Broadcast GAME_EVENT for both BACK_TO_LOBBY and RETURN_TO_LOBBY
        broadcastEvent("BACK_TO_LOBBY", Collections.emptyMap());
        broadcastEvent("RETURN_TO_LOBBY", Collections.emptyMap());
    }

    public synchronized PlayerInfo addPlayer(String nickname, String avatar, String color, String[] sessionTokenOut) {
        String pid = "p_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String sessionToken = UUID.randomUUID().toString().replace("-", "");

        Random rng = new Random();
        String assignedAvatar = (avatar != null && !avatar.isBlank()) ? avatar : AVATARS.get(rng.nextInt(AVATARS.size()));
        String assignedColor = (color != null && !color.isBlank()) ? color : COLORS.get(players.size() % COLORS.size());

        String sanitizedNick = nickname != null ? nickname.trim() : "Player";
        if (sanitizedNick.length() > 16) sanitizedNick = sanitizedNick.substring(0, 16);

        PlayerInfo player = new PlayerInfo(
                pid,
                sanitizedNick,
                assignedAvatar,
                assignedColor,
                false,
                true,
                0
        );

        players.put(pid, player);
        sessionTokens.put(sessionToken, pid);
        if (sessionTokenOut != null && sessionTokenOut.length > 0) {
            sessionTokenOut[0] = sessionToken;
        }
        return player;
    }

    public synchronized PlayerInfo reconnectPlayer(String sessionToken) {
        String pid = sessionTokens.get(sessionToken);
        if (pid != null && players.containsKey(pid)) {
            PlayerInfo p = players.get(pid);
            p.setConnected(true);
            if (gameInstance != null) {
                gameInstance.onPlayerReconnect(pid);
            }
            return p;
        }
        return null;
    }

    public synchronized void disconnectPlayer(String pid) {
        PlayerInfo p = players.get(pid);
        if (p != null) {
            p.setConnected(false);
            playerSockets.remove(pid);
            if (gameInstance != null) {
                gameInstance.onPlayerDisconnect(pid);
            }
        }
    }

    public synchronized void kickPlayer(String pid) {
        WebSocketSession session = playerSockets.remove(pid);
        PlayerInfo p = players.remove(pid);
        sessionTokens.entrySet().removeIf(e -> e.getValue().equals(pid));

        if (gameInstance != null) {
            gameInstance.onPlayerDisconnect(pid);
        }

        if (session != null && session.isOpen()) {
            sendJsonSafe(session, ServerMessageType.ERROR, Map.of("message", "You were removed from the room by the host."));
            try {
                session.close();
            } catch (IOException ignored) {}
        }

        broadcastRoomState();
        if (p != null) {
            broadcastEvent("PLAYER_KICKED", Map.of("player_id", pid, "nickname", p.getNickname()));
        }
    }

    public synchronized void promoteHost(String targetPid) {
        if (players.containsKey(targetPid)) {
            for (Map.Entry<String, PlayerInfo> e : players.entrySet()) {
                e.getValue().setHost(e.getKey().equals(targetPid));
            }
            PlayerInfo targetPlayer = players.get(targetPid);
            WebSocketSession targetSession = playerSockets.get(targetPid);
            if (targetSession != null && targetSession.isOpen()) {
                sendJsonSafe(targetSession, ServerMessageType.GAME_EVENT, Map.of(
                        "event", "PROMOTED_TO_HOST",
                        "host_token", hostToken,
                        "target_player_id", targetPid,
                        "nickname", targetPlayer.getNickname()
                ));
            }
            broadcastRoomState();
            broadcastEvent("HOST_PROMOTED", Map.of(
                    "target_player_id", targetPid,
                    "nickname", targetPlayer.getNickname()
            ));
        }
    }
}
