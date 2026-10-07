package com.sanfun.party.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record NetworkInfo(
    @JsonProperty("primary_ip") String primaryIp,
    List<String> candidates,
    int port,
    @JsonProperty("local_url") String localUrl,
    @JsonProperty("tunnel_url") String tunnelUrl,
    @JsonProperty("is_loopback") boolean isLoopback
) {}
