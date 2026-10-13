package com.sanfun.party;

import com.sanfun.party.engine.GameFactory;
import com.sanfun.party.engine.circle.CircleGame;
import com.sanfun.party.engine.dialed.DialedGame;
import com.sanfun.party.engine.fermi.FermiGame;
import com.sanfun.party.engine.imposter.ImposterGame;
import com.sanfun.party.engine.mafia.MafiaGame;
import com.sanfun.party.engine.price.GuessPriceGame;
import com.sanfun.party.engine.rather.WouldYouRatherGame;
import com.sanfun.party.engine.trends.TrendsGame;
import com.sanfun.party.model.PlayerInfo;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class GameEnginesTests {

    private Map<String, PlayerInfo> createPlayers(int count) {
        Map<String, PlayerInfo> players = new LinkedHashMap<>();
        for (int i = 0; i < count; i++) {
            String pid = "p" + i;
            players.put(pid, new PlayerInfo(pid, "Player_" + i, "🦊", "#E25241", i == 0, true, 0));
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
        assertTrue(GameFactory.getGameMetadata("guess_price").isPresent());
        assertTrue(GameFactory.getGameMetadata("auction").isPresent()); // Alias
        assertTrue(GameFactory.getGameMetadata("circle").isPresent());
        assertTrue(GameFactory.getGameMetadata("rather").isPresent());
        assertTrue(GameFactory.getGameMetadata("trolley").isPresent()); // Alias
        assertTrue(GameFactory.getGameMetadata("trends").isPresent());
    }

    @Test
    void testMafiaEngineLifecycleAndRoleMasking() {
        Map<String, PlayerInfo> players = createPlayers(5);
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

        // Villager must NOT see teammates, Mafia MUST see teammates
        String mafiaPid = game.getRoles().entrySet().stream()
                .filter(e -> MafiaGame.ROLE_MAFIA.equals(e.getValue()))
                .map(Map.Entry::getKey).findFirst().orElseThrow();
        String villagerPid = game.getRoles().entrySet().stream()
                .filter(e -> MafiaGame.ROLE_VILLAGER.equals(e.getValue()))
                .map(Map.Entry::getKey).findFirst().orElseThrow();

        Map<String, Object> vState = game.getPlayerState(villagerPid);
        assertFalse(vState.containsKey("mafia_teammates"));

        Map<String, Object> mState = game.getPlayerState(mafiaPid);
        assertTrue(mState.containsKey("mafia_teammates"));
    }

    @Test
    void testMafiaEarlyVoting() {
        Map<String, PlayerInfo> players = createPlayers(5);
        MafiaGame game = new MafiaGame("TEST", players);
        game.start();

        game.setPhase("DAY_DISCUSSION");
        Map<String, Object> res = game.handleAction("HOST", "START_VOTING", Collections.emptyMap());
        assertEquals("DAY_VOTE", game.getPhase());
        assertEquals(true, res.get("broadcast"));
    }

    @Test
    void testMafiaStrictPluralityTieAndExecution() {
        Map<String, PlayerInfo> players = createPlayers(5);
        MafiaGame game = new MafiaGame("TEST", players);
        game.start();

        // 1. Tie Vote: p1 has 2 votes, p4 has 2 votes -> TIE! No execution
        game.setPhase("DAY_VOTE");
        game.getAlivePlayers().clear();
        game.getAlivePlayers().addAll(players.keySet());
        game.getDayVotes().clear();
        game.getDayVotes().put("p0", "p1");
        game.getDayVotes().put("p2", "p1");
        game.getDayVotes().put("p3", "p4");
        game.getDayVotes().put("p4", "p4");

        game.resolveDayVoteForTest();
        assertNull(game.getLastKilledId());
        String lastLog = game.getHistoryLog().get(game.getHistoryLog().size() - 1);
        assertTrue(lastLog.toLowerCase().contains("could not reach") || lastLog.toLowerCase().contains("no one was executed"));

        // 2. Strict Plurality Execution: p1 gets 3 votes, p4 gets 1 vote
        game.setPhase("DAY_VOTE");
        game.getDayVotes().clear();
        game.getDayVotes().put("p0", "p1");
        game.getDayVotes().put("p2", "p1");
        game.getDayVotes().put("p3", "p1");
        game.getDayVotes().put("p4", "p4");

        game.resolveDayVoteForTest();
        assertEquals("p1", game.getLastKilledId());
        assertFalse(game.getAlivePlayers().contains("p1"));
    }

    @Test
    void testImposterRoleMaskingAndVagueClue() {
        Map<String, PlayerInfo> players = createPlayers(4);
        ImposterGame game = new ImposterGame("TEST", players, Collections.emptyList());
        game.start();

        assertEquals("WORD_REVEAL", game.getPhase());
        Map<String, Object> hostState = game.getHostState();
        assertNull(hostState.get("secret_word")); // Never leak on TV!

        String impId = game.getImposterIds().get(0);
        String crewId = players.keySet().stream().filter(pid -> !pid.equals(impId)).findFirst().orElseThrow();

        Map<String, Object> impState = game.getPlayerState(impId);
        assertEquals(true, impState.get("is_imposter"));
        assertEquals("???", impState.get("secret_word"));
        assertNotNull(impState.get("vague_hint")); // Vague clue exists to blend in!

        Map<String, Object> crewState = game.getPlayerState(crewId);
        assertEquals(false, crewState.get("is_imposter"));
        assertEquals(game.getSecretWord(), crewState.get("secret_word"));

        // Host can call vote early during clues
        game.setPhase("CLUE_ROUNDS");
        Map<String, Object> res = game.handleAction("HOST", "START_VOTING", Collections.emptyMap());
        assertEquals("VOTING", game.getPhase());
        assertEquals(true, res.get("broadcast"));

        // Disconnecting sole imposter during active game ends game with CREW win!
        game.onPlayerDisconnect(impId);
        assertTrue(game.isOver());
        assertEquals("CREW", game.getWinner());
    }

    @Test
    void testImposterTieVoteEscapesDetection() {
        Map<String, PlayerInfo> players = createPlayers(4);
        ImposterGame game = new ImposterGame("TEST", players, Collections.emptyList());
        game.start();

        game.setPhase("VOTING");
        // Tie vote between p0 and p1
        game.getVotes().clear();
        game.getVotes().put("p0", "p1");
        game.getVotes().put("p2", "p1");
        game.getVotes().put("p1", "p0");
        game.getVotes().put("p3", "p0");

        game.resolveVotingForTest();
        // Tie means no conviction -> imposter escapes -> imposter wins!
        assertNull(game.getVotedOutId());
        assertEquals("IMPOSTER", game.getWinner());
        assertTrue(game.isOver());
    }

    @Test
    void testDialedMathAndGuards() {
        DialedGame.TargetColor target = new DialedGame.TargetColor("Ruby", 2.0, 0.9, 1.0, "#FF0000");
        Map<String, Object> closeGuess = Map.of("h", 358.0, "s", 90.0, "v", 100.0);
        double score = DialedGame.calculateColorScore(target, closeGuess);
        assertTrue(score > 90.0, "Close hues across 0/360 boundary must score > 90%");

        // Opposite hue (180 deg away)
        Map<String, Object> farGuess = Map.of("h", 182.0, "s", 90.0, "v", 100.0);
        double farScore = DialedGame.calculateColorScore(target, farGuess);
        assertTrue(farScore < score);
    }

    @Test
    void testFermiMathAndZeroDivisionGuards() {
        // Exact guess
        Map<String, Object> exact = FermiGame.scoreFermiGuess(1000.0, 1000.0);
        assertEquals(1000, exact.get("points"));
        assertEquals(0.0, exact.get("d_log"));

        // Within 1 order of magnitude (5000 vs 10000)
        Map<String, Object> close = FermiGame.scoreFermiGuess(5000.0, 10000.0);
        assertTrue((Integer) close.get("points") > 850);
        assertTrue((Double) close.get("d_log") < 0.5);

        // Zero and negative guesses must not crash
        Map<String, Object> zeroGuess = FermiGame.scoreFermiGuess(0.0, 1000000.0);
        assertEquals(0, zeroGuess.get("points"));
        assertTrue((Double) zeroGuess.get("d_log") > 5.0);

        Map<String, Object> negGuess = FermiGame.scoreFermiGuess(-500.0, 1000.0);
        assertEquals(0, negGuess.get("points"));
    }

    @Test
    void testCircleEvaluationAndSmallCircleValidation() {
        // 1. Under 30 points rejected
        List<List<Double>> fewPoints = List.of(List.of(10.0, 10.0), List.of(20.0, 20.0));
        Map<String, Object> resFew = CircleGame.evaluateCirclePoints(fewPoints);
        assertEquals(0.0, (Double) resFew.get("score"));
        assertTrue(((String) resFew.get("reason")).contains("minimum 30"));

        // 2. Too small circle rejected (radius < 30px or diameter < 60px)
        List<List<Double>> tinyCircle = new ArrayList<>();
        double cx = 100.0, cy = 100.0, rTiny = 15.0; // tiny 15px radius!
        for (int i = 0; i < 40; i++) {
            double angle = 2.0 * Math.PI * i / 40.0;
            tinyCircle.add(List.of(cx + rTiny * Math.cos(angle), cy + rTiny * Math.sin(angle)));
        }
        tinyCircle.add(tinyCircle.get(0));
        Map<String, Object> resTiny = CircleGame.evaluateCirclePoints(tinyCircle);
        assertEquals(0.0, (Double) resTiny.get("score"));
        assertTrue((Boolean) resTiny.get("too_small"));
        assertTrue(((String) resTiny.get("reason")).contains("too small"));

        // 3. Near-perfect circle with generous diameter
        List<List<Double>> circlePts = new ArrayList<>();
        double cx2 = 200.0, cy2 = 200.0, r = 100.0;
        for (int i = 0; i < 60; i++) {
            double angle = 2.0 * Math.PI * i / 60.0;
            circlePts.add(List.of(cx2 + r * Math.cos(angle), cy2 + r * Math.sin(angle)));
        }
        circlePts.add(circlePts.get(0)); // close loop

        Map<String, Object> resPerf = CircleGame.evaluateCirclePoints(circlePts);
        assertTrue((Double) resPerf.get("score") > 90.0);
        assertTrue((Double) resPerf.get("angular_coverage_pct") >= 95.0);
    }

    @Test
    void testGuessPriceRulesAndProximityScoring() {
        Map<String, PlayerInfo> players = createPlayers(3);
        GuessPriceGame game = new GuessPriceGame("TEST", players);
        game.start();

        assertEquals("GUESS", game.getPhase());
        assertNotNull(game.getCurrentItem());
        long actual = game.getCurrentItem().actualPrice();

        // p0 guesses exact, p1 guesses within 10%, p2 guesses way off
        game.handleAction("p0", "SUBMIT_GUESS", Map.of("guess", actual));
        game.handleAction("p1", "SUBMIT_GUESS", Map.of("guess", (long) (actual * 1.08)));
        game.handleAction("p2", "SUBMIT_GUESS", Map.of("guess", 1L));

        assertEquals("REVEAL", game.getPhase());
        assertTrue(game.getScores().get("p0") >= 1000);
        assertTrue(game.getScores().get("p1") >= 800);
        assertTrue(game.getScores().get("p0") > game.getScores().get("p2"));
    }

    @Test
    void testWouldYouRatherChoicesAndConsensus() {
        Map<String, PlayerInfo> players = createPlayers(3);
        WouldYouRatherGame game = new WouldYouRatherGame("TEST", players);
        game.start();

        assertEquals("CHOICE", game.getPhase());
        assertNotNull(game.getCurrentDilemma());

        // p0 and p1 pick A with majority bet, p2 picks B
        game.handleAction("p0", "SUBMIT_CHOICE", Map.of("choice", "A", "bet_majority", true));
        game.handleAction("p1", "SUBMIT_CHOICE", Map.of("choice", "A", "bet_majority", true));
        game.handleAction("p2", "SUBMIT_CHOICE", Map.of("choice", "B", "bet_majority", true));

        assertEquals("REVEAL", game.getPhase());
        assertTrue(game.getScores().get("p0") > game.getScores().get("p2"));
    }

    @Test
    void testTrendsHigherOrLowerAndStreaks() {
        Map<String, PlayerInfo> players = createPlayers(2);
        TrendsGame game = new TrendsGame("TEST", players);
        game.start();

        TrendsGame.Matchup matchup = game.getCurrentMatchup();
        assertNotNull(matchup);
        String correct = matchup.relation();
        String wrong = correct.equals("HIGHER") ? "LOWER" : "HIGHER";

        game.handleAction("p0", "SUBMIT_GUESS", Map.of("guess", correct));
        game.handleAction("p1", "SUBMIT_GUESS", Map.of("guess", wrong));

        assertEquals("REVEAL", game.getPhase());
        assertTrue(game.getScores().get("p0") > game.getScores().get("p1"));
    }
}
