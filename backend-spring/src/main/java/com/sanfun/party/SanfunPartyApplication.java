package com.sanfun.party;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SanfunPartyApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanfunPartyApplication.class, args);
    }
}
