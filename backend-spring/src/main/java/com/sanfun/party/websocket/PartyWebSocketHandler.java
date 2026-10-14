package com.sanfun.party.websocket;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanfun.party.model.ClientMessageType;
import com.sanfun.party.model.PlayerInfo;
import com.sanfun.party.model.ServerMessageType;
import com.sanfun.party.service.PartyRoom;
import com.sanfun.party.service.PartyRoomManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class PartyWebSocketHandler extends TextWebSocketHandler {
    private static final Logger log = LoggerFactory.getLogger(PartyWebSocketHandler.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final PartyRoomManager roomManager;

    public PartyWebSocketHandler(PartyRoomManager roomManager) {
        this.roomManager = roomManager;
    }

    private Map<String, String> parseQueryParams(URI uri) {
        Map<String, String> queryParams = new HashMap<>();
        if (uri != null && uri.getRawQuery() != null) {
            String[] pairs = uri.getRawQuery().split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                if (idx > 0) {
                    String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                    String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                    queryParams.put(key, value);
                }
            }
        }
        return queryParams;
    }

    private String extractRoomCode(URI uri) {
        if (uri == null) return null;
        String path = uri.getPath(); // e.g. /api/party/ws/ABCD
        if (path == null) return null;
        String[] parts = path.split("/");
        if (parts.length > 0) {
            return parts[parts.length - 1].toUpperCase().trim();
        }
        return null;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        session.setTextMessageSizeLimit(512 * 1024);
        session.setBinaryMessageSizeLimit(512 * 1024);

        URI uri = session.getUri();
        String code = extractRoomCode(uri);
        Map<String, String> query = parseQueryParams(uri);

        String role = query.getOrDefault("role", "player");
        String hostToken = query.get("host_token");
        String sessionToken = query.get("session_token");
        String nickname = query.get("nickname");
        String avatar = query.get("avatar");
        String color = query.get("color");

        PartyRoom room = roomManager.getRoom(code);
        if (room == null) {
            sendErrorAndClose(session, "Room " + code + " not found.");
            return;
        }

        session.getAttributes().put("room_code", code);
        session.getAttributes().put("role", role);

        if ("host".equalsIgnoreCase(role)) {
            if (hostToken == null || !hostToken.equals(room.getHostToken())) {
                sendErrorAndClose(session, "Unauthorized host token.");
                return;
            }
            room.setHostSocket(session);
            room.touch();

            if ("LOBBY".equals(room.getState())) {
                room.broadcastRoomState();
            } else {
                room.broadcastGameState();
            }

            boolean playAsHost = "true".equalsIgnoreCase(query.get("play_as_host"));
            if (playAsHost) {
                PlayerInfo player = null;
                String activeSessionToken = sessionToken;
                if (sessionToken != null && !sessionToken.isBlank()) {
                    player = room.reconnectPlayer(sessionToken);
                }
                if (player == null) {
                    if (nickname == null || nickname.isBlank()) {
                        nickname = "Host";
                    }
                    String[] outToken = new String[1];
                    player = room.addPlayer(nickname, avatar, color, outToken);
                    activeSessionToken = outToken[0];
                }
                player.setHost(true);
                String pid = player.getId();
                session.getAttributes().put("player_id", pid);
                room.getPlayerSockets().put(pid, session);

                Map<String, Object> welcome = new LinkedHashMap<>();
                welcome.put("player_id", player.getId());
                welcome.put("session_token", activeSessionToken);
                welcome.put("nickname", player.getNickname());
                welcome.put("avatar", player.getAvatar());
                welcome.put("color", player.getColor());
                welcome.put("is_host", true);
                welcome.put("score", player.getScore());
                welcome.put("my_score", player.getScore());
                welcome.put("room_code", room.getCode());
                welcome.put("state", room.getState());
                room.sendJsonSafe(session, ServerMessageType.PLAYER_STATE, welcome);
                room.broadcastRoomState();
            }
        } else {
            room.touch();
            PlayerInfo player = null;
            String activeSessionToken = sessionToken;

            if (sessionToken != null && !sessionToken.isBlank()) {
                player = room.reconnectPlayer(sessionToken);
            }

            if (player == null) {
                if (nickname == null || nickname.isBlank()) {
                    nickname = "Player " + (room.getPlayers().size() + 1);
                }
                String[] outToken = new String[1];
                player = room.addPlayer(nickname, avatar, color, outToken);
                activeSessionToken = outToken[0];
            }

            String pid = player.getId();
            session.getAttributes().put("player_id", pid);
            room.getPlayerSockets().put(pid, session);

            // Send welcome player state with is_host and current cumulative score
            Map<String, Object> welcome = new LinkedHashMap<>();
            welcome.put("player_id", player.getId());
            welcome.put("session_token", activeSessionToken);
            welcome.put("nickname", player.getNickname());
            welcome.put("avatar", player.getAvatar());
            welcome.put("color", player.getColor());
            welcome.put("is_host", player.isHost());
            welcome.put("score", player.getScore());
            welcome.put("room_code", room.getCode());
            welcome.put("state", room.getState());

            room.sendJsonSafe(session, ServerMessageType.PLAYER_STATE, welcome);

            if ("LOBBY".equals(room.getState())) {
                room.broadcastRoomState();
            } else {
                room.broadcastGameState();
            }
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payloadStr = message.getPayload();
        Map<String, Object> data = MAPPER.readValue(payloadStr, new TypeReference<>() {});

        String code = (String) session.getAttributes().get("room_code");
        String role = (String) session.getAttributes().get("role");
        String playerId = (String) session.getAttributes().get("player_id");

        PartyRoom room = roomManager.getRoom(code);
        if (room == null) return;
        room.touch();

        String rawType = (String) data.get("type");
        if (rawType == null) return;
        String msgType = rawType.toUpperCase().trim();
        if (ClientMessageType.PING.name().equals(msgType)) {
            room.sendJsonSafe(session, ServerMessageType.PONG, Collections.emptyMap());
            return;
        }

        if ("host".equalsIgnoreCase(role)) {
            if (session != room.getHostSocket()) return;

            if (ClientMessageType.SELECT_GAME.name().equals(msgType)) {
                String gameId = (String) data.get("game_id");
                if (gameId != null) {
                    room.setSelectedGameId(gameId);
                    room.broadcastRoomState();
                }
            } else if (ClientMessageType.START_GAME.name().equals(msgType)) {
                boolean started = room.startGame();
                if (!started) {
                    room.sendJsonSafe(session, ServerMessageType.ERROR, Map.of("message", "Not enough players to start this game."));
                }
            } else if (ClientMessageType.BACK_TO_LOBBY.name().equals(msgType)) {
                room.backToLobby();
            } else if (ClientMessageType.KICK_PLAYER.name().equals(msgType)) {
                String targetPid = (String) data.get("target_player_id");
                if (targetPid != null) {
                    room.kickPlayer(targetPid);
                }
            } else if (ClientMessageType.PROMOTE_HOST.name().equals(msgType)) {
                String targetPid = (String) data.get("target_player_id");
                if (targetPid != null) {
                    room.promoteHost(targetPid);
                }
            } else if (ClientMessageType.CLEAR_SCORES.name().equals(msgType)) {
                String targetPid = (String) data.get("target_player_id");
                room.clearScores(targetPid);
            } else if (ClientMessageType.UPDATE_SETTINGS.name().equals(msgType)) {
                room.updateSettings(data);
            } else if (ClientMessageType.SKIP_PHASE.name().equals(msgType)) {
                room.skipPhase();
            } else if (ClientMessageType.GAME_ACTION.name().equals(msgType)) {
                if ("IN_GAME".equals(room.getState()) && room.getGameInstance() != null) {
                    String action = (String) data.get("action");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> actionData = (Map<String, Object>) data.getOrDefault("data", Collections.emptyMap());
                    String actingId = ("START_VOTING".equals(action) || "CALL_VOTE".equals(action) || playerId == null) ? "HOST" : playerId;
                    Map<String, Object> res = room.getGameInstance().handleAction(actingId, action, actionData);
                    if (Boolean.TRUE.equals(res.get("broadcast"))) {
                        room.broadcastGameState();
                    }
                    if (res.containsKey("event")) {
                        room.broadcastEvent((String) res.get("event"), res);
                    }
                }
            }
        } else if ("player".equalsIgnoreCase(role) && playerId != null) {
            PlayerInfo pInfo = room.getPlayers().get(playerId);
            if (pInfo != null && pInfo.isHost()) {
                if (ClientMessageType.SELECT_GAME.name().equals(msgType)) {
                    String gameId = (String) data.get("game_id");
                    if (gameId != null) {
                        room.setSelectedGameId(gameId);
                        room.broadcastRoomState();
                    }
                    return;
                } else if (ClientMessageType.START_GAME.name().equals(msgType)) {
                    boolean started = room.startGame();
                    if (!started) {
                        room.sendJsonSafe(session, ServerMessageType.ERROR, Map.of("message", "Not enough players to start this game."));
                    }
                    return;
                } else if (ClientMessageType.BACK_TO_LOBBY.name().equals(msgType)) {
                    room.backToLobby();
                    return;
                } else if (ClientMessageType.KICK_PLAYER.name().equals(msgType)) {
                    String targetPid = (String) data.get("target_player_id");
                    if (targetPid != null) {
                        room.kickPlayer(targetPid);
                    }
                    return;
                } else if (ClientMessageType.PROMOTE_HOST.name().equals(msgType)) {
                    String targetPid = (String) data.get("target_player_id");
                    if (targetPid != null) {
                        room.promoteHost(targetPid);
                    }
                    return;
                } else if (ClientMessageType.CLEAR_SCORES.name().equals(msgType)) {
                    String targetPid = (String) data.get("target_player_id");
                    room.clearScores(targetPid);
                    return;
                } else if (ClientMessageType.UPDATE_SETTINGS.name().equals(msgType)) {
                    room.updateSettings(data);
                    return;
                } else if (ClientMessageType.SKIP_PHASE.name().equals(msgType)) {
                    room.skipPhase();
                    return;
                }
            }

            if (ClientMessageType.GAME_ACTION.name().equals(msgType)) {
                if ("IN_GAME".equals(room.getState()) && room.getGameInstance() != null) {
                    String action = (String) data.get("action");
                    @SuppressWarnings("unchecked")
                    Map<String, Object> actionData = (Map<String, Object>) data.getOrDefault("data", Collections.emptyMap());
                    Map<String, Object> res = room.getGameInstance().handleAction(playerId, action, actionData);

                    if (Boolean.TRUE.equals(res.get("broadcast"))) {
                        room.broadcastGameState();
                    }
                    if (res.containsKey("event")) {
                        room.broadcastEvent((String) res.get("event"), res);
                    }
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String code = (String) session.getAttributes().get("room_code");
        String role = (String) session.getAttributes().get("role");
        String playerId = (String) session.getAttributes().get("player_id");

        PartyRoom room = roomManager.getRoom(code);
        if (room == null) return;
        room.touch();

        if ("host".equalsIgnoreCase(role)) {
            if (session == room.getHostSocket()) {
                room.setHostSocket(null);
            }
            if (playerId != null) {
                room.disconnectPlayer(playerId);
            }
        } else if ("player".equalsIgnoreCase(role) && playerId != null) {
            room.disconnectPlayer(playerId);
        }

        if ("LOBBY".equals(room.getState())) {
            room.broadcastRoomState();
        } else if ("IN_GAME".equals(room.getState())) {
            room.broadcastGameState();
        }
    }

    private void sendErrorAndClose(WebSocketSession session, String message) {
        try {
            Map<String, Object> err = Map.of(
                    "type", ServerMessageType.ERROR.name(),
                    "payload", Map.of("message", message)
            );
            session.sendMessage(new TextMessage(MAPPER.writeValueAsBytes(err)));
            session.close(CloseStatus.POLICY_VIOLATION);
        } catch (IOException ignored) {}
    }
}
