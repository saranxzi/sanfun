import type { PlayerGameState, LobbyState } from "../types";
import { PartySocket } from "../PartySocket";
import { soundManager } from "../sound";

export class PlayerController {
    private container: HTMLElement;
    private socket: PartySocket;
    private state: PlayerGameState | null = null;
    private currentTimer: number = 0;
    private maxTimerDuration: number = 15;
    private timerInterval: number | null = null;

    // Render caching to prevent iOS keyboard dismissal
    private renderedGameId: string | null = null;
    private renderedPhase: string | null = null;
    private renderedRound: number | null = null;
    private renderedState: string | null = null;

    // Circle game drawing cache
    private circlePoints: Array<[number, number]> = [];
    private isDrawingCircle: boolean = false;

    // Local Dialed state
    private dialHue: number = 180;
    private dialSat: number = 90;
    private dialBri: number = 90;
    private dialPitch: number = 440;

    // Local Fermi state
    private fermiBase: number = 1;
    private fermiMult: number = 1;

    // Local Auction state
    private auctionBid: number = 1000;

    // Local Imposter state
    private isCardRevealed: boolean = false;

    // Local Trolley state
    private selectedDilemmaChoice: "A" | "B" | null = null;

    constructor(container: HTMLElement, socket: PartySocket) {
        this.container = container;
        this.socket = socket;
    }

