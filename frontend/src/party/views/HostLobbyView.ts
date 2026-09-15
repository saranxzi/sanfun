import type { LobbyState } from "../types";
import { PartySocket } from "../PartySocket";
import { generateQrSvg } from "../qrcode";
import { soundManager } from "../sound";

export class HostLobbyView {
    private container: HTMLElement;
    private socket: PartySocket;
    private state: LobbyState | null = null;
    private qrSvg: string = "";
    private urlMode: "tunnel" | "local" = "local";
    private lastGeneratedUrl: string = "";

    constructor(container: HTMLElement, socket: PartySocket) {
        this.container = container;
        this.socket = socket;
    }

    public async updateState(state: LobbyState) {
        const prevCount = this.state?.player_count ?? 0;
        this.state = state;

        if (state.player_count > prevCount) {
            soundManager.playJoin();
        } else if (state.player_count < prevCount) {
            soundManager.playLeave();
        }

        // If tunnel URL just became available, auto-switch to it
        if (state.network_info.tunnel_url && this.urlMode === "local" && prevCount === 0) {
            this.urlMode = "tunnel";
        }

        await this.refreshQr();
        this.render();
    }

    private async refreshQr() {
        if (!this.state) return;
        const activeBaseUrl = (this.urlMode === "tunnel" && this.state.network_info.tunnel_url)
            ? this.state.network_info.tunnel_url
            : this.state.network_info.local_url;
        const joinUrl = `${activeBaseUrl}/?join=${this.state.room_code}`;

        if (joinUrl !== this.lastGeneratedUrl) {
            this.lastGeneratedUrl = joinUrl;
            this.qrSvg = await generateQrSvg(joinUrl);
        }
    }

