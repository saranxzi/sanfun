import type { HostGameState } from "../types";
import { PartySocket } from "../PartySocket";
import { soundManager } from "../sound";

export class HostGameView {
    private container: HTMLElement;
    private socket: PartySocket;
    private state: HostGameState | null = null;
    private lastPhase: string = "";
    private maxPhaseDuration: number = 15;
    private timerInterval: number | null = null;

    constructor(container: HTMLElement, socket: PartySocket) {
        this.container = container;
        this.socket = socket;
    }

    public updateState(state: HostGameState) {
        if (state.phase !== this.lastPhase) {
            this.handlePhaseTransition(state.phase, state);
            this.lastPhase = state.phase;
            this.maxPhaseDuration = state.phase_timer > 0 ? state.phase_timer : 15;
            this.startLocalTimer();
        } else if (typeof state.phase_timer === "number" && Math.abs((this.state?.phase_timer || 0) - state.phase_timer) > 2) {
            if (this.state) this.state.phase_timer = state.phase_timer;
        }
        this.state = state;
        this.render();
    }

    public updateTimerTick(phaseTimer: number) {
        if (this.state) {
            this.state.phase_timer = phaseTimer;
            this.updateTimerDisplay();
        }
    }

    public handleGameEvent(_event: { event: string; [key: string]: any }) {
        // Reserved for audio-visual cues
    }