    public teardownActiveGame() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.circlePoints = [];
        this.isDrawingCircle = false;
        this.selectedDilemmaChoice = null;
        this.isCardRevealed = false;
    }

    public handleGameEvent(event: { event: string; [key: string]: any }) {
        if (event.event === "BACK_TO_LOBBY" || event.event === "RETURN_TO_LOBBY") {
            this.teardownActiveGame();
            if (this.state) {
                this.state.state = "LOBBY";
                this.state.game_id = undefined;
                this.state.phase = "LOBBY";
            }
            this.renderedState = "LOBBY";
            this.renderedGameId = null;
            this.renderedPhase = null;
            this.renderedRound = null;
            this.render();
        } else if (event.event === "PROMOTED_TO_HOST") {
            soundManager.playVictory();
            if (this.state) {
                this.state.is_host = true;
            }
            alert("👑 You have been promoted to Room Host!");
        }
    }

    public handleLobbyState(lobby: LobbyState) {
        if (this.state?.player_id) {
            const me = lobby.players.find(p => p.id === this.state!.player_id);
            if (me) {
                this.state.nickname = me.nickname;
                this.state.avatar = me.avatar;
                this.state.color = me.color;
                this.state.score = me.score;
                this.state.is_host = me.is_host;
            }
        }

        if (lobby.state === "LOBBY" && (this.renderedState !== "LOBBY" || this.state?.state !== "LOBBY")) {
            this.teardownActiveGame();
            if (this.state) {
                this.state.state = "LOBBY";
                this.state.game_id = undefined;
                this.state.phase = "LOBBY";
            }
            this.renderedState = "LOBBY";
            this.renderedGameId = null;
            this.renderedPhase = null;
            this.renderedRound = null;
            this.render();
        }
    }

    public updateState(state: PlayerGameState) {
        const merged: PlayerGameState = {
            ...this.state,
            ...state,
            player_id: state.player_id || this.state?.player_id,
            nickname: state.nickname || this.state?.nickname,
            avatar: state.avatar || this.state?.avatar,
            color: state.color || this.state?.color,
            room_code: state.room_code || this.state?.room_code || "",
            is_host: typeof state.is_host === "boolean" ? state.is_host : this.state?.is_host,
        };

        const prevPhase = this.state?.phase;
        const newPhase = merged.phase;

        if (newPhase !== prevPhase && typeof merged.phase_timer === "number") {
            this.maxTimerDuration = merged.phase_timer > 0 ? merged.phase_timer : 15;
            this.currentTimer = merged.phase_timer;
            this.startLocalTimer();
        } else if (typeof merged.phase_timer === "number" && Math.abs(this.currentTimer - merged.phase_timer) > 2) {
            this.currentTimer = merged.phase_timer;
        }

        this.state = merged;

        // Check if returning to lobby
        if (merged.state === "LOBBY" || merged.phase === "LOBBY" || (!merged.game_id && merged.state !== "IN_GAME")) {
            this.teardownActiveGame();
            this.renderedState = "LOBBY";
            this.renderedGameId = null;
            this.renderedPhase = null;
            this.renderedRound = null;
            this.render();
            return;
        }

        // Check if full DOM rebuild is necessary
        const needsFullRebuild = (
            merged.state !== this.renderedState ||
            merged.game_id !== this.renderedGameId ||
            merged.phase !== this.renderedPhase ||
            merged.round_number !== this.renderedRound
        );

        if (needsFullRebuild) {
            this.renderedState = merged.state;
            this.renderedGameId = merged.game_id || null;
            this.renderedPhase = merged.phase || null;
            this.renderedRound = merged.round_number || null;
            this.render();
        } else {
            // Targeted in-place update: Preserves iOS virtual keyboard!
            this.patchDynamicNodes();
        }
    }

    private patchDynamicNodes() {
        if (!this.state) return;
        const scoreBadge = this.container.querySelector(".score-badge");
        if (scoreBadge) scoreBadge.textContent = `${this.state.score || 0} pts`;
        this.updateTimerDisplay();
    }

    public updateTimerTick(phaseTimer: number) {
        this.currentTimer = phaseTimer;
        this.updateTimerDisplay();
    }

    private startLocalTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = window.setInterval(() => {
            if (this.currentTimer > 0) {
                this.currentTimer = Math.max(0, this.currentTimer - 0.1);
                this.updateTimerDisplay();
            }
        }, 100);
    }

    private updateTimerDisplay() {
        const timerNum = this.container.querySelector(".player-timer-number");
        if (timerNum) timerNum.textContent = `${Math.ceil(this.currentTimer)}s`;
        const timerBar = this.container.querySelector(".player-timer-bar") as HTMLElement;
        if (timerBar && this.maxTimerDuration > 0) {
            const pct = Math.min(100, Math.max(0, (this.currentTimer / this.maxTimerDuration) * 100));
            timerBar.style.width = `${pct}%`;
        }
    }

    public render() {
        if (!this.state || !this.state.player_id) {
            this.renderJoinScreen();
            return;
        }

        if (this.state.state === "LOBBY" || this.state.phase === "LOBBY" || !this.state.game_id) {
            this.renderLobbyWaiting();
        } else {
            this.renderGameController();
        }
    }

    private renderJoinScreen() {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get("join") || this.socket.roomCode || "";
        const savedNick = localStorage.getItem("sanfun_player_nick") || "";

        this.container.innerHTML = `
            <div class="player-join-screen">
                <div class="controller-card">
                    <div class="brand-sub">SANFUN PARTY</div>
                    <h2>JOIN THE GAME</h2>
                    <div class="form-group">
                        <label>ROOM CODE</label>
                        <input type="text" id="join-code" maxlength="4" placeholder="ABCD" value="${codeFromUrl}" class="input-code input-giant-code" autocomplete="off" />
                    </div>
                    <div class="form-group">
                        <label>NICKNAME</label>
                        <input type="text" id="join-nickname" maxlength="12" placeholder="Your Name" value="${savedNick}" class="input-nick input-giant-nick" autocomplete="off" />
                    </div>
                    <button id="btn-join-room" class="btn-primary-action btn-giant-touch">ENTER LOBBY</button>
                </div>
            </div>
        `;

        this.container.querySelector("#btn-join-room")?.addEventListener("click", () => {
            const codeInput = (this.container.querySelector("#join-code") as HTMLInputElement).value.trim().toUpperCase();
            const nickInput = (this.container.querySelector("#join-nickname") as HTMLInputElement).value.trim();
            if (!codeInput || codeInput.length !== 4) return alert("Enter a valid 4-character Room Code!");
            if (!nickInput) return alert("Enter a nickname!");

            localStorage.setItem("sanfun_player_nick", nickInput);
            this.socket.roomCode = codeInput;
            this.socket.nickname = nickInput;
            this.socket.connect();
        });
    }

    private renderLobbyWaiting() {
        const s = this.state!;
        this.container.innerHTML = `
            <div class="player-lobby-waiting">
                <div class="controller-card">
                    <div class="avatar-large" style="border: 3px solid ${s.color || '#6366f1'}; background: ${s.color ? s.color + '22' : 'rgba(99,102,241,0.2)'};">${s.avatar || "🦊"}</div>
                    <h2>${s.nickname || "Player"}</h2>
                    <div class="room-chip">ROOM: <strong>${s.room_code}</strong> ${s.is_host ? '<span class="host-badge">👑 HOST</span>' : ''}</div>
                    ${s.is_host ? `
                        <div class="promoted-host-panel">
                            <div class="host-crown-badge">👑 YOU ARE ROOM HOST</div>
                            <button id="btn-player-start-game" class="btn-primary btn-giant-touch">START GAME</button>
                        </div>
                    ` : `
                        <div class="waiting-indicator">
                            <div class="dot-flashing"></div>
                            <span>Waiting for host to select game and start...</span>
                        </div>
                    `}
                </div>
            </div>
        `;

        if (s.is_host) {
            this.container.querySelector("#btn-player-start-game")?.addEventListener("click", () => {
                soundManager.playStart();
                this.socket.send("START_GAME");
            });
        }
    }

    private renderGameController() {
        const s = this.state!;
        let html = "";
        switch (s.game_id) {
            case "mafia": html = this.renderMafiaController(); break;
            case "imposter": html = this.renderImposterController(); break;
            case "dialed": html = this.renderDialedController(); break;
            case "fermi": html = this.renderFermiController(); break;
            case "auction": html = this.renderAuctionController(); break;
            case "circle": html = this.renderCircleController(); break;
            case "trolley": html = this.renderTrolleyController(); break;
            case "trends": html = this.renderTrendsController(); break;
            default: html = `<div>Game controller for ${s.game_id}</div>`;
        }

        this.container.innerHTML = `
            <div class="player-in-game-container">
                <div class="player-status-bar">
                    <div class="player-profile-mini">
                        <span class="av">${s.avatar || "🎮"}</span>
                        <span class="nick">${s.nickname || "Player"}</span>
                    </div>
                    <div class="player-timer-badge">
                        <div class="player-timer-track">
                            <div class="player-timer-bar" style="width: 100%;"></div>
                        </div>
                        <span class="player-timer-number">${Math.ceil(this.currentTimer || s.phase_timer || 0)}s</span>
                    </div>
                    <span class="score-badge">${s.score || 0} pts</span>
                </div>
                <div class="controller-body">${html}</div>
            </div>
        `;

        this.bindControllerActions();
    }

    // 1. MAFIA
    private renderMafiaController(): string {
        const s = this.state!;
        if (!s.is_alive) return `<div class="dead-screen">👻 Eliminated! Watch the trial on the Big Screen TV.</div>`;

        if (s.phase === "ROLE_REVEAL") {
            return `
                <div class="role-reveal-phone">
                    <div class="brand-sub">SECRET ROLE ASSIGNMENT</div>
                    <div class="role-card-box">
                        <div class="role-name">${s.my_role || "VILLAGER"}</div>
                        <p class="role-hint">${this.getRoleDescription(s.my_role || "VILLAGER")}</p>
                    </div>
                    <p style="color: var(--text-dim); font-size: 0.85rem;">Keep your screen angled away from other players!</p>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            if (s.night_action === "MAFIA_KILL") {
                return `
                    <div class="panel-action">
                        <h3>🔪 NIGHT ATTACK</h3>
                        <p style="color: var(--text-dim); font-size: 0.85rem;">Coordinate with fellow Mafia to eliminate a villager.</p>
                        ${this.renderCandidateList(s.candidates, s.my_vote, "MAFIA_KILL")}
                    </div>
                `;
            } else if (s.night_action === "DOCTOR_HEAL") {
                return `
                    <div class="panel-action">
                        <h3>💉 DOCTOR'S PROTECTION</h3>
                        <p style="color: var(--text-dim); font-size: 0.85rem;">Choose one player to protect from elimination tonight.</p>
                        ${this.renderCandidateList(s.candidates, s.my_heal, "DOCTOR_HEAL")}
                    </div>
                `;
            } else if (s.night_action === "DETECTIVE_INVESTIGATE") {
                return `
                    <div class="panel-action">
                        <h3>🔍 DETECTIVE INQUIRY</h3>
                        <p style="color: var(--text-dim); font-size: 0.85rem;">Investigate a suspect to learn their true allegiance.</p>
                        ${this.renderCandidateList(s.candidates, null, "DETECTIVE_INVESTIGATE")}
                    </div>
                `;
            }
            return `<div class="panel-glass"><h3>😴 THE TOWN SLEEPS</h3><p style="color: var(--text-dim);">Rest peacefully while night creatures roam...</p></div>`;
        } else if (s.phase === "DAY_VOTE") {
            return `
                <div class="panel-action">
                    <h3>⚖️ CAST ACCUSATION VOTE</h3>
                    <p style="color: var(--text-dim); font-size: 0.85rem;">Vote for the most suspicious player, or vote Skip.</p>
                    ${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE", true)}
                </div>
            `;
        }
        return `<div class="panel-glass"><h3>👀 WATCH THE TV SCREEN</h3><p style="color: var(--text-dim);">Town debate and trial proceedings in progress.</p></div>`;
    }

    private getRoleDescription(role: string): string {
        switch (role) {
            case "MAFIA": return "Eliminate innocent villagers each night. Deceive the town during the day.";
            case "DOCTOR": return "Protect one player each night from mafia attacks. You can heal yourself.";
            case "DETECTIVE": return "Investigate one suspect each night to determine if they are Mafia or Innocent.";
            default: return "Work with fellow villagers to deduce and execute the Mafia syndicate!";
        }
    }

    private renderCandidateList(candidates: any[] = [], currentVote: any = null, actionName: string = "CAST_VOTE", allowSkip: boolean = false): string {
        return `
            <div class="candidates-list">
                ${(candidates || []).map(c => `
                    <button class="btn-target ${currentVote === c.id ? 'selected' : ''}" data-action="${actionName}" data-target-id="${c.id}">
                        <span class="c-av">${c.avatar || "👤"}</span>
                        <span class="c-name">${c.nickname}</span>
                        ${currentVote === c.id ? '<span class="c-check">✓</span>' : ''}
                    </button>
                `).join("")}
                ${allowSkip ? `
                    <button class="btn-target btn-skip ${currentVote === 'SKIP' ? 'selected' : ''}" data-action="${actionName}" data-target-id="SKIP">
                        <span class="c-av">⏭️</span>
                        <span class="c-name">SKIP / ABSTAIN</span>
                    </button>
                ` : ""}
            </div>
        `;
    }

    // 2. FIND THE IMPOSTER
    private renderImposterController(): string {
        const s = this.state!;
        if (s.phase === "WORD_REVEAL" || s.phase === "CLUE_ROUNDS") {
            const isImp = s.is_imposter;
            return `
                <div class="imposter-wrapper-phone">
                    <div class="card-privacy-bar">
                        <button class="btn-card-toggle" id="btn-toggle-secret-card">
                            ${this.isCardRevealed ? "🙈 HIDE SECRET" : "👁️ TAP TO REVEAL"}
                        </button>
                    </div>

                    <div class="imposter-card-phone ${!this.isCardRevealed ? 'card-hidden-state' : ''}" id="secret-card-body">
                        ${!this.isCardRevealed ? `
                            <div class="card-hidden-overlay">
                                <div class="lock-icon">🔒</div>
                                <h3>TAP TO REVEAL</h3>
                                <p class="tap-note">Keep hidden from nearby players</p>
                            </div>
                        ` : `
                            <div class="card-content-revealed">
                                <div class="cat-pill">CATEGORY: ${s.category || "General"}</div>
                                ${isImp ? `
                                    <div class="imposter-alert-box">
                                        <div class="role-name-danger">YOU ARE THE IMPOSTER!</div>
                                        <p>You do not know the secret word. Blend in and listen carefully to other clues!</p>
                                    </div>
                                    ${s.imposter_hint ? `
                                        <div class="imposter-hint-box">
                                            <span class="hint-label">CONFIDENTIAL HINT:</span>
                                            <p class="hint-text">"${s.imposter_hint}"</p>
                                        </div>
                                    ` : ""}
                                ` : `
                                    <div class="crew-word-box">
                                        <span class="label">SECRET WORD:</span>
                                        <div class="secret-word-display">${s.secret_word}</div>
                                    </div>
                                `}
                            </div>
                        `}
                    </div>

                    ${s.candidate_words && s.candidate_words.length > 0 ? `
                        <div class="candidate-words-accordion">
                            <span class="accordion-title">CATEGORY WORDS (${s.candidate_words.length})</span>
                            <div class="words-grid-mini">
                                ${s.candidate_words.map((w: string) => `<span class="word-chip-mini">${w}</span>`).join("")}
                            </div>
                        </div>
                    ` : ""}
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `
                <div class="panel-action">
                    <h3>🗳️ WHO IS THE IMPOSTER?</h3>
                    <p style="color: var(--text-dim); font-size: 0.85rem;">Vote for the player whose clue was suspicious or vague.</p>
                    ${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE")}
                </div>
            `;
        } else if (s.phase === "IMPOSTER_GUESS" && s.is_imposter) {
            return `
                <div class="guess-form-container">
                    <div class="brand-sub">FINAL CHANCE TO WIN</div>
                    <h3>🎯 CLUTCH WORD GUESS</h3>
                    <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
                        You were caught! But you can still win if you can guess the exact secret word!
                    </p>
                    <input type="text" id="input-imposter-guess" placeholder="Enter secret word..." class="input-code" autocomplete="off" />
                    ${s.candidate_words ? `
                        <div class="clutch-words-picker">
                            ${s.candidate_words.map((w: string) => `
                                <button class="btn-clutch-word" data-word="${w}">${w}</button>
                            `).join("")}
                        </div>
                    ` : ""}
                    <button id="btn-submit-imposter-guess" class="btn-primary-action btn-giant-touch">SUBMIT FINAL GUESS</button>
                </div>
            `;
        }
        return `<div class="panel-glass"><h3>👀 WATCH TV SCREEN</h3><p style="color: var(--text-dim);">Follow the speaking clues and reveal on the main screen.</p></div>`;
    }

    // 3. DIALED
    private renderDialedController(): string {
        const s = this.state!;
        if (s.phase === "INSPECT") {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">ROUND ${s.round_number || 1}</div>
                    <h3>👀 WATCH THE BIG SCREEN</h3>
                    <p style="color: var(--text-dim); font-size: 0.95rem; margin-top: 0.5rem;">
                        Memorize the exact target ${s.round_type === 'COLOR' ? 'color' : 'audio pitch'}.
                    </p>
                </div>
            `;
        } else if (s.phase === "DIAL") {
            if (s.has_locked) {
                return `<div class="panel-glass"><h3>✓ LOCKED IN!</h3><p style="color: var(--text-dim);">Waiting for other players to lock in their dials...</p></div>`;
            }

            if (s.round_type === "COLOR") {
                return `
                    <div class="dial-controller">
                        <div class="brand-sub">COLOR RECALL</div>
                        <h3>🎨 TUNE YOUR COLOR</h3>
                        <div id="dial-swatch" class="interactive-swatch" style="background: ${this.hsvToRgbCss(this.dialHue, this.dialSat, this.dialBri)};"></div>
                        <div class="slider-control-card">
                            <div class="slider-header">
                                <label>HUE</label>
                                <span class="val-pill" id="val-hue">${this.dialHue}°</span>
                            </div>
                            <input type="range" id="slider-hue" min="0" max="360" value="${this.dialHue}" class="slider-rainbow" />
                        </div>
                        <div class="slider-control-card">
                            <div class="slider-header">
                                <label>SATURATION</label>
                                <span class="val-pill" id="val-sat">${this.dialSat}%</span>
                            </div>
                            <input type="range" id="slider-sat" min="0" max="100" value="${this.dialSat}" class="slider-sat" />
                        </div>
                        <div class="slider-control-card">
                            <div class="slider-header">
                                <label>BRIGHTNESS</label>
                                <span class="val-pill" id="val-bri">${this.dialBri}%</span>
                            </div>
                            <input type="range" id="slider-bri" min="10" max="100" value="${this.dialBri}" class="slider-bri" />
                        </div>
                        <button id="btn-lock-dial" class="btn-primary-action btn-giant-touch">LOCK IN COLOR</button>
                    </div>
                `;
            } else {
                return `
                    <div class="dial-controller">
                        <div class="brand-sub">AUDIO RECALL</div>
                        <h3>🎵 TUNE YOUR PITCH</h3>
                        <div class="tone-display-card">
                            <span class="tone-icon">📻</span>
                            <div class="tone-freq-number" id="freq-readout">${this.dialPitch} Hz</div>
                        </div>
                        <div class="slider-control-card">
                            <div class="slider-header">
                                <label>FREQUENCY</label>
                                <span class="val-pill" id="val-pitch">${this.dialPitch} Hz</span>
                            </div>
                            <input type="range" id="slider-pitch" min="130" max="600" value="${this.dialPitch}" class="slider-generic" />
                        </div>
                        <div class="action-buttons-stack">
                            <button id="btn-test-tone" class="btn-secondary btn-giant-touch">🔊 PLAY MY CURRENT TONE</button>
                            <button id="btn-lock-dial" class="btn-primary-action btn-giant-touch">LOCK IN PITCH</button>
                        </div>
                    </div>
                `;
            }
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">ROUND SCORE</div>
                    <h3>ACCURACY REVEAL</h3>
                    <div class="reveal-score-number">
                        ${s.my_result ? `${s.my_result.score_pct}% Precision` : 'Watching TV'}
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem;">+${s.my_result?.points_awarded || 0} pts</p>
                </div>
            `;
        }
    }

    // 4. FERMI ESTIMATOR
    private renderFermiController(): string {
        const s = this.state!;
        if (s.phase === "QUESTION") {
            if (s.has_locked) {
                return `
                    <div class="panel-glass">
                        <h3>✓ ESTIMATE LOCKED</h3>
                        <p style="color: var(--text-dim); margin-top: 0.5rem;">Submitted Value:</p>
                        <div class="locked-value-display">${this.formatBigNumber(s.my_guess)} ${s.unit}</div>
                    </div>
                `;
            }

            const currentComputed = this.fermiBase * this.fermiMult;

            return `
                <div class="fermi-controller-v2">
                    <div class="brand-sub">COSMIC ESTIMATE</div>
                    <h3 class="fermi-mobile-q">${s.prompt || "Make your best order-of-magnitude estimate."}</h3>
                    
                    <div class="fermi-input-card">
                        <label class="input-label">BASE NUMBER (${s.unit || "units"})</label>
                        <input type="number" id="input-fermi-guess" value="${this.fermiBase}" step="any" class="input-fermi-number" autocomplete="off" />
                        
                        <div class="multiplier-section">
                            <span class="sub-label">ORDERS OF MAGNITUDE (MULTIPLIER):</span>
                            <div class="multiplier-grid">
                                <button class="pill-mult ${this.fermiMult === 1 ? 'active' : ''}" data-mult="1">x1 (10⁰)</button>
                                <button class="pill-mult ${this.fermiMult === 1000 ? 'active' : ''}" data-mult="1000">x1K (10³)</button>
                                <button class="pill-mult ${this.fermiMult === 1000000 ? 'active' : ''}" data-mult="1000000">x1M (10⁶)</button>
                                <button class="pill-mult ${this.fermiMult === 1000000000 ? 'active' : ''}" data-mult="1000000000">x1B (10⁹)</button>
                                <button class="pill-mult ${this.fermiMult === 1000000000000 ? 'active' : ''}" data-mult="1000000000000">x1T (10¹²)</button>
                                <button class="pill-mult ${this.fermiMult === 1e15 ? 'active' : ''}" data-mult="1000000000000000">x1Q (10¹⁵)</button>
                                <button class="pill-mult ${this.fermiMult === 1e18 ? 'active' : ''}" data-mult="1000000000000000000">x1S (10¹⁸)</button>
                                <button class="pill-mult ${this.fermiMult === 1e21 ? 'active' : ''}" data-mult="1000000000000000000000">x1Sx (10²¹)</button>
                            </div>
                        </div>

                        <div class="live-preview-box">
                            <span class="preview-label">Estimated:</span>
                            <span class="preview-val" id="fermi-preview-val">${this.formatBigNumber(currentComputed)} ${s.unit || ""}</span>
                        </div>
                    </div>

                    <button id="btn-submit-fermi" class="btn-primary-action btn-giant-touch">LOCK IN ESTIMATE</button>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">ROUND RESULTS</div>
                    <h3>ACTUAL ANSWER</h3>
                    <div class="reveal-score-number" style="color: #00f0ff;">
                        ${this.formatBigNumber(s.actual)} ${s.unit}
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem; margin-top: 0.6rem;">+${s.my_result?.points || 0} pts</p>
                    <p style="color: var(--text-dim); font-size: 0.85rem; margin-top: 0.4rem;">Error: ±${s.my_result?.d_log || 0} orders of magnitude</p>
                </div>
            `;
        }
    }

    private hsvToRgbCss(h: number, sPct: number, vPct: number): string {
        const s = Math.max(0, Math.min(1, sPct / 100));
        const v = Math.max(0, Math.min(1, vPct / 100));
        const f = (n: number) => {
            const k = (n + h / 60) % 6;
            return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
        };
        const r = Math.round(f(5) * 255);
        const g = Math.round(f(3) * 255);
        const b = Math.round(f(1) * 255);
        return `rgb(${r}, ${g}, ${b})`;
    }

    private formatBigNumber(num: any): string {
        if (num === null || num === undefined) return "0";
        const val = Number(num);
        if (isNaN(val)) return "0";
        if (val >= 1e21) return `${(val / 1e21).toFixed(2)} Sextillion`;
        if (val >= 1e18) return `${(val / 1e18).toFixed(2)} Quintillion`;
        if (val >= 1e15) return `${(val / 1e15).toFixed(2)} Quadrillion`;
        if (val >= 1e12) return `${(val / 1e12).toFixed(2)} Trillion`;
        if (val >= 1e9) return `${(val / 1e9).toFixed(2)} Billion`;
        if (val >= 1e6) return `${(val / 1e6).toFixed(2)} Million`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(1)} Thousand`;
        return val.toLocaleString();
    }

    // 5. THE AUCTION HOUSE
    private renderAuctionController(): string {
        const s = this.state!;
        if (s.phase === "CATALOG") {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">LOT CATALOG</div>
                    <div class="lot-icon-mini">${s.item_icon || "🏺"}</div>
                    <h3>${s.item_title || "Lot Title"}</h3>
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 0.6rem;">
                        Inspect provenance and details on the TV screen before bidding begins!
                    </p>
                </div>
            `;
        } else if (s.phase === "BIDDING") {
            if (s.has_bid) {
                return `
                    <div class="panel-glass">
                        <h3>✓ SECRET BID PLACED</h3>
                        <p style="color: var(--text-dim); margin-top: 0.4rem;">Your valuation:</p>
                        <div class="locked-value-display">$${(s.my_bid || 0).toLocaleString()}</div>
                    </div>
                `;
            }
            return `
                <div class="auction-controller-v2">
                    <div class="brand-sub">SECRET AUCTION BID</div>
                    <h3>${s.item_icon || "🏛️"} ${s.item_title || "Lot"}</h3>
                    <p class="rule-hint">Closest bid WITHOUT going over the hammer price wins the lot!</p>
                    
                    <div class="bid-input-card">
                        <label class="input-label">YOUR BID (USD $)</label>
                        <input type="number" id="input-auction-bid" value="${this.auctionBid}" class="input-auction-number" autocomplete="off" />
                        
                        <div class="quick-bid-modifiers">
                            <button class="pill-bid" data-add="1000">+$1K</button>
                            <button class="pill-bid" data-add="10000">+$10K</button>
                            <button class="pill-bid" data-add="100000">+$100K</button>
                            <button class="pill-bid" data-add="1000000">+$1M</button>
                            <button class="pill-bid" data-add="10000000">+$10M</button>
                            <button class="pill-bid" data-mult="2">2x</button>
                            <button class="pill-bid btn-reset-bid" data-clear="true">Clear</button>
                        </div>

                        <div class="live-preview-box">
                            <span class="preview-label">Live Valuation:</span>
                            <span class="preview-val" id="auction-preview-val">$${this.auctionBid.toLocaleString()}</span>
                        </div>
                    </div>

                    <button id="btn-submit-auction-bid" class="btn-primary-action btn-giant-touch">PLACE SECRET BID</button>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">HAMMER FELL</div>
                    <h3>ACTUAL HAMMER PRICE</h3>
                    <div class="reveal-score-number" style="color: #10b981;">
                        $${(s.hammer_price || 0).toLocaleString()}
                    </div>
                    <div class="lot-result-badge">
                        ${s.my_result?.won_lot ? '🏆 YOU WON THE LOT!' : (s.my_result?.went_over ? '❌ WENT OVER' : 'Under Bid')}
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem; margin-top: 0.6rem;">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    // 6. DRAW A PERFECT CIRCLE
    private renderCircleController(): string {
        const s = this.state!;
        if (s.phase === "DRAWING") {
            if (s.has_drawn) {
                return `
                    <div class="panel-glass">
                        <h3>✓ CIRCLE SUBMITTED!</h3>
                        <p style="color: var(--text-dim); margin-top: 0.5rem;">
                            Analyzing circularity, Pratt fit, and angular closure on TV...
                        </p>
                    </div>
                `;
            }
            return `
                <div class="circle-controller-v2">
                    <div class="brand-sub">FREEHAND STROKE</div>
                    <h3>⭕ DRAW A CIRCLE</h3>
                    <p class="circle-sub">Draw one smooth, continuous stroke. Close the full loop!</p>
                    
                    <div id="circle-live-feedback" class="circle-live-feedback">Draw a single smooth loop</div>

                    <div class="canvas-wrap">
                        <canvas id="circle-touch-canvas" width="300" height="300" class="circle-canvas"></canvas>
                        <div class="canvas-crosshair"></div>
                    </div>

                    <div class="circle-actions-row">
                        <button id="btn-clear-circle" class="btn-secondary">🔄 Redraw</button>
                        <button id="btn-submit-circle" class="btn-primary-action btn-giant-touch" style="flex: 2;">✓ LOCK IN CIRCLE</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">GEOMETRY SCORE</div>
                    <h3>CIRCULARITY SCORE</h3>
                    <div class="reveal-score-number" style="color: var(--primary);">
                        ${s.my_eval?.score_pct || 0}%
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem; margin-top: 0.6rem;">+${s.my_eval?.points || 0} pts earned!</p>
                </div>
            `;
        }
    }

    // 7. ABSURD DILEMMAS
    private renderTrolleyController(): string {
        const s = this.state!;
        if (s.phase === "CHOICE") {
            if (s.has_chosen) {
                return `
                    <div class="panel-glass">
                        <h3>✓ CHOICE LOCKED</h3>
                        <p style="color: var(--text-dim); margin-top: 0.5rem;">Waiting for room reveal and majority vote tally...</p>
                    </div>
                `;
            }
            return `
                <div class="trolley-controller-v2">
                    <div class="brand-sub">ETHICAL FORK</div>
                    <h3 class="dilemma-q-title">${s.dilemma_title || "Choose Your Fate"}</h3>
                    
                    <div class="dilemma-choices-stack">
                        <div class="dilemma-choice-card ${this.selectedDilemmaChoice === 'A' ? 'selected' : ''}" data-choice="A">
                            <div class="choice-icon">${s.icon_a || "🅰️"}</div>
                            <div class="choice-text">
                                <strong>TRACK A</strong>
                                <p>${s.option_a || ""}</p>
                            </div>
                        </div>
                        <div class="dilemma-choice-card ${this.selectedDilemmaChoice === 'B' ? 'selected' : ''}" data-choice="B">
                            <div class="choice-icon">${s.icon_b || "🅱️"}</div>
                            <div class="choice-text">
                                <strong>TRACK B</strong>
                                <p>${s.option_b || ""}</p>
                            </div>
                        </div>
                    </div>

                    <label class="consensus-checkbox-container">
                        <input type="checkbox" id="check-consensus" checked />
                        <span>🎯 I bet the room majority will agree with me (+500 pts)</span>
                    </label>

                    <button id="btn-submit-trolley" class="btn-primary-action btn-giant-touch">SUBMIT MORAL CHOICE</button>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">CONSENSUS TALLY</div>
                    <h3>ROOM DECISION</h3>
                    <div class="reveal-score-number" style="font-size: 1.8rem;">
                        ${s.majority_choice === "TIE" ? "⚡ 50/50 TIE!" : `Option ${s.majority_choice}`}
                    </div>
                    <div class="lot-result-badge">
                        ${s.my_result?.predicted_correctly ? '🎯 Prediction Correct!' : '❌ Missed Consensus'}
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem; margin-top: 0.6rem;">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    // 8. HIGHER OR LOWER
    private renderTrendsController(): string {
        const s = this.state!;
        if (s.phase === "GUESS") {
            if (s.has_guessed) {
                return `
                    <div class="panel-glass">
                        <h3>✓ GUESS LOCKED</h3>
                        <p style="color: var(--text-dim); margin-top: 0.5rem;">Guessed: <strong>${s.my_guess}</strong>. Watching animated reveal on TV...</p>
                    </div>
                `;
            }
            return `
                <div class="trends-controller-v2">
                    <div class="brand-sub">SEARCH VOLUME BATTLE</div>
                    <h3 class="trends-mobile-prompt">
                        Does <strong>${s.item_b?.name || "Item B"}</strong> have HIGHER or LOWER monthly searches than <strong>${s.item_a?.name || "Item A"}</strong>?
                    </h3>
                    
                    <div class="trends-action-buttons">
                        <button class="btn-trend-action btn-higher btn-giant-touch" data-trend="HIGHER">
                            <span class="trend-arrow">▲</span>
                            <span class="trend-text">HIGHER</span>
                        </button>
                        <button class="btn-trend-action btn-lower btn-giant-touch" data-trend="LOWER">
                            <span class="trend-arrow">▼</span>
                            <span class="trend-text">LOWER</span>
                        </button>
                    </div>

                    <div class="streak-indicator-pill">
                        🔥 Current Streak: <strong>${s.my_streak || 0}</strong> (Score Multiplier Active!)
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <div class="brand-sub">ODOMETER REVEAL</div>
                    <h3>ROUND RESULT</h3>
                    <div class="reveal-score-number" style="color: ${s.my_result?.is_correct ? '#10b981' : '#f43f5e'}; font-size: 1.8rem;">
                        ${s.my_result?.is_correct ? '✓ BULLSEYE!' : '❌ INCORRECT'}
                    </div>
                    <div class="streak-badge-result">
                        🔥 Streak: ${s.my_result?.streak || 0}
                    </div>
                    <p style="color: #34d399; font-weight: 800; font-size: 1.1rem; margin-top: 0.6rem;">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    private bindControllerActions() {
        // Candidate selection (Mafia & Imposter)
        this.container.querySelectorAll(".btn-target").forEach(btn => {
            btn.addEventListener("click", () => {
                soundManager.playDing();
                const action = btn.getAttribute("data-action");
                const targetId = btn.getAttribute("data-target-id");
                if (action && targetId) {
                    this.socket.send("GAME_ACTION", { action, data: { target_id: targetId } });
                }
            });
        });

        // Imposter privacy card toggle
        const toggleSecretBtn = this.container.querySelector("#btn-toggle-secret-card");
        const secretCardBody = this.container.querySelector("#secret-card-body");
        const toggleCard = () => {
            this.isCardRevealed = !this.isCardRevealed;
            this.render();
        };
        if (toggleSecretBtn) toggleSecretBtn.addEventListener("click", toggleCard);
        if (secretCardBody) secretCardBody.addEventListener("click", toggleCard);

        // Imposter clutch words picker
        this.container.querySelectorAll(".btn-clutch-word").forEach(btn => {
            btn.addEventListener("click", () => {
                const word = btn.getAttribute("data-word") || "";
                const input = this.container.querySelector("#input-imposter-guess") as HTMLInputElement;
                if (input) input.value = word;
            });
        });

        // Imposter guess submit
        this.container.querySelector("#btn-submit-imposter-guess")?.addEventListener("click", () => {
            const input = this.container.querySelector("#input-imposter-guess") as HTMLInputElement;
            if (input && input.value.trim()) {
                soundManager.playDing();
                this.socket.send("GAME_ACTION", { action: "GUESS_WORD", data: { guess: input.value.trim() } });
            }
        });

        // Dialed sliders
        const sliderHue = this.container.querySelector("#slider-hue") as HTMLInputElement;
        const sliderSat = this.container.querySelector("#slider-sat") as HTMLInputElement;
        const sliderBri = this.container.querySelector("#slider-bri") as HTMLInputElement;
        const swatch = this.container.querySelector("#dial-swatch") as HTMLElement;

        if (sliderHue && sliderSat && swatch) {
            const updateSwatch = () => {
                this.dialHue = parseInt(sliderHue.value, 10);
                this.dialSat = parseInt(sliderSat.value, 10);
                if (sliderBri) this.dialBri = parseInt(sliderBri.value, 10);
                swatch.style.background = this.hsvToRgbCss(this.dialHue, this.dialSat, this.dialBri);
                const valHue = this.container.querySelector("#val-hue");
                if (valHue) valHue.textContent = `${this.dialHue}°`;
                const valSat = this.container.querySelector("#val-sat");
                if (valSat) valSat.textContent = `${this.dialSat}%`;
                const valBri = this.container.querySelector("#val-bri");
                if (valBri) valBri.textContent = `${this.dialBri}%`;
            };
            sliderHue.addEventListener("input", updateSwatch);
            sliderSat.addEventListener("input", updateSwatch);
            if (sliderBri) sliderBri.addEventListener("input", updateSwatch);
        }

        const sliderPitch = this.container.querySelector("#slider-pitch") as HTMLInputElement;
        if (sliderPitch) {
            sliderPitch.addEventListener("input", () => {
                this.dialPitch = parseInt(sliderPitch.value, 10);
                const valPitch = this.container.querySelector("#val-pitch");
                if (valPitch) valPitch.textContent = `${this.dialPitch} Hz`;
                const freqReadout = this.container.querySelector("#freq-readout");
                if (freqReadout) freqReadout.textContent = `${this.dialPitch} Hz`;
            });
        }

        this.container.querySelector("#btn-test-tone")?.addEventListener("click", () => {
            soundManager.playTone(this.dialPitch, 0.4);
        });

        this.container.querySelector("#btn-lock-dial")?.addEventListener("click", () => {
            soundManager.playDing();
            if (this.state?.round_type === "COLOR") {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_DIAL",
                    data: { h: this.dialHue, s: this.dialSat / 100.0, v: this.dialBri / 100.0 }
                });
            } else {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_DIAL",
                    data: { pitch: this.dialPitch }
                });
            }
        });

        // Fermi magnitude multipliers and submit
        const fermiInput = this.container.querySelector("#input-fermi-guess") as HTMLInputElement;
        const fermiPreview = this.container.querySelector("#fermi-preview-val");

        const updateFermiPreview = () => {
            if (fermiInput) {
                this.fermiBase = parseFloat(fermiInput.value) || 1;
            }
            const total = this.fermiBase * this.fermiMult;
            if (fermiPreview) {
                fermiPreview.textContent = `${this.formatBigNumber(total)} ${this.state?.unit || ""}`;
            }
        };

        if (fermiInput) {
            fermiInput.addEventListener("input", updateFermiPreview);
        }

        this.container.querySelectorAll(".pill-mult").forEach(btn => {
            btn.addEventListener("click", () => {
                this.container.querySelectorAll(".pill-mult").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.fermiMult = parseFloat(btn.getAttribute("data-mult") || "1");
                updateFermiPreview();
            });
        });

        this.container.querySelector("#btn-submit-fermi")?.addEventListener("click", () => {
            soundManager.playDing();
            if (fermiInput) {
                this.fermiBase = parseFloat(fermiInput.value) || 1;
            }
            const total = this.fermiBase * this.fermiMult;
            this.socket.send("GAME_ACTION", {
                action: "SUBMIT_GUESS",
                data: { guess: total }
            });
        });

        // Auction modifiers and submit
        const auctionInput = this.container.querySelector("#input-auction-bid") as HTMLInputElement;
        const auctionPreview = this.container.querySelector("#auction-preview-val");

        const updateAuctionPreview = () => {
            if (auctionInput) {
                this.auctionBid = Math.max(0, parseInt(auctionInput.value, 10) || 0);
            }
            if (auctionPreview) {
                auctionPreview.textContent = `$${this.auctionBid.toLocaleString()}`;
            }
        };

        if (auctionInput) {
            auctionInput.addEventListener("input", updateAuctionPreview);
        }

        this.container.querySelectorAll(".pill-bid").forEach(btn => {
            btn.addEventListener("click", () => {
                const add = btn.getAttribute("data-add");
                const mult = btn.getAttribute("data-mult");
                const isClear = btn.getAttribute("data-clear");

                if (isClear) {
                    this.auctionBid = 0;
                } else if (add) {
                    this.auctionBid += parseInt(add, 10);
                } else if (mult) {
                    this.auctionBid *= parseFloat(mult);
                }

                if (auctionInput) {
                    auctionInput.value = `${this.auctionBid}`;
                }
                updateAuctionPreview();
            });
        });

        this.container.querySelector("#btn-submit-auction-bid")?.addEventListener("click", () => {
            soundManager.playDing();
            if (auctionInput) {
                this.auctionBid = Math.max(0, parseInt(auctionInput.value, 10) || 0);
            }
            this.socket.send("GAME_ACTION", {
                action: "SUBMIT_BID",
                data: { bid: this.auctionBid }
            });
        });

        // Circle drawing canvas (smooth touch tracking with scaling & live loop analysis)
        const canvas = this.container.querySelector("#circle-touch-canvas") as HTMLCanvasElement;
        const feedbackEl = this.container.querySelector("#circle-live-feedback");
        if (canvas) {
            canvas.style.touchAction = "none";
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#00f0ff";
            }

            const getPos = (e: PointerEvent) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / (rect.width || 300);
                const scaleY = canvas.height / (rect.height || 300);
                return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY] as [number, number];
            };

            const updateFeedback = () => {
                if (!feedbackEl) return;
                const pts = this.circlePoints;
                if (pts.length < 15) {
                    feedbackEl.textContent = "Keep drawing full loop...";
                    (feedbackEl as HTMLElement).style.color = "var(--cyan)";
                    return;
                }
                const [x0, y0] = pts[0];
                const [xn, yn] = pts[pts.length - 1];
                const gap = Math.hypot(xn - x0, yn - y0);
                if (gap > 65 && pts.length > 25) {
                    feedbackEl.textContent = "Close the circle endpoints!";
                    (feedbackEl as HTMLElement).style.color = "#f43f5e";
                } else if (pts.length >= 30) {
                    feedbackEl.textContent = "Circle loop complete! Ready to submit.";
                    (feedbackEl as HTMLElement).style.color = "#10b981";
                } else {
                    feedbackEl.textContent = "Drawing...";
                    (feedbackEl as HTMLElement).style.color = "var(--cyan)";
                }
            };

            canvas.addEventListener("pointerdown", (e) => {
                canvas.setPointerCapture(e.pointerId);
                this.isDrawingCircle = true;
                this.circlePoints = [];
                const [x, y] = getPos(e);
                this.circlePoints.push([x, y]);
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                }
                if (feedbackEl) {
                    feedbackEl.textContent = "Drawing continuous loop...";
                    (feedbackEl as HTMLElement).style.color = "var(--cyan)";
                }
            });

            canvas.addEventListener("pointermove", (e) => {
                if (!this.isDrawingCircle) return;
                const [x, y] = getPos(e);
                this.circlePoints.push([x, y]);
                if (ctx) {
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                updateFeedback();
            });

            const stopDrawing = () => {
                this.isDrawingCircle = false;
                updateFeedback();
            };

            canvas.addEventListener("pointerup", stopDrawing);
            canvas.addEventListener("pointercancel", stopDrawing);

            this.container.querySelector("#btn-clear-circle")?.addEventListener("click", () => {
                this.circlePoints = [];
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                if (feedbackEl) {
                    feedbackEl.textContent = "Draw a single smooth loop";
                    (feedbackEl as HTMLElement).style.color = "var(--cyan)";
                }
            });

            this.container.querySelector("#btn-submit-circle")?.addEventListener("click", () => {
                if (this.circlePoints.length < 30) {
                    return alert("Please draw a full closed circle before submitting!");
                }
                soundManager.playDing();
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_CIRCLE",
                    data: { points: this.circlePoints }
                });
            });
        }

        // Trolley choice
        this.container.querySelectorAll(".dilemma-choice-card").forEach(card => {
            card.addEventListener("click", () => {
                this.container.querySelectorAll(".dilemma-choice-card").forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                this.selectedDilemmaChoice = card.getAttribute("data-choice") as "A" | "B";
            });
        });

        this.container.querySelector("#btn-submit-trolley")?.addEventListener("click", () => {
            if (!this.selectedDilemmaChoice) {
                return alert("Please select Option A or Option B first!");
            }
            soundManager.playDing();
            const betMajority = (this.container.querySelector("#check-consensus") as HTMLInputElement)?.checked ?? true;
            this.socket.send("GAME_ACTION", {
                action: "SUBMIT_CHOICE",
                data: { choice: this.selectedDilemmaChoice, bet_majority: betMajority }
            });
        });

        // Trends guess
        this.container.querySelectorAll(".btn-trend-action").forEach(btn => {
            btn.addEventListener("click", () => {
                soundManager.playDing();
                const trend = btn.getAttribute("data-trend");
                if (trend) {
                    this.socket.send("GAME_ACTION", {
                        action: "SUBMIT_GUESS",
                        data: { guess: trend }
                    });
                }
            });
        });
    }
}
