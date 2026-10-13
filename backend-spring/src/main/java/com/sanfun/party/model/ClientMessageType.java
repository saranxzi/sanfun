package com.sanfun.party.model;

public enum ClientMessageType {
    JOIN,
    RECONNECT,
    SELECT_GAME,
    START_GAME,
    BACK_TO_LOBBY,
    GAME_ACTION,
    KICK_PLAYER,
    PROMOTE_HOST,
    CLEAR_SCORES,
    UPDATE_SETTINGS,
    SKIP_PHASE,
    PING
}
