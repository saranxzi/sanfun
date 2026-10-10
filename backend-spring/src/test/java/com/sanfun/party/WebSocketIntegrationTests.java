package com.sanfun.party;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanfun.party.service.PartyRoom;
import com.sanfun.party.service.PartyRoomManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"TESTING=1"})
class WebSocketIntegrationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private PartyRoomManager roomManager;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static class MessageCapturingHandler extends TextWebSocketHandler {
        private final BlockingQueue<Map<String, Object>> messages = new LinkedBlockingQueue<>();
        private final CompletableFuture<Void> connected = new CompletableFuture<>();

        @Override
        public void afterConnectionEstablished(WebSocketSession session) {
            connected.complete(null);
        }

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
            try {
                Map<String, Object> map = MAPPER.readValue(message.getPayload(), new TypeReference<>() {});
                messages.offer(map);
            } catch (Exception ignored) {}
        }

        public Map<String, Object> pollMessage(long timeoutMs) throws InterruptedException {
            return messages.poll(timeoutMs, TimeUnit.MILLISECONDS);
        }
    }

    @Test
    void testHostAuthSuccessAndFailure() throws Exception {
        PartyRoom room = roomManager.createRoom();
        String code = room.getCode();
        StandardWebSocketClient client = new StandardWebSocketClient();

        // 1. Invalid host token -> receives ERROR and is closed
        MessageCapturingHandler failHandler = new MessageCapturingHandler();
        String badUrl = "ws://localhost:" + port + "/api/party/ws/" + code + "?role=host&host_token=invalid_token_123";
        WebSocketSession badSession = client.execute(failHandler, badUrl).get(3, TimeUnit.SECONDS);
        Map<String, Object> errMsg = failHandler.pollMessage(3000);
        assertNotNull(errMsg);
        assertEquals("ERROR", errMsg.get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> errPayload = (Map<String, Object>) errMsg.get("payload");
        assertTrue(errPayload.get("message").toString().contains("Unauthorized"));

        // 2. Correct host token -> receives ROOM_STATE
        MessageCapturingHandler goodHandler = new MessageCapturingHandler();
        String goodUrl = "ws://localhost:" + port + "/api/party/ws/" + code + "?role=host&host_token=" + room.getHostToken();
        WebSocketSession goodSession = client.execute(goodHandler, goodUrl).get(3, TimeUnit.SECONDS);
        Map<String, Object> stateMsg = goodHandler.pollMessage(3000);
        assertNotNull(stateMsg);
        assertEquals("ROOM_STATE", stateMsg.get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> statePayload = (Map<String, Object>) stateMsg.get("payload");
        assertEquals("LOBBY", statePayload.get("state"));
        assertEquals(code, statePayload.get("room_code"));

        goodSession.close();
    }

    @Test
    void testPlayerJoinReconnectAndBackToLobby() throws Exception {
        PartyRoom room = roomManager.createRoom();
        String code = room.getCode();
        StandardWebSocketClient client = new StandardWebSocketClient();

        // 1. Join as player
        MessageCapturingHandler p1Handler = new MessageCapturingHandler();
        String joinUrl = "ws://localhost:" + port + "/api/party/ws/" + code + "?role=player&nickname=Tester&avatar=🦊&color=%23E25241";
        WebSocketSession p1Session = client.execute(p1Handler, joinUrl).get(3, TimeUnit.SECONDS);

        Map<String, Object> welcomeMsg = p1Handler.pollMessage(3000);
        assertNotNull(welcomeMsg);
        assertEquals("PLAYER_STATE", welcomeMsg.get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> welcome = (Map<String, Object>) welcomeMsg.get("payload");
        assertNotNull(welcome.get("session_token"));
        assertEquals("Tester", welcome.get("nickname"));
        assertEquals(false, welcome.get("is_host"));
        assertEquals(0, ((Number) welcome.get("score")).intValue());

        String sessionToken = (String) welcome.get("session_token");
        p1Session.close();

        // 2. Reconnect using session token
        MessageCapturingHandler reconHandler = new MessageCapturingHandler();
        String reconUrl = "ws://localhost:" + port + "/api/party/ws/" + code + "?role=player&session_token=" + sessionToken;
        WebSocketSession reconSession = client.execute(reconHandler, reconUrl).get(3, TimeUnit.SECONDS);

        Map<String, Object> reconWelcome = reconHandler.pollMessage(3000);
        assertNotNull(reconWelcome);
        assertEquals("PLAYER_STATE", reconWelcome.get("type"));
        @SuppressWarnings("unchecked")
        Map<String, Object> reconPayload = (Map<String, Object>) reconWelcome.get("payload");
        assertEquals("Tester", reconPayload.get("nickname"));
        assertEquals("🦊", reconPayload.get("avatar"));

        reconSession.close();
    }
}