    private startLocalTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = window.setInterval(() => {
            if (this.state && this.state.phase_timer > 0) {
                this.state.phase_timer = Math.max(0, this.state.phase_timer - 0.1);
                this.updateTimerDisplay();
            }
        }, 100);
    }

    private updateTimerDisplay() {
        if (!this.state) return;
        const timerNum = this.container.querySelector(".timer-number");
        if (timerNum) timerNum.textContent = `${Math.ceil(this.state.phase_timer)}`;
        const timerBar = this.container.querySelector(".timer-bar") as HTMLElement;
        if (timerBar && this.maxPhaseDuration > 0) {
            const pct = Math.min(100, Math.max(0, (this.state.phase_timer / this.maxPhaseDuration) * 100));
            timerBar.style.width = `${pct}%`;
        }
    }

    private handlePhaseTransition(newPhase: string, state: HostGameState) {
        if (newPhase === "DAY_DAWN" || newPhase === "DAY_EXECUTION" || newPhase === "HAMMER") soundManager.playGong();
        else if (newPhase === "REVEAL" || newPhase === "SHOWCASE") soundManager.playDing();
        else if (newPhase === "GAME_OVER") soundManager.playVictory();
        else if (state.game_id === "dialed" && newPhase === "INSPECT" && state.round_type === "PITCH" && state.target_pitch) {
            soundManager.playTone(state.target_pitch.freq, 2.5);
        } else {
            soundManager.playTone(400, 0.1, "sine");
        }
    }

    public render() {
        if (!this.state) return;

        let content = "";
        switch (this.state.game_id) {
            case "mafia": content = this.renderMafia(); break;
            case "imposter": content = this.renderImposter(); break;
            case "dialed": content = this.renderDialed(); break;
            case "fermi": content = this.renderFermi(); break;
            case "auction": content = this.renderAuction(); break;
            case "circle": content = this.renderCircle(); break;
            case "trolley": content = this.renderTrolley(); break;
            case "trends": content = this.renderTrends(); break;
            default: content = `<div>Unknown Game: ${this.state.game_id}</div>`;
        }

        this.container.innerHTML = `
            <div class="party-host-game">
                <div class="game-header">
                    <div class="game-badge">
                        <span class="room-tag">ROOM ${this.state.room_code}</span>
                        <span class="game-title">${this.state.game_id.toUpperCase()}</span>
                    </div>
                    <div class="timer-box">
                        <span class="timer-number">${Math.ceil(this.state.phase_timer)}</span>
                        <div class="timer-bar" style="width: ${Math.min(100, (this.state.phase_timer / 30) * 100)}%;"></div>
                    </div>
                    <button id="btn-host-lobby" class="btn-lobby-return">LOBBY</button>
                </div>
                <div class="game-content-area">${content}</div>
            </div>
        `;

        this.container.querySelector("#btn-host-lobby")?.addEventListener("click", () => {
            if (confirm("Return to party lobby? Current game will end.")) this.socket.send("BACK_TO_LOBBY");
        });

        this.container.querySelector("#btn-play-again")?.addEventListener("click", () => {
            soundManager.playStart();
            this.socket.send("START_GAME");
        });

        this.container.querySelector("#btn-gameover-lobby")?.addEventListener("click", () => {
            this.socket.send("BACK_TO_LOBBY");
        });
    }

    private renderGameOverActions(): string {
        return `
            <div class="gameover-actions">
                <button id="btn-play-again" class="btn-play-again">🔄 PLAY AGAIN</button>
                <button id="btn-gameover-lobby" class="btn-secondary-lobby">🏠 BACK TO LOBBY</button>
            </div>
        `;
    }

    private renderPodium(title: string): string {
        const sorted = [...(this.state?.players || [])].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
        return `
            <div class="phase-card">
                <h1>${title}</h1>
                <div class="podium-grid">
                    ${sorted.slice(0, 3).map((p: any, idx: number) => `
                        <div class="podium-item rank-${idx + 1}">
                            <span class="podium-avatar">${p.avatar}</span>
                            <span class="podium-name">${p.nickname}</span>
                            <div class="podium-rank">#${idx + 1}</div>
                            <span class="podium-score">${p.score || 0} pts</span>
                        </div>
                    `).join("")}
                </div>
                ${this.renderGameOverActions()}
            </div>
        `;
    }

    private renderSubmittedChips(submittedPids: string[] = []): string {
        const players = this.state?.players || [];
        return `
            <div class="submitted-chips-bar">
                ${players.map((p: any) => {
                    const done = submittedPids.includes(p.id);
                    return `
                        <div class="player-chip ${done ? 'chip-done' : 'chip-waiting'}">
                            <span>${p.avatar}</span>
                            <span>${p.nickname}</span>
                            <span>${done ? '✓' : '...'}</span>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    // 1. MAFIA
    private renderMafia(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🐺 MAFIA OVER • ${s.winner === "TOWN" ? "VILLAGE TRIUMPH" : "MAFIA TAKEOVER"}`);

        return `
            <div class="phase-card">
                <div class="phase-badge">${s.phase.replace("_", " ")}</div>
                <h2>${s.phase === "NIGHT_ACTIONS" ? "🌙 The Night is Silent..." : (s.phase === "DAY_DEBATE" ? "☀️ Village Assembly" : "⚖️ Voting in Progress")}</h2>
                <div class="player-roster-grid">
                    ${(s.players || []).map((p: any) => `
                        <div class="player-card ${p.is_alive ? '' : 'eliminated'}">
                            <span class="avatar">${p.avatar}</span>
                            <span class="name">${p.nickname}</span>
                            <span class="status">${p.is_alive ? 'Alive' : '💀 Executed'}</span>
                        </div>
                    `).join("")}
                </div>
                ${s.history_log ? `<div class="history-log"><p>${s.history_log[s.history_log.length - 1] || ""}</p></div>` : ""}
            </div>
        `;
    }

    // 2. IMPOSTER
    private renderImposter(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🕵️ IMPOSTER OVER • ${s.winner} WINS`);

        return `
            <div class="phase-card">
                <div class="phase-badge">CATEGORY: ${s.category || "General"}</div>
                <h2>${s.phase === "WORD_REVEAL" ? "Secret Words Revealed on Phones..." : (s.phase === "CLUE_ROUNDS" ? "🗣️ Speak Your Clues in Order" : "🗳️ Vote for the Imposter")}</h2>
                <div class="clue-speaker-track">
                    ${(s.clue_order || []).map((pid: string, idx: number) => {
                        const p = s.players.find((pl: any) => pl.id === pid);
                        return `
                            <div class="speaker-pill">
                                <span class="order">#${idx + 1}</span>
                                <span>${p?.avatar || "👤"}</span>
                                <span>${p?.nickname || pid}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
                ${this.renderSubmittedChips(s.submitted_pids || [])}
            </div>
        `;
    }

    // 3. DIALED
    private renderDialed(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🎯 DIALED CHAMPIONS`);

        if (s.phase === "INSPECT") {
            const isColor = s.round_type === "COLOR";
            const col = s.target_color || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">ROUND ${s.round_number || 1} • ${s.round_type} RECALL</div>
                    <h2>${isColor ? `Memorize: ${col.name || 'Target Color'}` : `Listen Closely: ${s.target_pitch?.name || 'Target Tone'}`}</h2>
                    ${isColor ? `
                        <div class="target-swatch" style="background: hsl(${col.h}, ${col.s * 100}%, ${col.v * 50}%); width: 200px; height: 200px; border-radius: 24px; margin: 1.5rem auto; box-shadow: 0 12px 40px rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);"></div>
                    ` : `
                        <div class="target-tone-card" style="margin: 2rem auto; font-size: 3rem;">🎵</div>
                    `}
                    <p style="color: var(--text-dim);">Lock this memory in. Phone screens will open when timer reaches zero.</p>
                </div>
            `;
        } else if (s.phase === "DIAL") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">DIALING IN PROGRESS</div>
                    <h2>Tune Your Phones to the Exact ${s.round_type === "COLOR" ? "Color Hue" : "Audio Pitch"}</h2>
                    <p style="color: var(--text-dim); margin-bottom: 2rem;">Closest precision wins maximum points!</p>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // REVEAL
            const results = s.round_results || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">ACCURACY REVEAL</div>
                    <h2>Precision Results</h2>
                    <div class="dial-reveal-grid">
                        ${(s.players || []).map((p: any) => {
                            const r = results[p.id];
                            return `
                                <div class="dial-result-card">
                                    <div class="user-row"><span>${p.avatar}</span> <strong>${p.nickname}</strong></div>
                                    <div class="score-row">${r ? `${r.score_pct}% Precision` : 'No Entry'}</div>
                                    <div class="pts-row">+${r ? r.points_awarded : 0} pts</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }

    // 4. FERMI ESTIMATOR
    private renderFermi(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🪐 FERMI ESTIMATOR CHAMPIONS`);

        if (s.phase === "QUESTION") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">ORDER OF MAGNITUDE ESTIMATE</div>
                    <h1 class="fermi-prompt">${s.prompt || ""}</h1>
                    <div class="fermi-unit">Measured in: <strong>${s.unit || "units"}</strong></div>
                    <p style="color: var(--text-dim); margin: 1.5rem 0;">Submit your numerical estimate on your phone.</p>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // REVEAL
            const results = s.round_results || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">ACTUAL VALUE REVEAL</div>
                    <div class="actual-value-box">
                        <span class="actual-num">${typeof s.actual === "number" ? s.actual.toLocaleString() : s.actual}</span>
                        <span class="actual-unit">${s.unit || ""}</span>
                    </div>
                    <p class="fact-box">💡 ${s.fact || ""}</p>
                    <div class="fermi-results-list">
                        ${(s.players || []).map((p: any) => {
                            const r = results[p.id];
                            return `
                                <div class="fermi-res-item">
                                    <span class="av">${p.avatar} ${p.nickname}</span>
                                    <span class="guess">Guess: ${r ? (typeof r.guess === "number" ? r.guess.toLocaleString() : r.guess) : 0}</span>
                                    <span class="diff">${r ? `±${r.d_log} orders` : 'Missed'}</span>
                                    <span class="pts">+${r ? r.points : 0} pts</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }

    // 5. AUCTION
    private renderAuction(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🏛️ AUCTION HOUSE CHAMPIONS`);

        if (s.phase === "CATALOG" || s.phase === "BIDDING") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">LOT CATALOG • ${s.item_category || "Fine Art"}</div>
                    <div class="lot-icon" style="font-size: 4rem; margin: 1rem 0;">${s.item_icon || "🏺"}</div>
                    <h1>${s.item_title || "Rare Collectible"}</h1>
                    <p class="lot-desc" style="max-width: 650px; margin: 0.5rem auto 1.5rem; color: var(--text-dim);">${s.item_description || ""}</p>
                    <div class="auction-rule-banner">🔨 Closest secret bid without going over the hammer price wins the lot!</div>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // HAMMER
            const results = s.round_results || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">HAMMER PRICE REVEAL</div>
                    <div class="hammer-banner">
                        <span class="gavel">🔨</span>
                        <span class="price">$${typeof s.hammer_price === "number" ? s.hammer_price.toLocaleString() : s.hammer_price}</span>
                    </div>
                    <p class="fact-box">🏛️ ${s.fact || ""}</p>
                    <div class="bids-grid">
                        ${(s.players || []).map((p: any) => {
                            const r = results[p.id];
                            const won = r?.won_lot;
                            const over = r?.went_over;
                            return `
                                <div class="bid-card ${won ? 'won' : (over ? 'over' : '')}">
                                    <div class="bid-user">${p.avatar} ${p.nickname}</div>
                                    <div class="bid-val">$${r?.bid ? r.bid.toLocaleString() : 0}</div>
                                    <div class="bid-status">${won ? '🏆 WON LOT' : (over ? '❌ WENT OVER' : 'Under')}</div>
                                    <div class="bid-pts">+${r?.points || 0} pts</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }

    // 6. CIRCLE
    private renderCircle(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`⭕ CIRCLE PERFECTION CHAMPIONS`);

        if (s.phase === "DRAWING") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">FREEHAND DRAWING</div>
                    <h1>Draw a Perfect Circle on Your Phone</h1>
                    <div class="guide-circle-demo">
                        <div class="dashed-circle"></div>
                    </div>
                    <p style="color: var(--text-dim); margin-top: 1rem;">Single continuous closed stroke. Pratt mathematical fit evaluating roundness.</p>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // SHOWCASE
            const evals = s.evals || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">MATHEMATICAL CIRCULARITY</div>
                    <h1>Circle Precision Scores</h1>
                    <div class="circle-eval-grid">
                        ${(s.players || []).map((p: any) => {
                            const e = evals[p.id];
                            return `
                                <div class="circle-card">
                                    <div class="user-row">${p.avatar} <strong>${p.nickname}</strong></div>
                                    <div class="circle-score">${e ? `${e.score_pct}%` : '0%'}</div>
                                    <div class="circle-metrics">
                                        <span>Coverage: ${e?.metrics?.angular_coverage_pct || 0}%</span>
                                    </div>
                                    <div class="circle-pts">+${e?.points || 0} pts</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }

    // 7. TROLLEY
    private renderTrolley(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`🚋 ABSURD DILEMMAS CHAMPIONS`);

        if (s.phase === "CHOICE") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">THE DILEMMA</div>
                    <h1>${s.dilemma_title || "Choose Your Fate"}</h1>
                    <div class="dilemma-cards-container">
                        <div class="dilemma-split-card side-a">
                            <span class="icon">${s.icon_a || "🅰️"}</span>
                            <h3>OPTION A</h3>
                            <p>${s.option_a || ""}</p>
                        </div>
                        <div class="split-vs">VS</div>
                        <div class="dilemma-split-card side-b">
                            <span class="icon">${s.icon_b || "🅱️"}</span>
                            <h3>OPTION B</h3>
                            <p>${s.option_b || ""}</p>
                        </div>
                    </div>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // REVEAL
            const a = s.tally?.A || 0;
            const b = s.tally?.B || 0;
            const total = Math.max(1, a + b);
            const aPct = Math.round((a / total) * 100);
            const bPct = Math.round((b / total) * 100);
            const res = s.round_results || {};

            return `
                <div class="phase-card">
                    <div class="phase-badge">ROOM CONSENSUS REVEAL</div>
                    <h1>${s.majority_choice === "TIE" ? "⚡ CHAOS! EXACT 50-50 TIE!" : `Majority Picked OPTION ${s.majority_choice}`}</h1>
                    <div class="consensus-meter">
                        <div class="meter-a" style="width: ${aPct}%;">Option A: ${aPct}% (${a})</div>
                        <div class="meter-b" style="width: ${bPct}%;">Option B: ${bPct}% (${b})</div>
                    </div>
                    <div class="trolley-results-list">
                        ${(s.players || []).map((p: any) => {
                            const r = res[p.id];
                            return `
                                <div class="trolley-res-pill">
                                    <span>${p.avatar} ${p.nickname}</span>
                                    <span>Picked ${r?.choice || 'None'}</span>
                                    <span>${r?.predicted_correctly ? '🎯 Bet Correct' : '❌ Bet Missed'}</span>
                                    <span>+${r?.points || 0} pts</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }

    // 8. TRENDS
    private renderTrends(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium(`📈 HIGHER OR LOWER CHAMPIONS`);

        const a = s.item_a || {};
        const b = s.item_b || {};

        if (s.phase === "GUESS") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">SEARCH VOLUME BATTLE</div>
                    <h1>Higher or Lower?</h1>
                    <div class="trends-arena">
                        <div class="trend-item known">
                            <span class="icon">${a.icon || "📦"}</span>
                            <h2>${a.name || ""}</h2>
                            <div class="vol">${typeof a.volume === "number" ? a.volume.toLocaleString() : a.volume} searches/mo</div>
                        </div>
                        <div class="trends-vs">VS</div>
                        <div class="trend-item unknown">
                            <span class="icon">${b.icon || "❓"}</span>
                            <h2>${b.name || ""}</h2>
                            <div class="vol mystery">??? searches/mo</div>
                        </div>
                    </div>
                    ${this.renderSubmittedChips(s.submitted_pids || [])}
                </div>
            `;
        } else {
            // REVEAL
            const results = s.round_results || {};
            return `
                <div class="phase-card">
                    <div class="phase-badge">TRENDS REVEAL</div>
                    <div class="trends-arena">
                        <div class="trend-item known">
                            <span class="icon">${a.icon || "📦"}</span>
                            <h2>${a.name || ""}</h2>
                            <div class="vol">${typeof a.volume === "number" ? a.volume.toLocaleString() : a.volume} / mo</div>
                        </div>
                        <div class="trends-vs">${s.relation === "HIGHER" ? '▲ HIGHER' : '▼ LOWER'}</div>
                        <div class="trend-item known highlight">
                            <span class="icon">${b.icon || "📦"}</span>
                            <h2>${b.name || ""}</h2>
                            <div class="vol">${typeof b.volume === "number" ? b.volume.toLocaleString() : b.volume} / mo</div>
                        </div>
                    </div>
                    <div class="trends-results-list">
                        ${(s.players || []).map((p: any) => {
                            const r = results[p.id];
                            return `
                                <div class="trend-res-row">
                                    <span>${p.avatar} ${p.nickname}</span>
                                    <span>Guessed ${r?.guess || 'None'}</span>
                                    <span>${r?.is_correct ? `✓ Correct (🔥 Streak ${r.streak})` : '❌ Wrong'}</span>
                                    <span>+${r?.points || 0} pts</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        }
    }
}
