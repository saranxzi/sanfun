package com.sanfun.party;

import com.sanfun.party.model.PlayerInfo;
import com.sanfun.party.service.NetworkDiscoveryService;
import com.sanfun.party.service.PartyRoom;
import com.sanfun.party.service.PartyRoomManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
    void testStartGameMinPlayersValidation() {
        PartyRoom room = roomManager.createRoom();
        room.setSelectedGameId("mafia"); // min players 4

        // 0 players -> cannot start
        assertFalse(room.startGame());

        // 3 players -> cannot start
        room.addPlayer("P1", null, null, null);
        room.addPlayer("P2", null, null, null);
        room.addPlayer("P3", null, null, null);
        assertFalse(room.startGame());

        // 4 players -> starts successfully
        room.addPlayer("P4", null, null, null);
        assertTrue(room.startGame());
        assertEquals("IN_GAME", room.getState());
        assertNotNull(room.getGameInstance());

        // Back to lobby
        room.backToLobby();
        assertEquals("LOBBY", room.getState());
        assertNull(room.getGameInstance());
    }
}
