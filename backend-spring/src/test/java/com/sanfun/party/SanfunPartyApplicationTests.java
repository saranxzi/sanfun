package com.sanfun.party;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"server.port=0", "TESTING=1"})
class SanfunPartyApplicationTests {

    @Test
    void contextLoads() {
    }
}
