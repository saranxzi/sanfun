package com.sanfun.party.engine;

import com.sanfun.party.engine.circle.CircleGame;
import com.sanfun.party.engine.dialed.DialedGame;
import com.sanfun.party.engine.fermi.FermiGame;
import com.sanfun.party.engine.imposter.ImposterGame;
import com.sanfun.party.engine.mafia.MafiaGame;
import com.sanfun.party.engine.price.GuessPriceGame;
import com.sanfun.party.engine.rather.WouldYouRatherGame;
import com.sanfun.party.engine.trends.TrendsGame;
import com.sanfun.party.model.GameMetadataDTO;
import com.sanfun.party.model.PlayerInfo;

import java.util.*;

public class GameFactory {

    private static final List<GameMetadataDTO> AVAILABLE_GAMES = List.of(
            new GameMetadataDTO(MafiaGame.GAME_ID, MafiaGame.GAME_NAME, MafiaGame.GAME_TAGLINE, MafiaGame.GAME_DESCRIPTION, MafiaGame.GAME_ICON, MafiaGame.MIN_PLAYERS, MafiaGame.MAX_PLAYERS),
            new GameMetadataDTO(ImposterGame.GAME_ID, ImposterGame.GAME_NAME, ImposterGame.GAME_TAGLINE, ImposterGame.GAME_DESCRIPTION, ImposterGame.GAME_ICON, ImposterGame.MIN_PLAYERS, ImposterGame.MAX_PLAYERS),
            new GameMetadataDTO(DialedGame.GAME_ID, DialedGame.GAME_NAME, DialedGame.GAME_TAGLINE, DialedGame.GAME_DESCRIPTION, DialedGame.GAME_ICON, DialedGame.MIN_PLAYERS, DialedGame.MAX_PLAYERS),
            new GameMetadataDTO(FermiGame.GAME_ID, FermiGame.GAME_NAME, FermiGame.GAME_TAGLINE, FermiGame.GAME_DESCRIPTION, FermiGame.GAME_ICON, FermiGame.MIN_PLAYERS, FermiGame.MAX_PLAYERS),
            new GameMetadataDTO(GuessPriceGame.GAME_ID, GuessPriceGame.GAME_NAME, GuessPriceGame.GAME_TAGLINE, GuessPriceGame.GAME_DESCRIPTION, GuessPriceGame.GAME_ICON, GuessPriceGame.MIN_PLAYERS, GuessPriceGame.MAX_PLAYERS),
            new GameMetadataDTO(CircleGame.GAME_ID, CircleGame.GAME_NAME, CircleGame.GAME_TAGLINE, CircleGame.GAME_DESCRIPTION, CircleGame.GAME_ICON, CircleGame.MIN_PLAYERS, CircleGame.MAX_PLAYERS),
            new GameMetadataDTO(WouldYouRatherGame.GAME_ID, WouldYouRatherGame.GAME_NAME, WouldYouRatherGame.GAME_TAGLINE, WouldYouRatherGame.GAME_DESCRIPTION, WouldYouRatherGame.GAME_ICON, WouldYouRatherGame.MIN_PLAYERS, WouldYouRatherGame.MAX_PLAYERS),
            new GameMetadataDTO(TrendsGame.GAME_ID, TrendsGame.GAME_NAME, TrendsGame.GAME_TAGLINE, TrendsGame.GAME_DESCRIPTION, TrendsGame.GAME_ICON, TrendsGame.MIN_PLAYERS, TrendsGame.MAX_PLAYERS)
    );

    public static List<GameMetadataDTO> getAvailableGames() {
        return AVAILABLE_GAMES;
    }

    public static Optional<GameMetadataDTO> getGameMetadata(String gameId) {
        if (gameId == null) return Optional.empty();
        String gid = gameId.toLowerCase().trim();
        if ("auction".equals(gid)) gid = GuessPriceGame.GAME_ID;
        if ("trolley".equals(gid)) gid = WouldYouRatherGame.GAME_ID;
        final String searchId = gid;
        return AVAILABLE_GAMES.stream().filter(g -> g.id().equalsIgnoreCase(searchId)).findFirst();
    }

    public static BasePartyGame createGame(String gameId, String roomCode, Map<String, PlayerInfo> players, List<String> recentImposters) {
        return switch (gameId.toLowerCase().trim()) {
            case MafiaGame.GAME_ID -> new MafiaGame(roomCode, players);
            case ImposterGame.GAME_ID -> new ImposterGame(roomCode, players, recentImposters);
            case DialedGame.GAME_ID -> new DialedGame(roomCode, players);
            case FermiGame.GAME_ID -> new FermiGame(roomCode, players);
            case GuessPriceGame.GAME_ID, "auction" -> new GuessPriceGame(roomCode, players);
            case CircleGame.GAME_ID -> new CircleGame(roomCode, players);
            case WouldYouRatherGame.GAME_ID, "trolley" -> new WouldYouRatherGame(roomCode, players);
            case TrendsGame.GAME_ID -> new TrendsGame(roomCode, players);
            default -> throw new IllegalArgumentException("Unknown game id: " + gameId);
        };
    }
}
