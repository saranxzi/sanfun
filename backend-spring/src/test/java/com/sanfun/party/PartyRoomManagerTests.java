package com.sanfun.party;

import com.sanfun.party.model.PlayerInfo;
import com.sanfun.party.service.NetworkDiscoveryService;
import com.sanfun.party.service.PartyRoom;
import com.sanfun.party.service.PartyRoomManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PartyRoomManagerTests {

    private PartyRoomManager roomManager;
    private NetworkDiscoveryService networkDiscoveryService;

    @BeforeEach
    void setUp() {
        networkDiscoveryService = new NetworkDiscoveryService();
        roomManager = new PartyRoomManager(networkDiscoveryService);
    }

    @Test
    void testRoomCreationAndCodeLookup() {
        PartyRoom room = roomManager.createRoom();
        assertNotNull(room);
        assertNotNull(room.getCode());
        assertEquals(4, room.getCode().length());

        PartyRoom found = roomManager.getRoom(room.getCode());
        assertSame(room, found);

        PartyRoom foundLower = roomManager.getRoom(room.getCode().toLowerCase());
        assertSame(room, foundLower);
    }

    @Test
    void testAddAndReconnectPlayer() {
        PartyRoom room = roomManager.createRoom();
        String[] tokenHolder = new String[1];
        PlayerInfo player = room.addPlayer("Alice", "🦊", "#E25241", tokenHolder);

        assertNotNull(player);
        assertEquals("Alice", player.getNickname());
        assertNotNull(tokenHolder[0]);
        assertTrue(player.isConnected());

        // Disconnect
        room.disconnectPlayer(player.getId());
        assertFalse(player.isConnected());

        // Reconnect via session token
        PlayerInfo reconnected = room.reconnectPlayer(tokenHolder[0]);
        assertNotNull(reconnected);
        assertTrue(reconnected.isConnected());
        assertEquals("Alice", reconnected.getNickname());

        // Bad session token reconnect returns null
        assertNull(room.reconnectPlayer("invalid_token_999"));
    }

    @Test
    void testPromoteHost() {
        PartyRoom room = roomManager.createRoom();
        PlayerInfo p1 = room.addPlayer("Alice", "🦊", "#E25241", new String[1]);
        PlayerInfo p2 = room.addPlayer("Bob", "🐼", "#2B6CB0", new String[1]);

        assertFalse(p1.isHost());
        assertFalse(p2.isHost());

        room.promoteHost(p1.getId());
        assertTrue(p1.isHost());
        assertFalse(p2.isHost());

        room.promoteHost(p2.getId());
        assertFalse(p1.isHost());
        assertTrue(p2.isHost());
    }

    @Test
    void testKickPlayerRemovesFromRosterAndTokens() {
        PartyRoom room = roomManager.createRoom();
        String[] tok1 = new String[1];
        String[] tok2 = new String[1];
        PlayerInfo p1 = room.addPlayer("Alice", "🦊", "#E25241", tok1);
        PlayerInfo p2 = room.addPlayer("Bob", "🐼", "#2B6CB0", tok2);

        assertEquals(2, room.getPlayers().size());

        room.kickPlayer(p1.getId());
        assertEquals(1, room.getPlayers().size());
        assertFalse(room.getPlayers().containsKey(p1.getId()));

        // Token must be invalidated
        assertNull(room.reconnectPlayer(tok1[0]));
        // Bob's token still valid
        assertNotNull(room.reconnectPlayer(tok2[0]));
    }

    @Test
    void testStartGameMinPlayersValidationAndBackToLobbyScores() {
        PartyRoom room = roomManager.createRoom();
        room.setSelectedGameId("dialed"); // min players 2

        // 0 players -> cannot start
        assertFalse(room.startGame());

        // 1 player -> cannot start
        PlayerInfo p1 = room.addPlayer("Alice", null, null, null);
        assertFalse(room.startGame());

        // 2 players -> starts successfully
        PlayerInfo p2 = room.addPlayer("Bob", null, null, null);
        assertTrue(room.startGame());
        assertEquals("IN_GAME", room.getState());
        assertNotNull(room.getGameInstance());

        // Award in-game scores
        room.getGameInstance().getScores().put(p1.getId(), 850);
        room.getGameInstance().getScores().put(p2.getId(), 620);

        // Transition back to lobby
        room.backToLobby();
        assertEquals("LOBBY", room.getState());
        assertNull(room.getGameInstance());

        // Cumulative scores preserved on PlayerInfo
        assertEquals(850, room.getPlayers().get(p1.getId()).getScore());
        assertEquals(620, room.getPlayers().get(p2.getId()).getScore());
    }

    @Test
    void testHostTokenAuthorization() {
        PartyRoom room = roomManager.createRoom();
        assertNotNull(room.getHostToken());
        assertTrue(room.getHostToken().length() > 16);
    }
}
