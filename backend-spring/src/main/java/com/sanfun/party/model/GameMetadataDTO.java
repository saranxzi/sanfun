package com.sanfun.party.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GameMetadataDTO(
    String id,
    String name,
    String tagline,
    String description,
    String icon,
    @JsonProperty("min_players") int minPlayers,
    @JsonProperty("max_players") int maxPlayers
) {}
