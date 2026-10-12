package com.sanfun.party;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {"TESTING=1"})
class SpaWebIntegrationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void testRootUrlServesIndexHtml() {
        ResponseEntity<String> response = restTemplate.getForEntity("http://localhost:" + port + "/", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode(), "GET / must return 200 OK");
        assertNotNull(response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getContentType().includes(MediaType.TEXT_HTML), "Content-Type must be text/html");
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("<div id=\"root\"></div>"), "Response must contain root div");
    }

    @Test
    void testFaviconAndSpaQueryParam() {
        ResponseEntity<String> faviconResp = restTemplate.getForEntity("http://localhost:" + port + "/favicon.svg", String.class);
        assertEquals(HttpStatus.OK, faviconResp.getStatusCode(), "Favicon must be accessible");

        ResponseEntity<String> joinResp = restTemplate.getForEntity("http://localhost:" + port + "/?join=ABCD", String.class);
        assertEquals(HttpStatus.OK, joinResp.getStatusCode(), "SPA join param must serve index.html");
        assertTrue(joinResp.getBody().contains("<div id=\"root\"></div>"));
    }

    @Test
    void testHealthAndApiRoutesStillWork() {
        ResponseEntity<String> healthResp = restTemplate.getForEntity("http://localhost:" + port + "/health", String.class);
        assertEquals(HttpStatus.OK, healthResp.getStatusCode());
        assertTrue(healthResp.getBody().contains("status"));

        ResponseEntity<String> gamesResp = restTemplate.getForEntity("http://localhost:" + port + "/api/party/games", String.class);
        assertEquals(HttpStatus.OK, gamesResp.getStatusCode());
        assertTrue(gamesResp.getBody().contains("mafia"));
    }
}
