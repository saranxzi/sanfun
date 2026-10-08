package com.sanfun.party.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PartyRoomManager {
    private static final Logger log = LoggerFactory.getLogger(PartyRoomManager.class);
    private static final String ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private final Map<String, PartyRoom> rooms = new ConcurrentHashMap<>();
    private final NetworkDiscoveryService networkDiscoveryService;
    private final SecureRandom random = new SecureRandom();

    private long lastTickTime = System.currentTimeMillis();
    private long tickCount = 0;

    public PartyRoomManager(NetworkDiscoveryService networkDiscoveryService) {
        this.networkDiscoveryService = networkDiscoveryService;
    }

    public Map<String, PartyRoom> getRooms() {
        return rooms;
    }

    public String generateRoomCode() {
        for (int i = 0; i < 100; i++) {
            StringBuilder sb = new StringBuilder(4);
            for (int j = 0; j < 4; j++) {
                sb.append(ROOM_CODE_CHARS.charAt(random.nextInt(ROOM_CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!rooms.containsKey(code)) {
                return code;
            }
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase();
    }

    public PartyRoom createRoom() {
        String code = generateRoomCode();
        PartyRoom room = new PartyRoom(code, networkDiscoveryService);
        rooms.put(code, room);
        return room;
    }

    public PartyRoom getRoom(String code) {
        if (code == null) return null;
        return rooms.get(code.toUpperCase().trim());
    }

    public void removeRoom(String code) {
        if (code != null) {
            rooms.remove(code.toUpperCase().trim());
        }
    }

    public void broadcastToAllLobbies() {
        for (PartyRoom room : rooms.values()) {
            if ("LOBBY".equals(room.getState())) {
                room.broadcastRoomState();
            }
        }
    }

    @Scheduled(fixedRate = 500)
    public void runTick() {
        long now = System.currentTimeMillis();
        double dt = Math.min((now - lastTickTime) / 1000.0, 2.0);
        lastTickTime = now;
        tickCount++;

        // Prune abandoned rooms every 60 ticks (~30s)
        if (tickCount % 60 == 0) {
            long maxAge = 3600 * 1000L;
            long maxEmptyAge = 900 * 1000L;
            rooms.entrySet().removeIf(entry -> {
                PartyRoom r = entry.getValue();
                long inactive = now - r.getLastActiveAt();
                boolean hasSockets = (r.getHostSocket() != null && r.getHostSocket().isOpen()) ||
                        r.getPlayerSockets().values().stream().anyMatch(s -> s != null && s.isOpen());
                return inactive > maxAge || (!hasSockets && inactive > maxEmptyAge);
            });
        }

        for (PartyRoom room : rooms.values()) {
            try {
                if ("IN_GAME".equals(room.getState()) && room.getGameInstance() != null) {
                    String trans = room.getGameInstance().tick(dt);
                    if (trans != null) {
                        room.broadcastGameState();
                        room.broadcastEvent("PHASE_CHANGE", Map.of("new_phase", trans));
                    } else if (tickCount % 2 == 0) {
                        room.broadcastTimerTick(Math.round(room.getGameInstance().getPhaseTimer() * 10.0) / 10.0);
                    }
                }
            } catch (Exception e) {
                log.error("Error ticking room {}: {}", room.getCode(), e.getMessage());
            }
        }
    }
}
