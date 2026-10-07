package com.sanfun.party.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class PlayerInfo {
    private String id;
    private String nickname;
    private String avatar;
    private String color;
    
    @JsonProperty("is_host")
    private boolean isHost;
    
    @JsonProperty("is_connected")
    private boolean isConnected;
    
    private int score;

    public PlayerInfo() {
    }

    public PlayerInfo(String id, String nickname, String avatar, String color, boolean isHost, boolean isConnected, int score) {
        this.id = id;
        this.nickname = nickname;
        this.avatar = avatar;
        this.color = color;
        this.isHost = isHost;
        this.isConnected = isConnected;
        this.score = score;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public boolean isHost() {
        return isHost;
    }

    public void setHost(boolean host) {
        isHost = host;
    }

    public boolean isConnected() {
        return isConnected;
    }

    public void setConnected(boolean connected) {
        isConnected = connected;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }
}
