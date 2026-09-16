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
            this.handlePhaseTransition(state.phase);
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
        if (timerNum) {
            timerNum.textContent = `${Math.ceil(this.state.phase_timer)}`;
        }
        const timerBar = this.container.querySelector(".timer-bar") as HTMLElement;
        if (timerBar && this.maxPhaseDuration > 0) {
            const pct = Math.min(100, Math.max(0, (this.state.phase_timer / this.maxPhaseDuration) * 100));
            timerBar.style.width = `${pct}%`;
        }
    }

    private handlePhaseTransition(newPhase: string) {
        if (newPhase === "DAY_DAWN" || newPhase === "DAY_EXECUTION") {
            soundManager.playGong();
        } else if (newPhase === "SHOWDOWN_REVEAL" || newPhase === "REVEAL") {
            soundManager.playDing();
        } else if (newPhase === "GAME_OVER") {
            soundManager.playVictory();
        } else {
            soundManager.playTone(400, 0.1, "sine");
        }
    }

    private render() {
        if (!this.state) return;

        let content = "";
        switch (this.state.game_id) {
            case "mafia":
                content = this.renderMafia();
                break;
            case "imposter":
                content = this.renderImposter();
                break;
            case "witclash":
                content = this.renderWitClash();
                break;
            case "trivia":
                content = this.renderTrivia();
                break;
            case "doodledash":
                content = this.renderDoodleDash();
                break;
            default:
                content = `<div>Unknown Game: ${this.state.game_id}</div>`;
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

                <div class="game-content-area">
                    ${content}
                </div>
            </div>
        `;

        const lobbyBtn = this.container.querySelector("#btn-host-lobby");
        if (lobbyBtn) {
            lobbyBtn.addEventListener("click", () => {
                if (confirm("Return to party lobby? Current game will end.")) {
                    this.socket.send("BACK_TO_LOBBY");
                }
            });
        }

        if (this.state.game_id === "doodledash") {
            this.drawHostCanvasStrokes();
        }
    }

    private drawHostCanvasStrokes() {
        const canvas = this.container.querySelector("#host-doodle-canvas") as HTMLCanvasElement;
        const strokes = (this.state as any)?.strokes;
        if (!canvas || !strokes) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#00f0ff";

        const scaleX = canvas.width / 320;
        const scaleY = canvas.height / 280;

        let drawing = false;
        for (const stroke of strokes) {
            if (stroke.type === "start") {
                ctx.beginPath();
                ctx.moveTo(stroke.x * scaleX, stroke.y * scaleY);
                drawing = true;
            } else if (stroke.type === "move" && drawing) {
                ctx.lineTo(stroke.x * scaleX, stroke.y * scaleY);
                ctx.stroke();
            } else if (stroke.type === "end") {
                drawing = false;
            }
        }
    }

    private renderMafia(): string {
        const s = this.state!;
        if (s.phase === "ROLE_REVEAL") {
            return `
                <div class="phase-card reveal-card">
                    <h2>SECRET ROLES DISTRIBUTED</h2>
                    <p class="phase-instruction">Look down at your phone screen! Do not let anyone see your role.</p>
                    <div class="animated-cards-row">
                        <div class="card-mystery">❓</div>
                        <div class="card-mystery">❓</div>
                        <div class="card-mystery">❓</div>
                    </div>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            return `
                <div class="phase-card night-card">
                    <div class="moon-icon">🌙</div>
                    <h2>NIGHT HAS FALLEN ON THE VILLAGE</h2>
                    <p class="phase-instruction">All villagers sleep soundly. The Mafia, Doctor, and Detective are making their moves in silence.</p>
                    <div class="alive-roster">
                        ${s.players.map((p: any) => `
                            <div class="roster-badge ${p.is_alive ? "" : "dead"}">
                                <span>${p.avatar}</span>
                                <span>${p.nickname}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "DAY_DAWN") {
            return `
                <div class="phase-card dawn-card">
                    <div class="sun-icon">☀️</div>
                    <h2>THE SUN RISES...</h2>
                    ${s.doctor_saved ? `
                        <div class="verdict-banner saved">
                            <h3>A MIRACLE OCCURRED!</h3>
                            <p>The Doctor successfully protected the target! No one died tonight.</p>
                        </div>
                    ` : (s.last_killed_name ? `
                        <div class="verdict-banner killed">
                            <h3>TRAGEDY STRUCK THE VILLAGE!</h3>
                            <p><strong>${s.last_killed_name}</strong> was eliminated by the Mafia!</p>
                            <span class="role-tag">Their role was: ${s.last_killed_role}</span>
                        </div>
                    ` : `<p>The night was peaceful. No blood was spilled.</p>`)}
                </div>
            `;
        } else if (s.phase === "DAY_DISCUSS") {
            return `
                <div class="phase-card discuss-card">
                    <div class="gavel-icon">🗣️</div>
                    <h2>TOWN SQUARE DEBATE</h2>
                    <p class="phase-instruction">Debate, investigate clues, and find the Mafia before night returns!</p>
                    <div class="alive-roster large">
                        ${s.players.map((p: any) => `
                            <div class="roster-badge ${p.is_alive ? "" : "dead"}">
                                <span class="av">${p.avatar}</span>
                                <span class="nick">${p.nickname}</span>
                                ${!p.is_alive ? `<span class="rip">ELIMINATED (${p.role_revealed || "???"})</span>` : ""}
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "DAY_VOTE") {
            return `
                <div class="phase-card vote-card">
                    <div class="gavel-icon">⚖️</div>
                    <h2>TOWN COUNCIL VOTE</h2>
                    <p class="phase-instruction">Cast your votes on your phones! Who should be eliminated?</p>
                    <p class="vote-progress">${s.votes_cast_count || 0} / ${s.alive_count} votes cast</p>
                </div>
            `;
        } else if (s.phase === "DAY_EXECUTION") {
            return `
                <div class="phase-card execution-card">
                    <h2>THE TOWN HAS SPOKEN!</h2>
                    ${s.last_killed_name ? `
                        <div class="verdict-banner killed">
                            <h3>${s.last_killed_name} HAS BEEN EXECUTED!</h3>
                            <span class="role-tag">Their role was: ${s.last_killed_role}</span>
                        </div>
                    ` : `<div class="verdict-banner saved"><h3>NO CONSENSUS</h3><p>The town could not reach a majority agreement. No execution today.</p></div>`}
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card gameover-card">
                    <h1>${s.winner === "MAFIA" ? "🕵️ MAFIA WINS!" : "🎉 TOWN WINS!"}</h1>
                    <div class="role-summary-table">
                        ${s.players.map((p: any) => `
                            <div class="summary-row">
                                <span>${p.avatar} ${p.nickname}</span>
                                <span class="role-tag">${p.role_revealed || "UNKNOWN"}</span>
                                <span class="score-tag">+${p.score} pts</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
        return `<div>Mafia Phase: ${s.phase}</div>`;
    }

    private renderImposter(): string {
        const s = this.state!;
        if (s.phase === "WORD_REVEAL") {
            return `
                <div class="phase-card">
                    <div class="chameleon-icon">🦎</div>
                    <h2>FIND THE IMPOSTER</h2>
                    <div class="category-banner">CATEGORY: ${s.category}</div>
                    <p class="phase-instruction">Check your phones! Everyone knows the secret word... except the Imposter!</p>
                </div>
            `;
        } else if (s.phase === "CLUE_ROUNDS") {
            return `
                <div class="phase-card">
                    <div class="category-banner">CATEGORY: ${s.category}</div>
                    <h2>GIVE YOUR ONE-WORD CLUES!</h2>
                    <p class="phase-instruction">Go around the room. Say a clue that proves you know the word without giving it away to the Imposter!</p>
                    <div class="clue-speaker-order">
                        ${s.clue_order ? s.clue_order.map((name: string, i: number) => `
                            <div class="speaker-step">
                                <span class="step-num">${i + 1}</span>
                                <span class="step-name">${name}</span>
                            </div>
                        `).join(" ➔ ") : ""}
                    </div>
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `
                <div class="phase-card">
                    <h2>ACCUSE THE IMPOSTER!</h2>
                    <p class="phase-instruction">Vote on your phones for who you think is blending in without knowing the word.</p>
                </div>
            `;
        } else if (s.phase === "IMPOSTER_GUESS") {
            return `
                <div class="phase-card imposter-guess-card">
                    <h2>${s.voted_out_name} WAS IDENTIFIED AS THE IMPOSTER!</h2>
                    <div class="clutch-box">
                        <h3>CLUTCH GUESS IN PROGRESS</h3>
                        <p>The Imposter has 15 seconds on their phone to guess the secret word for a steal victory!</p>
                    </div>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card">
                    <h1>${s.winner === "IMPOSTER" ? "🦎 THE IMPOSTER WINS!" : "🏆 THE CREW WINS!"}</h1>
                    <div class="secret-reveal-banner">
                        <span>THE SECRET WORD WAS:</span>
                        <div class="secret-word-highlight">${s.secret_word || "???"}</div>
                    </div>
                    ${s.imposter_guess ? `<p class="guess-note">Imposter guessed: "${s.imposter_guess}" (${s.imposter_guess_correct ? "CORRECT!" : "INCORRECT"})</p>` : ""}
                    <div class="players-score-list">
                        ${s.players.map((p: any) => `
                            <div class="score-item ${p.is_imposter ? "imp-item" : ""}">
                                <span>${p.avatar} ${p.nickname} ${p.is_imposter ? "(IMPOSTER)" : ""}</span>
                                <span>${p.score} pts</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
        return `<div>Imposter Phase: ${s.phase}</div>`;
    }

    private renderWitClash(): string {
        const s = this.state!;
        if (s.phase === "PROMPT_INPUT") {
            return `
                <div class="phase-card">
                    <h2>WRITE YOUR PUNCHLINES!</h2>
                    <p class="phase-instruction">Answer the prompts appearing on your phones. Be fast, be witty, be ridiculous!</p>
                </div>
            `;
        } else if (s.phase === "SHOWDOWN_VOTE" || s.phase === "SHOWDOWN_REVEAL") {
            const m = s.current_matchup;
            if (!m) return `<div>Loading matchup...</div>`;
            return `
                <div class="witclash-showdown">
                    <div class="matchup-prompt">"${m.prompt}"</div>

                    <div class="answers-battle">
                        <div class="answer-card card-blue ${s.phase === "SHOWDOWN_REVEAL" && m.votes_1 > m.votes_2 ? "winner" : ""}">
                            <div class="ans-text">"${m.answer_1}"</div>
                            ${s.phase === "SHOWDOWN_REVEAL" ? `
                                <div class="ans-author">— ${m.author_1}</div>
                                <div class="ans-votes">${m.votes_1} Votes</div>
                            ` : ""}
                        </div>

                        <div class="vs-badge">VS</div>

                        <div class="answer-card card-magenta ${s.phase === "SHOWDOWN_REVEAL" && m.votes_2 > m.votes_1 ? "winner" : ""}">
                            <div class="ans-text">"${m.answer_2}"</div>
                            ${s.phase === "SHOWDOWN_REVEAL" ? `
                                <div class="ans-author">— ${m.author_2}</div>
                                <div class="ans-votes">${m.votes_2} Votes</div>
                            ` : ""}
                        </div>
                    </div>

                    ${s.phase === "SHOWDOWN_REVEAL" && m.is_sweep ? `
                        <div class="double-witclash-banner">💥 DOUBLE WITCLASH! 100% SWEEP! 💥</div>
                    ` : ""}
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card">
                    <h1>👑 FINAL PODIUM 👑</h1>
                    <div class="podium-grid">
                        ${s.players.sort((a: any, b: any) => b.score - a.score).map((p: any, idx: number) => `
                            <div class="podium-item rank-${idx + 1}">
                                <span class="podium-rank">#${idx + 1}</span>
                                <span class="podium-avatar">${p.avatar}</span>
                                <span class="podium-name">${p.nickname}</span>
                                <span class="podium-score">${p.score} pts</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
        return `<div>WitClash Phase: ${s.phase}</div>`;
    }

    private renderTrivia(): string {
        const s = this.state!;
        const colors = ["#ff0055", "#0099ff", "#ffdd00", "#00ff66"];
        const glyphs = ["▲", "◆", "●", "■"];

        if (s.phase === "QUESTION" || s.phase === "REVEAL") {
            return `
                <div class="trivia-host-screen">
                    <div class="q-progress">QUESTION ${s.question_index} OF ${s.total_questions}</div>
                    <div class="q-text">${s.question}</div>

                    <div class="options-grid">
                        ${s.options ? s.options.map((opt: string, i: number) => `
                            <div class="opt-card ${s.phase === "REVEAL" && i === s.correct_option ? "correct" : ""}" style="background-color: ${colors[i]};">
                                <span class="glyph">${glyphs[i]}</span>
                                <span class="text">${opt}</span>
                                ${s.phase === "REVEAL" && s.option_stats ? `
                                    <span class="stat-count">${s.option_stats[i]} votes</span>
                                ` : ""}
                            </div>
                        `).join("") : ""}
                    </div>

                    <div class="trivia-host-roster">
                        ${s.players ? s.players.map((p: any) => `
                            <div class="trivia-player-chip ${p.answered ? "has-answered" : ""}">
                                <span>${p.avatar} ${p.nickname}</span>
                                <span class="badge-status">${p.answered ? "✓ READY" : "..."}</span>
                            </div>
                        `).join("") : ""}
                    </div>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card">
                    <h1>⚡ TRIVIA CHAMPIONS ⚡</h1>
                    <div class="podium-grid">
                        ${s.players.sort((a: any, b: any) => b.score - a.score).map((p: any, idx: number) => `
                            <div class="podium-item">
                                <span class="podium-rank">#${idx + 1}</span>
                                <span class="podium-name">${p.avatar} ${p.nickname}</span>
                                <span class="podium-score">${p.score} pts</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
        return `<div>Trivia Phase: ${s.phase}</div>`;
    }

    private renderDoodleDash(): string {
        const s = this.state!;
        return `
            <div class="doodle-host-screen">
                <div class="doodle-top-bar">
                    <div class="drawer-indicator">🎨 Drawer: <strong>${s.drawer_name}</strong></div>
                    <div class="word-blanks">${s.secret_word}</div>
                </div>

                <div class="doodle-main-area">
                    <canvas id="host-doodle-canvas" width="600" height="400" class="doodle-canvas"></canvas>

                    <div class="live-guesses-box">
                        <h4>LIVE GUESSES</h4>
                        <div class="guess-stream">
                            ${s.guesses ? s.guesses.map((g: any) => `
                                <div class="guess-bubble ${g.is_correct ? "correct" : ""}">
                                    <strong>${g.player_name}:</strong> ${g.text}
                                </div>
                            `).join("") : ""}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