    private render() {
        if (!this.state) return;

        const selectedGame = this.state.available_games.find(g => g.id === this.state!.selected_game_id) || this.state.available_games[0];
        const canStart = this.state.players.length >= (selectedGame?.min_players || 3);
        const activeBaseUrl = (this.urlMode === "tunnel" && this.state.network_info.tunnel_url)
            ? this.state.network_info.tunnel_url
            : this.state.network_info.local_url;
        const activeJoinUrl = `${activeBaseUrl}/?join=${this.state.room_code}`;

        this.container.innerHTML = `
            <div class="party-host-lobby">
                <div class="lobby-header">
                    <div class="brand">
                        <span class="arcade-tag">SANFUN PARTY</span>
                        <h1>COUCH CO-OP LOUNGE</h1>
                    </div>
                    <div class="audio-toggle" id="btn-toggle-sound">
                        ${soundManager.isMuted() ? "🔇 SOUND OFF" : "🔊 SOUND ON"}
                    </div>
                </div>

                <div class="lobby-main-grid">
                    <!-- Left: Room Code & QR -->
                    <div class="connect-card">
                        <div class="code-box">
                            <span class="code-label">ROOM CODE</span>
                            <div class="room-code-badge">${this.state.room_code}</div>
                        </div>

                        <!-- Network Mode Switcher -->
                        <div class="network-mode-tabs">
                            <button class="tab-net ${this.urlMode === "tunnel" ? "active" : ""}" id="tab-mode-tunnel" ${!this.state.network_info.tunnel_url ? "disabled title='Tunnel offline'" : ""}>
                                🌐 Internet Tunnel ${this.state.network_info.tunnel_url ? "★" : "(Off)"}
                            </button>
                            <button class="tab-net ${this.urlMode === "local" ? "active" : ""}" id="tab-mode-local">
                                📶 Local Wi-Fi
                            </button>
                        </div>

                        <div class="qr-box">
                            ${this.qrSvg}
                        </div>

                        <div class="join-hints">
                            <p class="join-main">Scan QR with your phone to join!</p>
                            <p class="join-url">Link: <code>${activeJoinUrl}</code></p>
                            ${this.urlMode === "tunnel" ? `
                                <p class="tunnel-badge-note">✅ Works on phone hotspots, mobile data, & friends far away!</p>
                            ` : `
                                <p class="local-badge-note">ℹ️ Phones must be on the same Wi-Fi / subnet.</p>
                            `}
                        </div>
                    </div>

                    <!-- Right: Game Selector & Player Roster -->
                    <div class="party-right-col">
                        <!-- Game Selector -->
                        <div class="game-select-section">
                            <div class="section-title">
                                <span>CHOOSE PARTY GAME</span>
                                <span class="players-req">${selectedGame.min_players}-${selectedGame.max_players} PLAYERS</span>
                            </div>

                            <div class="game-cards-row">
                                ${this.state.available_games.map(g => `
                                    <div class="game-select-chip ${g.id === this.state!.selected_game_id ? "active" : ""}" data-id="${g.id}">
                                        <div class="chip-icon">${g.icon}</div>
                                        <div class="chip-info">
                                            <div class="chip-name">${g.name}</div>
                                            <div class="chip-tag">${g.min_players}+ P</div>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>

                            <div class="selected-game-details">
                                <h3>${selectedGame.icon} ${selectedGame.name}</h3>
                                <p class="game-tagline">"${selectedGame.tagline}"</p>
                                <p class="game-desc">${selectedGame.description}</p>
                            </div>
                        </div>

                        <!-- Player Roster -->
                        <div class="roster-section">
                            <div class="roster-header">
                                <span>PLAYERS JOINED (${this.state.players.length})</span>
                                ${!canStart ? `<span class="min-warn">Need ${selectedGame.min_players - this.state.players.length} more to start</span>` : `<span class="ready-tag">READY TO START!</span>`}
                            </div>

                            <div class="player-grid">
                                ${this.state.players.map(p => `
                                    <div class="player-chip" style="border-color: ${p.color};">
                                        <span class="player-avatar">${p.avatar}</span>
                                        <span class="player-name">${p.nickname}</span>
                                        ${p.is_connected ? `<span class="dot-online"></span>` : `<span class="dot-offline"></span>`}
                                    </div>
                                `).join("")}
                                ${this.state.players.length === 0 ? `<div class="empty-roster-msg">Waiting for phones to connect...</div>` : ""}
                            </div>
                        </div>

                        <!-- Action Bar -->
                        <div class="lobby-action-bar">
                            <button id="btn-back-arcade" class="btn-secondary">EXIT TO ARCADE</button>
                            <button id="btn-start-game" class="btn-start-game" ${canStart ? "" : "disabled"}>
                                START ${selectedGame.name.toUpperCase()}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    private bindEvents() {
        const tabTunnel = this.container.querySelector("#tab-mode-tunnel");
        if (tabTunnel) {
            tabTunnel.addEventListener("click", async () => {
                if (this.state?.network_info.tunnel_url) {
                    this.urlMode = "tunnel";
                    await this.refreshQr();
                    this.render();
                }
            });
        }

        const tabLocal = this.container.querySelector("#tab-mode-local");
        if (tabLocal) {
            tabLocal.addEventListener("click", async () => {
                this.urlMode = "local";
                await this.refreshQr();
                this.render();
            });
        }

        this.container.querySelectorAll(".game-select-chip").forEach(chip => {
            chip.addEventListener("click", (e) => {
                const gameId = (e.currentTarget as HTMLElement).dataset.id;
                if (gameId) {
                    soundManager.playDing();
                    this.socket.send("SELECT_GAME", { game_id: gameId });
                }
            });
        });

        const startBtn = this.container.querySelector("#btn-start-game");
        if (startBtn) {
            startBtn.addEventListener("click", () => {
                soundManager.playStart();
                this.socket.send("START_GAME");
            });
        }

        const soundBtn = this.container.querySelector("#btn-toggle-sound");
        if (soundBtn) {
            soundBtn.addEventListener("click", () => {
                const muted = soundManager.toggleMute();
                soundBtn.textContent = muted ? "🔇 SOUND OFF" : "🔊 SOUND ON";
                if (!muted) soundManager.playDing();
            });
        }

        const backBtn = this.container.querySelector("#btn-back-arcade");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                window.location.href = window.location.pathname;
            });
        }
    }
}
