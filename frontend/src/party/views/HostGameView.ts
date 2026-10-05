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

    public destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
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

    private formatBigNumber(val: number | string): string {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num)) return "0";
        if (num >= 1e21) return `${(num / 1e21).toLocaleString(undefined, { maximumFractionDigits: 2 })} Sextillion (${num.toExponential(2)})`;
        if (num >= 1e18) return `${(num / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} Quintillion (${num.toExponential(2)})`;
        if (num >= 1e15) return `${(num / 1e15).toLocaleString(undefined, { maximumFractionDigits: 2 })} Quadrillion`;
        if (num >= 1e12) return `${(num / 1e12).toLocaleString(undefined, { maximumFractionDigits: 2 })} Trillion`;
        if (num >= 1e9) return `${(num / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} Billion`;
        if (num >= 1e6) return `${(num / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} Million`;
        if (num >= 1e3) return `${num.toLocaleString()}`;
        return `${num}`;
    }

    private renderCircleSvg(pts: any[] = [], color: string = "#00f0ff"): string {
        const polyline = (pts && pts.length > 1)
            ? `<polyline points="${pts.map((pt: any) => `${Math.round(pt[0])},${Math.round(pt[1])}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`
            : "";
        return `
            <div class="circle-svg-wrap">
                <svg viewBox="0 0 300 300" class="mini-circle-svg">
                    <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4 4" stroke-width="2" />
                    <circle cx="150" cy="150" r="3" fill="#fbbf24" />
                    ${polyline}
                </svg>
            </div>
        `;
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

        let phaseTitle = "Town Assembly";
        let phaseSub = "Deliberate and question each other.";
        if (s.phase === "ROLE_REVEAL") {
            phaseTitle = "🎭 Secret Role Assignment";
            phaseSub = "Check your private roles secretly on your phones!";
        } else if (s.phase === "NIGHT_ACTIONS") {
            phaseTitle = "🌙 Night Falls Upon the Village...";
            phaseSub = "The town sleeps while the Mafia, Doctor, and Detective act in silence.";
        } else if (s.phase === "DAY_DAWN") {
            phaseTitle = "☀️ Dawn Breaks Over the Town";
            phaseSub = s.doctor_saved ? "🛡️ The Doctor intervened! The victim was saved tonight!" : (s.last_killed_name ? `💀 ${s.last_killed_name} was eliminated during the night.` : "No one was eliminated tonight.");
        } else if (s.phase === "DAY_DISCUSS") {
            phaseTitle = "🗣️ Open Town Debate";
            phaseSub = "Discuss who is innocent and who might be lying. Time is ticking!";
        } else if (s.phase === "DAY_VOTE") {
            phaseTitle = "⚖️ Village Trial & Accusation";
            phaseSub = "Cast your votes on your phones. Strict majority required for execution.";
        } else if (s.phase === "DAY_EXECUTION") {
            phaseTitle = "🏛️ The Gavel Falls!";
            phaseSub = s.last_killed_name ? `Town executed ${s.last_killed_name} (${s.last_killed_role || 'Citizen'}).` : "The town could not reach a majority consensus. No one was executed.";
        }

        return `
            <div class="phase-card">
                <div class="phase-badge">${s.phase.replace("_", " ")}</div>
                <h2>${phaseTitle}</h2>
                <p class="phase-instruction">${phaseSub}</p>

                <div class="player-roster-grid">
                    ${(s.players || []).map((p: any) => `
                        <div class="player-card ${p.is_alive ? '' : 'eliminated'}">
                            <span class="avatar">${p.avatar}</span>
                            <span class="name">${p.nickname}</span>
                            <span class="status">${p.is_alive ? '🟢 Alive' : '💀 Executed'}</span>
                            ${p.role_revealed ? `<span class="role-tag">${p.role_revealed}</span>` : ''}
                        </div>
                    `).join("")}
                </div>

                ${s.history_log && s.history_log.length > 0 ? `
                    <div class="history-log">
                        <span class="log-label">TOWN CHRONICLE:</span>
                        <p>${s.history_log[s.history_log.length - 1]}</p>
                    </div>
                ` : ""}

                ${s.phase === "DAY_VOTE" && s.votes_cast_count !== undefined ? `
                    <div class="votes-progress-bar">
                        Votes Cast: ${s.votes_cast_count} / ${s.alive_count || (s.players || []).length}
                    </div>
                ` : ""}
            </div>
        `;
    }

    // 2. IMPOSTER
    private renderImposter(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card">
                    <div class="phase-badge">GAME OVER • ${s.winner === "IMPOSTER" ? "🦎 IMPOSTER TRIUMPH" : "🛡️ CREW VICTORY"}</div>
                    <h1>${s.winner === "IMPOSTER" ? "The Imposter Fooled the Room!" : "The Imposter Was Caught!"}</h1>
                    <div class="secret-word-card">
                        <span class="label">SECRET WORD:</span>
                        <div class="secret-word-highlight">${s.secret_word || "???"}</div>
                    </div>
                    ${this.renderPodium(`${s.winner} WINS`)}
                </div>
            `;
        }

        return `
            <div class="phase-card">
                <div class="phase-badge">CATEGORY: ${s.category || "General"}</div>
                <h2>${s.phase === "WORD_REVEAL" ? "Secret Words Revealed on Phones..." : (s.phase === "CLUE_ROUNDS" ? "🗣️ Speak One-Word Clues in Order" : (s.phase === "VOTING" ? "🗳️ Vote for the Imposter" : "🚨 Imposter's Final Clutch Guess!"))}</h2>
                <p class="phase-instruction">
                    ${s.phase === "CLUE_ROUNDS" ? "Each player says ONE word related to the secret word without giving it away to the Imposter!" : (s.phase === "IMPOSTER_GUESS" ? `Imposter was accused! They have 18s to guess the secret word from the board below!` : "Keep your phones tilted away from others.")}
                </p>

                <div class="clue-speaker-track">
                    ${(s.clue_order || []).map((name: string, idx: number) => `
                        <div class="speaker-pill">
                            <span class="order">#${idx + 1}</span>
                            <span>👤</span>
                            <span>${name}</span>
                        </div>
                    `).join("")}
                </div>

                ${s.candidate_words && s.candidate_words.length > 0 ? `
                    <div class="tv-words-board">
                        <span class="board-header">CATEGORY BOARD: ${s.category?.toUpperCase()}</span>
                        <div class="tv-words-grid">
                            ${s.candidate_words.map((w: string) => `<div class="tv-word-tile">${w}</div>`).join("")}
                        </div>
                    </div>
                ` : ""}

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
                        <div class="target-swatch" style="background: ${col.hex || `hsl(${col.h}, ${col.s * 100}%, 50%)`}; width: 200px; height: 200px; border-radius: 24px; margin: 1.5rem auto; box-shadow: 0 12px 40px rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.2);"></div>
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
                        <span class="actual-num">${this.formatBigNumber(s.actual)}</span>
                        <span class="actual-unit">${s.unit || ""}</span>
                    </div>
                    <p class="fact-box">💡 ${s.fact || ""}</p>
                    <div class="fermi-results-list">
                        ${(s.players || []).map((p: any) => {
                            const r = results[p.id];
                            return `
                                <div class="fermi-res-item">
                                    <span class="av">${p.avatar} ${p.nickname}</span>
                                    <span class="guess">Guess: ${r ? this.formatBigNumber(r.guess) : 0}</span>
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
                                    ${this.renderCircleSvg(s.drawings?.[p.id], p.color)}
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
