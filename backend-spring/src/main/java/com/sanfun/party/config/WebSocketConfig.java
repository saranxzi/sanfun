package com.sanfun.party.config;

import com.sanfun.party.websocket.PartyWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final PartyWebSocketHandler partyWebSocketHandler;

    public WebSocketConfig(PartyWebSocketHandler partyWebSocketHandler) {
        this.partyWebSocketHandler = partyWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(partyWebSocketHandler, "/api/party/ws/*", "/api/party/ws/**")
                .setAllowedOrigins("*");
    }
}
