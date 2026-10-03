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
    private dialPitch: number = 440;

    constructor(container: HTMLElement, socket: PartySocket) {
        this.container = container;
        this.socket = socket;
    }

    public handleLobbyState(lobby: LobbyState) {
        if (this.state?.player_id) {
            const me = lobby.players.find(p => p.id === this.state!.player_id);
            if (me) {
                this.state.nickname = me.nickname;
                this.state.avatar = me.avatar;
                this.state.color = me.color;
            }
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

        if (this.state.state === "LOBBY") {
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
                        <input type="text" id="join-code" maxlength="4" placeholder="ABCD" value="${codeFromUrl}" class="input-code" />
                    </div>
                    <div class="form-group">
                        <label>NICKNAME</label>
                        <input type="text" id="join-nickname" maxlength="12" placeholder="Your name" value="${savedNick}" class="input-nick" />
                    </div>
                    <button id="btn-join-room" class="btn-primary-action">ENTER LOBBY</button>
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
                    <div class="avatar-large">${s.avatar || "🦊"}</div>
                    <h2>${s.nickname || "Player"}</h2>
                    <div class="room-chip">ROOM: ${s.room_code}</div>
                    <div class="waiting-indicator">
                        <div class="dot-flashing"></div>
                        <span>Waiting for host to select game and start...</span>
                    </div>
                </div>
            </div>
        `;
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
        if (!s.is_alive) return `<div class="dead-screen">👻 Eliminated! Watch the trial on TV.</div>`;

        if (s.phase === "ROLE_REVEAL") {
            return `
                <div class="role-reveal-phone">
                    <h3>SECRET ROLE</h3>
                    <div class="role-card-box">
                        <div class="role-name">${s.my_role || "VILLAGER"}</div>
                    </div>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            if (s.night_action === "MAFIA_KILL") {
                return `<h3>🔪 NIGHT ATTACK</h3>${this.renderCandidateList(s.candidates, s.my_vote, "MAFIA_KILL")}`;
            } else if (s.night_action === "DOCTOR_HEAL") {
                return `<h3>💉 HEAL SOMEONE</h3>${this.renderCandidateList(s.candidates, s.my_heal, "DOCTOR_HEAL")}`;
            } else if (s.night_action === "DETECTIVE_INVESTIGATE") {
                return `<h3>🔍 INVESTIGATE</h3>${this.renderCandidateList(s.candidates, null, "DETECTIVE_INVESTIGATE")}`;
            }
            return `<div class="panel-glass"><h3>😴 SLEEPING</h3><p style="color: #888;">Rest up for tomorrow's debate.</p></div>`;
        } else if (s.phase === "DAY_VOTE") {
            return `<h3>⚖️ VOTE SUSPECT</h3>${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE")}`;
        }
        return `<div class="panel-glass"><h3>👀 WATCH TV</h3><p style="color: #888;">Phase: ${s.phase}</p></div>`;
    }

    private renderCandidateList(candidates: any[] = [], myVote: string | null = null, actionName: string = "CAST_VOTE"): string {
        return `
            <div class="candidate-list">
                ${candidates.map((c: any) => `
                    <button class="btn-candidate ${myVote === c.id ? 'selected' : ''}" data-action="${actionName}" data-target-id="${c.id}">
                        <span class="cand-av">${c.avatar}</span>
                        <span class="cand-name">${c.nickname}</span>
                    </button>
                `).join("")}
                ${actionName === "CAST_VOTE" ? `
                    <button class="btn-candidate btn-skip ${myVote === 'SKIP' ? 'selected' : ''}" data-action="CAST_VOTE" data-target-id="SKIP">
                        ⏭️ SKIP VOTE
                    </button>
                ` : ""}
            </div>
        `;
    }

    // 2. IMPOSTER
    private renderImposterController(): string {
        const s = this.state!;
        if (s.phase === "WORD_REVEAL") {
            return `
                <div class="secret-word-card">
                    <div class="brand-sub">YOUR SECRET ASSIGNMENT</div>
                    <div class="word-display">${s.is_imposter ? "❓ YOU ARE THE IMPOSTER" : `🔑 ${s.secret_word}`}</div>
                    ${s.is_imposter && s.imposter_hint ? `<div class="imposter-hint-box">💡 Hint: ${s.imposter_hint}</div>` : ""}
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `<h3>🗳️ WHO IS THE IMPOSTER?</h3>${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE")}`;
        } else if (s.phase === "IMPOSTER_GUESS" && s.is_imposter) {
            return `
                <div class="guess-form">
                    <h3>🎯 CLUTCH GUESS</h3>
                    <p style="color: var(--text-dim); margin-bottom: 1rem;">Guess the secret word to win!</p>
                    <input type="text" id="input-imposter-guess" placeholder="Enter secret word..." />
                    <button id="btn-submit-imposter-guess" class="btn-primary-action" style="margin-top: 0.8rem;">SUBMIT GUESS</button>
                </div>
            `;
        }
        return `<div class="panel-glass"><h3>👀 DISCUSS</h3><p style="color: #888;">Follow the speaking order on TV!</p></div>`;
    }

    // 3. DIALED
    private renderDialedController(): string {
        const s = this.state!;
        if (s.phase === "INSPECT") {
            return `<div class="panel-glass"><h3>👀 WATCH THE TV SCREEN</h3><p style="color: #888;">Memorize the target ${s.round_type === 'COLOR' ? 'color' : 'tone'}!</p></div>`;
        } else if (s.phase === "DIAL") {
            if (s.has_locked) {
                return `<div class="panel-glass"><h3>✓ LOCKED IN!</h3><p style="color: #888;">Waiting for other players...</p></div>`;
            }

            if (s.round_type === "COLOR") {
                return `
                    <div class="dial-controller">
                        <h3>🎨 MATCH THE COLOR</h3>
                        <div id="dial-swatch" style="background: hsl(${this.dialHue}, ${this.dialSat}%, 50%); width: 140px; height: 140px; border-radius: 20px; margin: 1rem auto; box-shadow: 0 8px 24px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.2);"></div>
                        <div class="form-group">
                            <label>HUE (${this.dialHue}°)</label>
                            <input type="range" id="slider-hue" min="0" max="360" value="${this.dialHue}" style="width: 100%;" />
                        </div>
                        <div class="form-group">
                            <label>SATURATION (${this.dialSat}%)</label>
                            <input type="range" id="slider-sat" min="20" max="100" value="${this.dialSat}" style="width: 100%;" />
                        </div>
                        <button id="btn-lock-dial" class="btn-primary-action" style="margin-top: 1rem;">LOCK IN COLOR</button>
                    </div>
                `;
            } else {
                return `
                    <div class="dial-controller">
                        <h3>🎵 MATCH THE PITCH</h3>
                        <div class="tone-icon" style="font-size: 3rem; margin: 1rem 0;">📻</div>
                        <div class="form-group">
                            <label>FREQUENCY (${this.dialPitch} Hz)</label>
                            <input type="range" id="slider-pitch" min="150" max="600" value="${this.dialPitch}" style="width: 100%;" />
                        </div>
                        <button id="btn-test-tone" class="btn-candidate" style="margin-bottom: 0.8rem;">🔊 PLAY MY TONE</button>
                        <button id="btn-lock-dial" class="btn-primary-action">LOCK IN PITCH</button>
                    </div>
                `;
            }
        } else {
            return `
                <div class="panel-glass">
                    <h3>ACCURACY REVEAL</h3>
                    <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary); margin: 0.8rem 0;">
                        ${s.my_result ? `${s.my_result.score_pct}% Precision` : 'Watching TV'}
                    </div>
                    <p style="color: #888;">+${s.my_result?.points_awarded || 0} pts earned!</p>
                </div>
            `;
        }
    }

    // 4. FERMI
    private renderFermiController(): string {
        const s = this.state!;
        if (s.phase === "QUESTION") {
            if (s.has_locked) {
                return `<div class="panel-glass"><h3>✓ ESTIMATE LOCKED</h3><p style="color: #888;">Submitted: ${s.my_guess?.toLocaleString()} ${s.unit}</p></div>`;
            }
            return `
                <div class="fermi-controller">
                    <h3>🪐 YOUR ESTIMATE</h3>
                    <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 0.8rem;">${s.prompt || ""}</p>
                    <input type="number" id="input-fermi-guess" placeholder="Enter number..." class="input-code" style="font-size: 1.4rem;" />
                    <div class="multiplier-pills" style="display: flex; gap: 0.4rem; margin: 0.8rem 0;">
                        <button class="pill-mag" data-mult="1000">x1K</button>
                        <button class="pill-mag" data-mult="1000000">x1M</button>
                        <button class="pill-mag" data-mult="1000000000">x1B</button>
                    </div>
                    <button id="btn-submit-fermi" class="btn-primary-action">LOCK IN ESTIMATE</button>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <h3>VALUE REVEAL</h3>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary); margin: 0.8rem 0;">
                        Actual: ${s.actual?.toLocaleString()} ${s.unit}
                    </div>
                    <p style="color: #888;">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    // 5. AUCTION
    private renderAuctionController(): string {
        const s = this.state!;
        if (s.phase === "CATALOG") {
            return `<div class="panel-glass"><h3>🏛️ LOT CATALOG</h3><p style="color: #888;">Inspect ${s.item_title} on the TV screen!</p></div>`;
        } else if (s.phase === "BIDDING") {
            if (s.has_bid) {
                return `<div class="panel-glass"><h3>✓ BID PLACED</h3><p style="color: #888;">Your secret valuation: $${s.my_bid?.toLocaleString()}</p></div>`;
            }
            return `
                <div class="auction-controller">
                    <h3>🔨 PLACE SECRET BID</h3>
                    <p style="color: var(--text-dim); font-size: 0.9rem; margin-bottom: 0.8rem;">Closest bid without going over wins!</p>
                    <input type="number" id="input-auction-bid" placeholder="Amount in USD ($)" class="input-code" style="font-size: 1.4rem;" />
                    <button id="btn-submit-auction-bid" class="btn-primary-action" style="margin-top: 1rem;">PLACE SECRET BID</button>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <h3>HAMMER PRICE</h3>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary); margin: 0.8rem 0;">
                        $${s.hammer_price?.toLocaleString()}
                    </div>
                    <p style="color: #888;">${s.my_result?.won_lot ? '🏆 You won the lot!' : (s.my_result?.went_over ? '❌ You went over' : 'Under bid')}</p>
                    <p style="color: var(--accent);">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    // 6. CIRCLE
    private renderCircleController(): string {
        const s = this.state!;
        if (s.phase === "DRAWING") {
            if (s.has_drawn) {
                return `<div class="panel-glass"><h3>✓ CIRCLE SUBMITTED!</h3><p style="color: #888;">Analyzing circularity geometry...</p></div>`;
            }
            return `
                <div class="circle-controller">
                    <h3>⭕ DRAW A CIRCLE</h3>
                    <p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: 0.5rem;">Single smooth closed stroke. Complete the loop!</p>
                    <canvas id="circle-touch-canvas" width="300" height="300" style="background: rgba(255,255,255,0.03); border: 2px dashed rgba(255,255,255,0.2); border-radius: 50%; touch-action: none; margin: 0 auto; display: block;"></canvas>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <h3>CIRCULARITY SCORE</h3>
                    <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin: 0.8rem 0;">
                        ${s.my_eval?.score_pct || 0}%
                    </div>
                    <p style="color: #888;">+${s.my_eval?.points || 0} pts earned!</p>
                </div>
            `;
        }
    }

    // 7. TROLLEY
    private renderTrolleyController(): string {
        const s = this.state!;
        if (s.phase === "CHOICE") {
            if (s.has_chosen) {
                return `<div class="panel-glass"><h3>✓ CHOICE LOCKED</h3><p style="color: #888;">Waiting for room reveal...</p></div>`;
            }
            return `
                <div class="trolley-controller">
                    <h3>MAKE YOUR CHOICE</h3>
                    <div class="trolley-choice-cards">
                        <button class="btn-dilemma-choice" data-choice="A">
                            <span class="icon">${s.icon_a || "🅰️"}</span>
                            <strong>OPTION A</strong>
                            <p>${s.option_a || ""}</p>
                        </button>
                        <button class="btn-dilemma-choice" data-choice="B">
                            <span class="icon">${s.icon_b || "🅱️"}</span>
                            <strong>OPTION B</strong>
                            <p>${s.option_b || ""}</p>
                        </button>
                    </div>
                    <label class="consensus-bet-label" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 1rem 0; cursor: pointer;">
                        <input type="checkbox" id="check-consensus" checked />
                        <span>I bet the room majority will agree with me (+500 pts)</span>
                    </label>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <h3>ROOM CONSENSUS</h3>
                    <p style="color: #888;">Majority: Option ${s.majority_choice || 'TIE'}</p>
                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary); margin: 0.8rem 0;">
                        ${s.my_result?.predicted_correctly ? '🎯 Prediction Correct!' : '❌ Missed Consensus'}
                    </div>
                    <p style="color: var(--accent);">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    // 8. TRENDS
    private renderTrendsController(): string {
        const s = this.state!;
        if (s.phase === "GUESS") {
            if (s.has_guessed) {
                return `<div class="panel-glass"><h3>✓ GUESS LOCKED</h3><p style="color: #888;">Guessed: ${s.my_guess}. Watching reveal...</p></div>`;
            }
            return `
                <div class="trends-controller">
                    <h3>HIGHER OR LOWER?</h3>
                    <p style="color: var(--text-dim); margin-bottom: 1rem;">Does ${s.item_b?.name} have HIGHER or LOWER monthly searches?</p>
                    <div class="trends-btn-row" style="display: flex; gap: 1rem;">
                        <button class="btn-trend-action btn-higher" data-trend="HIGHER" style="flex: 1; padding: 1.5rem; font-size: 1.3rem; border-radius: 16px; background: #10b981; color: white; border: none; font-weight: 700;">
                            ▲ HIGHER
                        </button>
                        <button class="btn-trend-action btn-lower" data-trend="LOWER" style="flex: 1; padding: 1.5rem; font-size: 1.3rem; border-radius: 16px; background: #f43f5e; color: white; border: none; font-weight: 700;">
                            ▼ LOWER
                        </button>
                    </div>
                    <div class="streak-indicator" style="margin-top: 1.5rem; color: #f59e0b; font-weight: 600;">
                        🔥 Current Streak: ${s.my_streak || 0}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="panel-glass">
                    <h3>TRENDS REVEAL</h3>
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary); margin: 0.8rem 0;">
                        ${s.my_result?.is_correct ? '✓ Correct Guess!' : '❌ Incorrect'}
                    </div>
                    <p style="color: #888;">Streak: ${s.my_result?.streak || 0}</p>
                    <p style="color: var(--accent);">+${s.my_result?.points || 0} pts</p>
                </div>
            `;
        }
    }

    private bindControllerActions() {
        // Candidate selection (Mafia & Imposter)
        this.container.querySelectorAll(".btn-candidate").forEach(btn => {
            btn.addEventListener("click", () => {
                const action = btn.getAttribute("data-action");
                const targetId = btn.getAttribute("data-target-id");
                if (action && targetId) {
                    this.socket.send("GAME_ACTION", { action, data: { target_id: targetId } });
                }
            });
        });

        // Imposter guess
        this.container.querySelector("#btn-submit-imposter-guess")?.addEventListener("click", () => {
            const input = this.container.querySelector("#input-imposter-guess") as HTMLInputElement;
            if (input && input.value.trim()) {
                this.socket.send("GAME_ACTION", { action: "GUESS_WORD", data: { guess: input.value.trim() } });
            }
        });

        // Dialed sliders
        const sliderHue = this.container.querySelector("#slider-hue") as HTMLInputElement;
        const sliderSat = this.container.querySelector("#slider-sat") as HTMLInputElement;
        const swatch = this.container.querySelector("#dial-swatch") as HTMLElement;

        if (sliderHue && sliderSat && swatch) {
            const updateSwatch = () => {
                this.dialHue = parseInt(sliderHue.value, 10);
                this.dialSat = parseInt(sliderSat.value, 10);
                swatch.style.background = `hsl(${this.dialHue}, ${this.dialSat}%, 50%)`;
                const hueLabel = sliderHue.parentElement?.querySelector("label");
                if (hueLabel) hueLabel.textContent = `HUE (${this.dialHue}°)`;
                const satLabel = sliderSat.parentElement?.querySelector("label");
                if (satLabel) satLabel.textContent = `SATURATION (${this.dialSat}%)`;
            };
            sliderHue.addEventListener("input", updateSwatch);
            sliderSat.addEventListener("input", updateSwatch);
        }

        const sliderPitch = this.container.querySelector("#slider-pitch") as HTMLInputElement;
        if (sliderPitch) {
            sliderPitch.addEventListener("input", () => {
                this.dialPitch = parseInt(sliderPitch.value, 10);
                const pitchLabel = sliderPitch.parentElement?.querySelector("label");
                if (pitchLabel) pitchLabel.textContent = `FREQUENCY (${this.dialPitch} Hz)`;
            });
        }

        this.container.querySelector("#btn-test-tone")?.addEventListener("click", () => {
            soundManager.playTone(this.dialPitch, 0.4);
        });

        this.container.querySelector("#btn-lock-dial")?.addEventListener("click", () => {
            if (this.state?.round_type === "COLOR") {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_DIAL",
                    data: { h: this.dialHue, s: this.dialSat / 100.0, v: 1.0 }
                });
            } else {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_DIAL",
                    data: { pitch: this.dialPitch }
                });
            }
        });

        // Fermi magnitude multipliers and submit
        this.container.querySelectorAll(".pill-mag").forEach(btn => {
            btn.addEventListener("click", () => {
                const mult = parseFloat(btn.getAttribute("data-mult") || "1");
                const input = this.container.querySelector("#input-fermi-guess") as HTMLInputElement;
                if (input) {
                    const current = parseFloat(input.value) || 1;
                    input.value = `${current * mult}`;
                }
            });
        });

        this.container.querySelector("#btn-submit-fermi")?.addEventListener("click", () => {
            const input = this.container.querySelector("#input-fermi-guess") as HTMLInputElement;
            if (input && input.value) {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_GUESS",
                    data: { guess: parseFloat(input.value) }
                });
            }
        });

        // Auction bid
        this.container.querySelector("#btn-submit-auction-bid")?.addEventListener("click", () => {
            const input = this.container.querySelector("#input-auction-bid") as HTMLInputElement;
            if (input && input.value) {
                this.socket.send("GAME_ACTION", {
                    action: "SUBMIT_BID",
                    data: { bid: parseInt(input.value, 10) }
                });
            }
        });

        // Circle drawing canvas (zero network flood during stroke!)
        const canvas = this.container.querySelector("#circle-touch-canvas") as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#00f0ff";
            }

            const getPos = (e: PointerEvent) => {
                const rect = canvas.getBoundingClientRect();
                return [e.clientX - rect.left, e.clientY - rect.top] as [number, number];
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
            });

            canvas.addEventListener("pointermove", (e) => {
                if (!this.isDrawingCircle) return;
                const [x, y] = getPos(e);
                this.circlePoints.push([x, y]);
                if (ctx) {
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            });

            const finishCircle = () => {
                if (!this.isDrawingCircle) return;
                this.isDrawingCircle = false;
                if (this.circlePoints.length >= 20) {
                    // Send single message with array of points on stroke end
                    this.socket.send("GAME_ACTION", {
                        action: "SUBMIT_CIRCLE",
                        data: { points: this.circlePoints }
                    });
                }
            };

            canvas.addEventListener("pointerup", finishCircle);
            canvas.addEventListener("pointercancel", finishCircle);
        }

        // Trolley choice
        this.container.querySelectorAll(".btn-dilemma-choice").forEach(btn => {
            btn.addEventListener("click", () => {
                const choice = btn.getAttribute("data-choice");
                const betMajority = (this.container.querySelector("#check-consensus") as HTMLInputElement)?.checked ?? true;
                if (choice) {
                    this.socket.send("GAME_ACTION", {
                        action: "SUBMIT_CHOICE",
                        data: { choice, bet_majority: betMajority }
                    });
                }
            });
        });

        // Trends guess
        this.container.querySelectorAll(".btn-trend-action").forEach(btn => {
            btn.addEventListener("click", () => {
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
