package com.sanfun.party.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sanfun.party.engine.GameFactory;
import com.sanfun.party.model.GameMetadataDTO;
import com.sanfun.party.model.NetworkInfo;
import com.sanfun.party.service.NetworkDiscoveryService;
import com.sanfun.party.service.PartyRoom;
import com.sanfun.party.service.PartyRoomManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class PartyRestController {

    private final PartyRoomManager roomManager;
    private final NetworkDiscoveryService networkDiscoveryService;

    public PartyRestController(PartyRoomManager roomManager, NetworkDiscoveryService networkDiscoveryService) {
        this.roomManager = roomManager;
        this.networkDiscoveryService = networkDiscoveryService;
    }

    public record CreateRoomResponse(
            @JsonProperty("room_code") String roomCode,
            @JsonProperty("host_token") String hostToken,
            @JsonProperty("network_info") NetworkInfo networkInfo,
            @JsonProperty("available_games") List<GameMetadataDTO> availableGames
    ) {}

    public record RegisterTunnelRequest(
            @JsonProperty("tunnel_url") String tunnelUrl
    ) {}

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/api/party/host-info")
    public NetworkInfo getHostInfo() {
        return networkDiscoveryService.getNetworkInfo();
    }

    @GetMapping("/api/party/games")
    public List<GameMetadataDTO> getGames() {
        return GameFactory.getAvailableGames();
    }

    @PostMapping("/api/party/create")
    public CreateRoomResponse createRoom() {
        PartyRoom room = roomManager.createRoom();
        return new CreateRoomResponse(
                room.getCode(),
                room.getHostToken(),
                networkDiscoveryService.getNetworkInfo(),
                GameFactory.getAvailableGames()
        );
    }

    @GetMapping("/api/party/room/{code}")
    public ResponseEntity<?> inspectRoom(@PathVariable String code) {
        PartyRoom room = roomManager.getRoom(code);
        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("detail", "Room not found"));
        }
        return ResponseEntity.ok(Map.of(
                "exists", true,
                "room_code", room.getCode(),
                "state", room.getState(),
                "player_count", room.getPlayers().size(),
                "selected_game_id", room.getSelectedGameId()
        ));
    }

    @PostMapping("/api/party/tunnel")
    public Map<String, Object> registerTunnel(@RequestBody RegisterTunnelRequest request) {
        networkDiscoveryService.setTunnelUrl(request.tunnelUrl());
        roomManager.broadcastToAllLobbies();
        return Map.of(
                "status", "ok",
                "tunnel_url", request.tunnelUrl()
        );
    }
}
