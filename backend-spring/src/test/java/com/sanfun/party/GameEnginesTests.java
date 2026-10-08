package com.sanfun.party;

import com.sanfun.party.engine.BasePartyGame;
import com.sanfun.party.engine.GameFactory;
import com.sanfun.party.engine.circle.CircleGame;
import com.sanfun.party.engine.dialed.DialedGame;
import com.sanfun.party.engine.fermi.FermiGame;
import com.sanfun.party.engine.imposter.ImposterGame;
import com.sanfun.party.engine.mafia.MafiaGame;
import com.sanfun.party.model.PlayerInfo;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class GameEnginesTests {

    private Map<String, PlayerInfo> createPlayers(int count) {
        Map<String, PlayerInfo> players = new LinkedHashMap<>();
        for (int i = 1; i <= count; i++) {
            String pid = "p_" + i;
            players.put(pid, new PlayerInfo(pid, "Player" + i, "🦊", "#E25241", i == 1, true, 0));
        }
        return players;
    }

    @Test
    void testGameFactoryAvailability() {
        assertEquals(8, GameFactory.getAvailableGames().size());
        assertTrue(GameFactory.getGameMetadata("mafia").isPresent());
        assertTrue(GameFactory.getGameMetadata("imposter").isPresent());
        assertTrue(GameFactory.getGameMetadata("dialed").isPresent());
        assertTrue(GameFactory.getGameMetadata("fermi").isPresent());
        assertTrue(GameFactory.getGameMetadata("auction").isPresent());
        assertTrue(GameFactory.getGameMetadata("circle").isPresent());
        assertTrue(GameFactory.getGameMetadata("trolley").isPresent());
        assertTrue(GameFactory.getGameMetadata("trends").isPresent());
    }

    @Test
    void testMafiaEngineLifecycleAndRoleMasking() {
        Map<String, PlayerInfo> players = createPlayers(4);
        MafiaGame game = new MafiaGame("TEST", players);
        game.start();

        assertEquals("ROLE_REVEAL", game.getPhase());
        Map<String, Object> hostState = game.getHostState();
        // Host state must NEVER reveal roles in active game!
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> publicPlayers = (List<Map<String, Object>>) hostState.get("players");
        for (Map<String, Object> p : publicPlayers) {
            assertNull(p.get("role_revealed"));
        }

        // Advance to night
        game.onTimerExpired();
        assertEquals("NIGHT_ACTIONS", game.getPhase());

        // Player states
        for (String pid : players.keySet()) {
            Map<String, Object> pState = game.getPlayerState(pid);
            assertNotNull(pState.get("my_role"));
        }
    }

    @Test
    void testImposterRoleMasking() {
        Map<String, PlayerInfo> players = createPlayers(4);
        ImposterGame game = new ImposterGame("TEST", players, Collections.emptyList());
        game.start();

        assertEquals("WORD_REVEAL", game.getPhase());
        Map<String, Object> hostState = game.getHostState();
        assertNull(hostState.get("secret_word")); // Never leak on TV!

        for (String pid : players.keySet()) {
            Map<String, Object> pState = game.getPlayerState(pid);
            boolean isImp = (Boolean) pState.get("is_imposter");
            if (isImp) {
                assertEquals("???", pState.get("secret_word"));
                assertNotNull(pState.get("imposter_hint"));
            } else {
                assertNotEquals("???", pState.get("secret_word"));
                assertNull(pState.get("imposter_hint"));
            }
        }
    }

    @Test
    void testDialedMath() {
        DialedGame.TargetColor cyan = new DialedGame.TargetColor("Electric Cyan", 184, 0.95, 1.0, "#0df0ff");
        // Perfect match
        double perfectScore = DialedGame.calculateColorScore(cyan, Map.of("h", 184.0, "s", 0.95, "v", 1.0));
        assertEquals(100.0, perfectScore, 0.5);

        // Opposite hue
        double oppositeScore = DialedGame.calculateColorScore(cyan, Map.of("h", 4.0, "s", 0.95, "v", 1.0));
        assertTrue(oppositeScore < 30.0);

        // Pitch matching
        double perfectPitch = DialedGame.calculatePitchScore(440.0, 440.0);
        assertEquals(100.0, perfectPitch);

        double octaveOff = DialedGame.calculatePitchScore(440.0, 880.0);
        assertEquals(0.0, octaveOff);
    }

    @Test
    void testFermiMath() {
        Map<String, Object> exact = FermiGame.scoreFermiGuess(1000.0, 1000.0);
        assertEquals(1000, exact.get("points"));
        assertEquals(0.0, exact.get("d_log"));

        Map<String, Object> oneOrderOff = FermiGame.scoreFermiGuess(100.0, 1000.0);
        assertEquals(667, (Integer) oneOrderOff.get("points"));
        assertEquals(1.0, (Double) oneOrderOff.get("d_log"));

        // Safeguard against 0, NaN, infinity
        Map<String, Object> zeroGuess = FermiGame.scoreFermiGuess(0.0, 1000.0);
        assertNotNull(zeroGuess);
        assertEquals(0, (Integer) zeroGuess.get("points"));
    }

    @Test
    void testCircleEvaluation() {
        // Generate near-perfect circle points (R = 100, cx = 200, cy = 200)
        List<List<Double>> points = new ArrayList<>();
        int numPoints = 100;
        for (int i = 0; i <= numPoints; i++) {
            double angle = (2 * Math.PI * i) / numPoints;
            double x = 200.0 + 100.0 * Math.cos(angle);
            double y = 200.0 + 100.0 * Math.sin(angle);
            points.add(List.of(x, y));
        }

        Map<String, Object> eval = CircleGame.evaluateCirclePoints(points);
        double score = (Double) eval.get("score");
        assertTrue(score >= 95.0, "Near perfect circle should score >= 95%, got: " + score);

        // Unclosed arc should fail
        List<List<Double>> unclosed = points.subList(0, 50);
        Map<String, Object> unclosedEval = CircleGame.evaluateCirclePoints(unclosed);
        assertEquals(0.0, (Double) unclosedEval.get("score"));
    }
}
