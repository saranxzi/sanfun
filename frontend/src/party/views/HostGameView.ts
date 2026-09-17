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
        if (timerNum) timerNum.textContent = `${Math.ceil(this.state.phase_timer)}`;
        const timerBar = this.container.querySelector(".timer-bar") as HTMLElement;
        if (timerBar && this.maxPhaseDuration > 0) {
            const pct = Math.min(100, Math.max(0, (this.state.phase_timer / this.maxPhaseDuration) * 100));
            timerBar.style.width = `${pct}%`;
        }
    }

    private handlePhaseTransition(newPhase: string) {
        if (newPhase === "DAY_DAWN" || newPhase === "DAY_EXECUTION") soundManager.playGong();
        else if (newPhase === "SHOWDOWN_REVEAL" || newPhase === "REVEAL") soundManager.playDing();
        else if (newPhase === "GAME_OVER") soundManager.playVictory();
        else if (newPhase === "EXPLOSION") soundManager.playBuzzer();
        else soundManager.playTone(400, 0.1, "sine");
    }

    public render() {
        if (!this.state) return;

        let content = "";
        switch (this.state.game_id) {
            case "mafia": content = this.renderMafia(); break;
            case "imposter": content = this.renderImposter(); break;
            case "witclash": content = this.renderWitClash(); break;
            case "trivia": content = this.renderTrivia(); break;
            case "doodledash": content = this.renderDoodleDash(); break;
            case "mostlikely": content = this.renderMostLikely(); break;
            case "wordbomb": content = this.renderWordBomb(); break;
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

        if (this.state.game_id === "doodledash") this.drawHostCanvasStrokes();
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
            </div>
        `;
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

        for (const s of strokes) {
            if (s.type === "start") {
                ctx.beginPath();
                ctx.moveTo(s.x * scaleX, s.y * scaleY);
                drawing = true;
            } else if (s.type === "move" && drawing) {
                ctx.lineTo(s.x * scaleX, s.y * scaleY);
                ctx.stroke();
            } else if (s.type === "end") {
                drawing = false;
            }
        }
    }

    private renderMafia(): string {
        const s = this.state!;
        if (s.phase === "ROLE_REVEAL") {
            return `
                <div class="phase-card">
                    <h2>SECRET ROLES ASSIGNED</h2>
                    <p class="phase-instruction">Check your phone screen in secret! Don't let anyone see your role.</p>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            return `
                <div class="phase-card night-card">
                    <div class="moon-icon">🌙</div>
                    <h2>NIGHT HAS FALLEN</h2>
                    <p class="phase-instruction">Villagers sleep. Mafia, Doctor, and Detective are making nocturnal moves.</p>
                    <div class="alive-roster">
                        ${s.players.map((p: any) => `
                            <div class="player-in-game ${p.is_alive ? "" : "rip"}">${p.avatar} ${p.nickname}</div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "DAY_DAWN") {
            const verdict = s.doctor_saved
                ? `<div class="verdict-banner saved">A MIRACLE OCCURRED! The Doctor saved the victim!</div>`
                : (s.last_killed_name ? `<div class="verdict-banner killed">${s.last_killed_name} WAS ELIMINATED! (${s.last_killed_role})</div>` : `<p>A peaceful night. No casualties.</p>`);
            return `
                <div class="phase-card dawn-card">
                    <div class="sun-icon">☀️</div>
                    <h2>THE SUN RISES</h2>
                    ${verdict}
                </div>
            `;
        } else if (s.phase === "DAY_DISCUSS") {
            return `
                <div class="phase-card discuss-card">
                    <div class="gavel-icon">🗣️</div>
                    <h2>TOWN SQUARE DEBATE</h2>
                    <p class="phase-instruction">Debate clues, expose alibis, and deduce who the Mafia syndicate is!</p>
                    <div class="alive-roster">
                        ${s.players.map((p: any) => `
                            <div class="player-in-game ${p.is_alive ? "" : "rip"}">${p.avatar} ${p.nickname}</div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "DAY_VOTE") {
            return `
                <div class="phase-card vote-card">
                    <div class="gavel-icon">⚖️</div>
                    <h2>TOWN COUNCIL VOTE</h2>
                    <p class="phase-instruction">Cast your votes on your phones!</p>
                    <p class="vote-progress">${s.votes_cast_count || 0} / ${s.alive_count} votes cast</p>
                </div>
            `;
        } else if (s.phase === "DAY_EXECUTION") {
            return `
                <div class="phase-card execution-card">
                    <h2>THE TOWN HAS SPOKEN!</h2>
                    ${s.last_killed_name ? `
                        <div class="verdict-banner killed">${s.last_killed_name} HAS BEEN EXECUTED! (${s.last_killed_role})</div>
                    ` : `<div class="verdict-banner saved">NO CONSENSUS REACHED. No execution today.</div>`}
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card gameover-card">
                    <h1>${s.winner === "MAFIA" ? "🕵️ MAFIA WINS!" : "🎉 TOWN WINS!"}</h1>
                    <div class="role-summary-table">
                        ${s.players.map((p: any) => `
                            <div class="summary-row">${p.avatar} ${p.nickname} <span class="role-tag">${p.role_revealed || "VILLAGER"}</span> (+${p.score} pts)</div>
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
                    <p class="phase-instruction">Everyone knows the secret word... except the Imposter!</p>
                </div>
            `;
        } else if (s.phase === "CLUE_ROUNDS") {
            return `
                <div class="phase-card">
                    <div class="category-banner">CATEGORY: ${s.category}</div>
                    <h2>ONE-WORD CLUES</h2>
                    <p class="phase-instruction">Give a subtle clue that proves you know the word without revealing it to the Imposter!</p>
                    <div class="clue-speaker-order">
                        ${(s.clue_order || []).map((name: string, i: number) => `
                            <div class="speaker-step"><span class="step-num">#${i + 1}</span> ${name}</div>
                        `).join(" ➔ ")}
                    </div>
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `
                <div class="phase-card">
                    <h2>VOTE OUT THE IMPOSTER!</h2>
                    <p class="phase-instruction">Who gave a suspicious or vague clue? Cast your vote on your phone!</p>
                </div>
            `;
        } else if (s.phase === "IMPOSTER_GUESS") {
            return `
                <div class="phase-card">
                    <h2>CLUTCH GUESS!</h2>
                    <p class="phase-instruction"><strong>${s.voted_out_name}</strong> was caught! Can they guess the secret word for the steal?</p>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="phase-card gameover-card">
                    <h1>${s.winner === "IMPOSTER" ? "🦎 IMPOSTER WINS!" : "🛡️ CREW WINS!"}</h1>
                    <div class="secret-word-card">
                        <span>THE SECRET WORD WAS:</span>
                        <div class="secret-word-highlight">${s.secret_word}</div>
                    </div>
                    <div class="role-summary-table">
                        ${s.players.map((p: any) => `
                            <div class="summary-row">${p.avatar} ${p.nickname} <span class="role-tag">${p.is_imposter ? "IMPOSTER" : "CREW"}</span> (+${p.score} pts)</div>
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
                    <h2>ROUND ${s.round_number} / ${s.max_rounds}</h2>
                    <h1>WRITE YOUR PUNCHLINES!</h1>
                    <p class="phase-instruction">Check your phone to answer 2 hilarious prompts before the timer runs out.</p>
                </div>
            `;
        } else if (s.phase === "SHOWDOWN_VOTE" || s.phase === "SHOWDOWN_REVEAL") {
            const m = s.current_matchup;
            if (!m) return `<div>Preparing showdown...</div>`;
            return `
                <div class="witclash-showdown">
                    <div class="matchup-prompt">"${m.prompt}"</div>
                    <div class="answers-battle">
                        <div class="answer-card card-blue">
                            <div class="ans-text">"${m.answer_1}"</div>
                            ${s.phase === "SHOWDOWN_REVEAL" ? `<div class="ans-author">— ${m.author_1}</div><div class="ans-votes">${m.votes_1} Votes</div>` : ""}
                        </div>
                        <div class="vs-badge">VS</div>
                        <div class="answer-card card-magenta">
                            <div class="ans-text">"${m.answer_2}"</div>
                            ${s.phase === "SHOWDOWN_REVEAL" ? `<div class="ans-author">— ${m.author_2}</div><div class="ans-votes">${m.votes_2} Votes</div>` : ""}
                        </div>
                    </div>
                    ${s.phase === "SHOWDOWN_REVEAL" && m.is_sweep ? `<div class="double-witclash-banner">💥 DOUBLE WITCLASH! 100% SWEEP! 💥</div>` : ""}
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return this.renderPodium("👑 WITCLASH CHAMPIONS 👑");
        }
        return `<div>WitClash Phase: ${s.phase}</div>`;
    }

    private renderTrivia(): string {
        const s = this.state!;
        const glyphs = ["▲", "◆", "●", "■"];

        if (s.phase === "QUESTION" || s.phase === "REVEAL") {
            return `
                <div class="trivia-host-screen">
                    <div class="q-progress">QUESTION ${s.question_index} OF ${s.total_questions}</div>
                    <div class="q-text">${s.question}</div>
                    <div class="options-grid">
                        ${(s.options || []).map((opt: string, i: number) => `
                            <div class="opt-card opt-${i} ${s.phase === "REVEAL" && i === s.correct_option ? "correct-card" : ""}">
                                <span class="shape">${glyphs[i]}</span>
                                <span class="text">${opt}</span>
                                ${s.phase === "REVEAL" && s.option_stats ? `<span class="stat-count">${s.option_stats[i]}</span>` : ""}
                            </div>
                        `).join("")}
                    </div>
                    <div class="trivia-host-roster">
                        ${(s.players || []).map((p: any) => `
                            <div class="trivia-player-chip ${p.answered ? "badge-done" : ""}">
                                <span>${p.avatar} ${p.nickname}</span>
                                <span class="score-now">${p.score || 0}</span>
                                ${p.streak > 1 ? `<span class="streak-text">🔥x${p.streak}</span>` : ""}
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return this.renderPodium("⚡ TRIVIA BLITZ PODIUM ⚡");
        }
        return `<div>Trivia Phase: ${s.phase}</div>`;
    }

    private renderDoodleDash(): string {
        const s = this.state!;
        if (s.phase === "GAME_OVER") return this.renderPodium("🎨 DOODLEDASH ARTISTS 🎨");

        return `
            <div class="doodle-host-screen">
                <div class="doodle-main-area">
                    <div class="drawer-indicator">🎨 Drawer: <strong>${s.drawer_name}</strong></div>
                    <div class="word-blanks">${s.secret_word}</div>
                    <canvas id="host-doodle-canvas" width="600" height="400" class="doodle-canvas"></canvas>
                </div>
                <div class="live-guesses-box">
                    <div class="section-title" style="padding: 0.8rem 1rem 0;">LIVE GUESSES</div>
                    <div class="guess-stream">
                        ${(s.guesses || []).map((g: any) => `
                            <div class="guess-bubble ${g.is_correct ? "correct" : ""}">
                                <strong>${g.player_name}:</strong> ${g.text}
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }

    private renderMostLikely(): string {
        const s = this.state!;
        const promptText = s.question || s.prompt || "Who is most likely to...";
        if (s.phase === "QUESTION_VOTE" || s.phase === "VOTING") {
            const votesCast = s.votes_cast_count !== undefined ? s.votes_cast_count : (s.votes_cast || 0);
            const totalVoters = s.players?.length || s.total_voters || 1;
            return `
                <div class="phase-card mostlikely-host-card">
                    <div class="round-badge">ROUND ${s.round_number || 1} / ${s.max_rounds || 5}</div>
                    <h2 class="mostlikely-prompt">"${promptText}"</h2>
                    <p class="phase-instruction">Cast your vote on your phones!</p>
                    <div class="vote-progress-bar">
                        <div class="progress-fill" style="width: ${(votesCast / Math.max(1, totalVoters)) * 100}%;"></div>
                    </div>
                    <p class="vote-progress">${votesCast} / ${totalVoters} Votes Cast</p>
                    <div class="candidates-roster">
                        ${(s.players || []).map((p: any) => `
                            <div class="candidate-pill">
                                <span class="c-avatar">${p.avatar}</span>
                                <span class="c-name">${p.nickname}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "VOTE_REVEAL" || s.phase === "REVEAL") {
            const topName = s.top_voted_name || (s.winners && s.winners.length ? s.winners.join(", ") : "Everyone");
            const topAv = s.top_voted_avatar || "👑";
            return `
                <div class="phase-card mostlikely-reveal-card">
                    <div class="round-badge">ROUND ${s.round_number || 1} / ${s.max_rounds || 5}</div>
                    <h2 class="mostlikely-prompt">"${promptText}"</h2>
                    <div class="mostlikely-winner-banner">
                        <span>🏆 MOST LIKELY:</span>
                        <div class="winner-names">${topAv} ${topName}</div>
                    </div>
                    <div class="results-grid">
                        ${(s.players || []).map((p: any) => {
                            const count = s.vote_counts ? (s.vote_counts[p.id] || 0) : 0;
                            const isWin = p.nickname === topName || (s.winners && s.winners.includes(p.nickname));
                            return `
                                <div class="result-tile ${isWin ? "is-winner" : ""}">
                                    <div class="tile-header">
                                        <span class="r-avatar">${p.avatar}</span>
                                        <span class="r-name">${p.nickname}</span>
                                        <span class="r-votes">${count} ${count === 1 ? "vote" : "votes"}</span>
                                    </div>
                                    <div class="p-score" style="font-size: 0.8rem; color: #aaa;">Score: ${p.score || 0} pts</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return this.renderPodium("🥂 MOST LIKELY TO PODIUM 🥂");
        }
        return `<div>Most Likely Phase: ${s.phase}</div>`;
    }

    private renderWordBomb(): string {
        const s = this.state!;
        const currentPrompt = s.current_prompt || s.prompt || "...";
        const holderName = s.holder_name || s.active_player_name || "Player";
        const holderAv = s.holder_avatar || s.active_player_avatar || "👤";

        if (s.phase === "ROUND_ACTIVE" || s.phase === "ROUND") {
            const fusePct = Math.max(0, Math.min(100, ((s.phase_timer || 0) / 10) * 100));
            return `
                <div class="phase-card wordbomb-host-card">
                    <div class="round-badge">ROUND ${s.round_number || 1} / ${s.max_rounds || 3}</div>
                    <div class="wordbomb-bomb-wrap">
                        <div class="bomb-emoji ${fusePct < 30 ? "urgent" : ""}">💣</div>
                        <div class="wordbomb-prompt-display">
                            <span class="prompt-hint">MUST CONTAIN:</span>
                            <div class="prompt-letters">${currentPrompt}</div>
                        </div>
                    </div>
                    <div class="bomb-holder-banner">
                        <span class="holder-av">${holderAv}</span>
                        <span class="holder-name">${holderName}</span>
                        <span class="holder-badge">HAS THE BOMB!</span>
                    </div>
                    ${s.last_word ? `
                        <div class="last-word-pill">
                            Defused with: <strong>${s.last_word}</strong>!
                        </div>
                    ` : ""}
                    <div class="wordbomb-roster">
                        ${(s.players || []).map((p: any) => {
                            const strikes = p.strikes || 0;
                            const lives = Math.max(0, 3 - strikes);
                            const isAlive = lives > 0;
                            const isActive = p.is_holding_bomb || p.id === s.holder_id;
                            return `
                                <div class="wordbomb-player-tile ${!isAlive ? "eliminated" : ""} ${isActive ? "active-holder" : ""}">
                                    <div class="p-info">${p.avatar} ${p.nickname}</div>
                                    <div class="p-lives">${isAlive ? "❤️".repeat(lives) : "💀 OUT"}</div>
                                    <div class="p-score">${p.score || 0} pts</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "EXPLOSION") {
            const explodedName = s.last_exploded_player || s.exploded_player_name || "A player";
            return `
                <div class="phase-card wordbomb-explosion-card">
                    <div class="explosion-icon">💥</div>
                    <h1 class="explosion-heading">BOOOOOOM!</h1>
                    <div class="exploded-player-banner">
                        <span class="ex-name">${explodedName}</span>
                        <span class="ex-sub">ran out of time and lost a life!</span>
                    </div>
                    <div class="wordbomb-roster" style="margin-top: 2rem;">
                        ${(s.players || []).map((p: any) => {
                            const strikes = p.strikes || 0;
                            const lives = Math.max(0, 3 - strikes);
                            const isAlive = lives > 0;
                            return `
                                <div class="wordbomb-player-tile ${!isAlive ? "eliminated" : ""}">
                                    <div class="p-info">${p.avatar} ${p.nickname}</div>
                                    <div class="p-lives">${isAlive ? "❤️".repeat(lives) : "💀 OUT"}</div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return this.renderPodium("💣 WORD BOMB SURVIVORS 💣");
        }
        return `<div>Word Bomb Phase: ${s.phase}</div>`;
    }
}
