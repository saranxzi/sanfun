import type { PlayerGameState, LobbyState } from "../types";
import { PartySocket } from "../PartySocket";

export class PlayerController {
    private container: HTMLElement;
    private socket: PartySocket;
    private state: PlayerGameState | null = null;
    private currentTimer: number = 0;
    private maxTimerDuration: number = 15;
    private timerInterval: number | null = null;
    private isDrawing: boolean = false;
    private lastDrawPt: { x: number; y: number } | null = null;

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

        const savedInputs: Record<string, string> = {};
        this.container.querySelectorAll("input").forEach(input => {
            if (input.id) savedInputs[input.id] = input.value;
        });

        this.render();

        Object.entries(savedInputs).forEach(([id, val]) => {
            const input = this.container.querySelector(`#${id}`) as HTMLInputElement;
            if (input && !input.value) {
                input.value = val;
            }
        });
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
        if (timerNum) {
            timerNum.textContent = `${Math.ceil(this.currentTimer)}s`;
        }
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
                        <input type="text" id="join-nick" maxlength="16" placeholder="Your Name" value="${savedNick}" class="input-nick" />
                    </div>

                    <button id="btn-player-join" class="btn-primary-mobile">ENTER PARTY</button>
                </div>
            </div>
        `;

        const btn = this.container.querySelector("#btn-player-join");
        if (btn) {
            btn.addEventListener("click", () => {
                const code = (this.container.querySelector("#join-code") as HTMLInputElement).value.trim().toUpperCase();
                const nick = (this.container.querySelector("#join-nick") as HTMLInputElement).value.trim();
                if (code.length === 4 && nick) {
                    localStorage.setItem("sanfun_player_nick", nick);
                    this.socket.roomCode = code;
                    this.socket.nickname = nick;
                    this.socket.connect();
                } else {
                    alert("Please enter a 4-letter room code and your nickname.");
                }
            });
        }
    }

    private renderLobbyWaiting() {
        this.container.innerHTML = `
            <div class="player-waiting-screen">
                <div class="player-profile-badge" style="border-color: ${this.state!.color || '#00f0ff'};">
                    <span class="av">${this.state!.avatar || '🎮'}</span>
                    <span class="nick">${this.state!.nickname || 'Player'}</span>
                </div>

                <div class="waiting-box">
                    <h3>YOU'RE IN! 🎉</h3>
                    <p class="room-indicator">Room: <strong>${this.state!.room_code}</strong></p>
                    <p>Look at the Big Screen! The host will choose and start the game soon.</p>
                </div>
            </div>
        `;
    }

    private renderGameController() {
        const s = this.state!;
        let html = "";

        if (s.game_id === "mafia") {
            html = this.renderMafiaController();
        } else if (s.game_id === "imposter") {
            html = this.renderImposterController();
        } else if (s.game_id === "witclash") {
            html = this.renderWitClashController();
        } else if (s.game_id === "trivia") {
            html = this.renderTriviaController();
        } else if (s.game_id === "doodledash") {
            html = this.renderDoodleController();
        } else {
            html = `<div>Game controller for ${s.game_id}</div>`;
        }

        this.container.innerHTML = `
            <div class="player-in-game">
                <div class="player-status-bar">
                    <div class="player-profile-mini" style="border-color: ${s.color || '#00f0ff'};">
                        <span class="av">${s.avatar || '🎮'}</span>
                        <span class="nick">${s.nickname || 'Player'}</span>
                    </div>
                    <div class="player-timer-badge">
                        <span class="player-timer-number">${Math.ceil(this.currentTimer || s.phase_timer || 0)}s</span>
                        <div class="player-timer-track">
                            <div class="player-timer-bar" style="width: 100%;"></div>
                        </div>
                    </div>
                    <span class="score-badge">${s.score || 0} pts</span>
                </div>
                <div class="controller-body">
                    ${html}
                </div>
            </div>
        `;

        this.bindControllerActions();
    }

    private renderMafiaController(): string {
        const s = this.state!;
        if (!s.is_alive) {
            return `<div class="dead-screen">👻 You have been eliminated! Watch the trial on the TV.</div>`;
        }

        if (s.phase === "ROLE_REVEAL") {
            return `
                <div class="role-reveal-phone">
                    <h3>YOUR SECRET ROLE</h3>
                    <div class="role-card-box ${s.my_role}">
                        <div class="role-name">${s.my_role}</div>
                        <p class="role-hint">
                            ${s.my_role === "MAFIA" ? "Eliminate the innocent villagers without getting caught." :
                              s.my_role === "DOCTOR" ? "Heal 1 player each night to save them from death." :
                              s.my_role === "DETECTIVE" ? "Investigate 1 player each night to discover their alignment." :
                              "Find the Mafia and execute them during the day votes."}
                        </p>
                    </div>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            if (s.night_action === "MAFIA_KILL") {
                return `
                    <div class="action-card">
                        <h3>🔪 SELECT KILL TARGET</h3>
                        <div class="candidates-list">
                            ${s.candidates ? s.candidates.map((c: any) => `
                                <button class="btn-target ${s.my_vote === c.id ? "selected" : ""}" data-action="MAFIA_KILL" data-target="${c.id}">
                                    ${c.avatar} ${c.nickname}
                                </button>
                            `).join("") : ""}
                        </div>
                    </div>
                `;
            } else if (s.night_action === "DOCTOR_HEAL") {
                return `
                    <div class="action-card">
                        <h3>💉 SELECT HEAL TARGET</h3>
                        <div class="candidates-list">
                            ${s.candidates ? s.candidates.map((c: any) => `
                                <button class="btn-target ${s.my_heal === c.id ? "selected" : ""}" data-action="DOCTOR_HEAL" data-target="${c.id}">
                                    ${c.avatar} ${c.nickname}
                                </button>
                            `).join("") : ""}
                        </div>
                    </div>
                `;
            } else if (s.night_action === "DETECTIVE_INVESTIGATE") {
                return `
                    <div class="action-card">
                        <h3>🔍 SELECT PLAYER TO INVESTIGATE</h3>
                        ${s.detective_result ? `
                            <div class="det-result">
                                <strong>${s.detective_result.target_name}</strong> is: 
                                <span class="align">${s.detective_result.alignment}</span>
                            </div>
                        ` : ""}
                        <div class="candidates-list">
                            ${s.candidates ? s.candidates.map((c: any) => `
                                <button class="btn-target" data-action="DETECTIVE_INVESTIGATE" data-target="${c.id}">
                                    ${c.avatar} ${c.nickname}
                                </button>
                            `).join("") : ""}
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="action-card">
                        <h3>😴 NIGHT FALLS</h3>
                        <p>You are asleep. Rest up for tomorrow's debate!</p>
                    </div>
                `;
            }
        } else if (s.phase === "DAY_VOTE") {
            return `
                <div class="action-card">
                    <h3>⚖️ CAST YOUR VOTE</h3>
                    <div class="candidates-list">
                        ${s.candidates ? s.candidates.map((c: any) => `
                            <button class="btn-target ${s.my_vote === c.id ? "selected" : ""}" data-action="CAST_VOTE" data-target="${c.id}">
                                ${c.avatar} ${c.nickname}
                            </button>
                        `).join("") : ""}
                        <button class="btn-target btn-skip" data-action="CAST_VOTE" data-target="SKIP">SKIP VOTE</button>
                    </div>
                </div>
            `;
        }
        return `<div>Look at the Big Screen!</div>`;
    }

    private renderImposterController(): string {
        const s = this.state!;
        if (s.phase === "WORD_REVEAL" || s.phase === "CLUE_ROUNDS") {
            return `
                <div class="imposter-card-phone">
                    <div class="cat-pill">CATEGORY: ${s.category}</div>
                    ${s.is_imposter ? `
                        <div class="imposter-alert">
                            <h2>YOU ARE THE IMPOSTER! 🦎</h2>
                            <p>You do not know the secret word. Blend in and guess what others are talking about!</p>
                        </div>
                    ` : `
                        <div class="secret-word-card">
                            <span>SECRET WORD:</span>
                            <h2>${s.secret_word}</h2>
                        </div>
                    `}
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `
                <div class="action-card">
                    <h3>WHO IS THE IMPOSTER?</h3>
                    <div class="candidates-list">
                        ${s.candidates ? s.candidates.map((c: any) => `
                            <button class="btn-target ${s.my_vote === c.id ? "selected" : ""}" data-action="CAST_VOTE" data-target="${c.id}">
                                ${c.avatar} ${c.nickname}
                            </button>
                        `).join("") : ""}
                    </div>
                </div>
            `;
        } else if (s.phase === "IMPOSTER_GUESS") {
            if (s.is_imposter) {
                return `
                    <div class="action-card">
                        <h3>CLUTCH GUESS! WHAT IS THE WORD?</h3>
                        <div class="guess-form">
                            <input type="text" id="imp-guess-input" placeholder="Enter word..." autofocus />
                            <button id="btn-submit-imp-guess" class="btn-primary-mobile">GUESS WORD</button>
                        </div>
                    </div>
                `;
            } else {
                return `<div class="action-card"><p>The Imposter is making their final guess...</p></div>`;
            }
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="action-card">
                    <h3>GAME OVER!</h3>
                    <p>Look at the Big Screen to see final results.</p>
                </div>
            `;
        }
        return `<div>Look at the Big Screen!</div>`;
    }

    private renderWitClashController(): string {
        const s = this.state!;
        if (s.phase === "PROMPT_INPUT") {
            return `
                <div class="witclash-phone">
                    ${s.my_prompts ? s.my_prompts.map((p: any) => `
                        <div class="prompt-input-card">
                            <p class="p-text">"${p.text}"</p>
                            ${p.answered ? `<span class="badge-done">Answer Submitted!</span>` : `
                                <input type="text" maxlength="80" placeholder="Your punchline..." id="prompt-ans-${p.id}" />
                                <button class="btn-submit-punchline" data-prompt-id="${p.id}">SUBMIT</button>
                            `}
                        </div>
                    `).join("") : ""}
                </div>
            `;
        } else if (s.phase === "SHOWDOWN_VOTE") {
            if (s.can_vote) {
                return `
                    <div class="vote-phone-options">
                        <h3>VOTE FOR THE FUNNIEST!</h3>
                        <button class="btn-vote-choice choice-1" data-action="CAST_VOTE" data-choice="1">
                            A: "${s.answer_1}"
                        </button>
                        <button class="btn-vote-choice choice-2" data-action="CAST_VOTE" data-choice="2">
                            B: "${s.answer_2}"
                        </button>
                    </div>
                `;
            } else {
                return `<div class="action-card"><p>This is your matchup! Watch the votes roll in on the TV.</p></div>`;
            }
        }
        return `<div>Look at the Big Screen!</div>`;
    }

    private renderTriviaController(): string {
        const s = this.state!;
        if (s.phase === "QUESTION") {
            if (s.has_answered) {
                const choiceSymbols = ["▲ Red", "◆ Blue", "● Yellow", "■ Green"];
                const choiceText = s.selected_choice !== null && s.selected_choice !== undefined ? choiceSymbols[s.selected_choice] : "Choice registered";
                return `
                    <div class="action-card locked-card">
                        <div class="status-icon">🔒</div>
                        <h3>ANSWER LOCKED IN!</h3>
                        <p class="locked-choice">You chose: <strong>${choiceText}</strong></p>
                        <p class="locked-sub">Look at the TV! Results will reveal when time expires.</p>
                    </div>
                `;
            }
            return `
                <div class="trivia-mobile-buttons">
                    <button class="btn-trivia-opt opt-0" data-action="SUBMIT_ANSWER" data-choice="0">
                        <span class="shape">▲</span>
                    </button>
                    <button class="btn-trivia-opt opt-1" data-action="SUBMIT_ANSWER" data-choice="1">
                        <span class="shape">◆</span>
                    </button>
                    <button class="btn-trivia-opt opt-2" data-action="SUBMIT_ANSWER" data-choice="2">
                        <span class="shape">●</span>
                    </button>
                    <button class="btn-trivia-opt opt-3" data-action="SUBMIT_ANSWER" data-choice="3">
                        <span class="shape">■</span>
                    </button>
                </div>
            `;
        } else if (s.phase === "REVEAL") {
            return `
                <div class="action-card ${s.is_correct ? "correct-card" : "wrong-card"}">
                    <div class="result-icon">${s.is_correct ? "🎉" : "❌"}</div>
                    <h2>${s.is_correct ? "CORRECT!" : "WRONG!"}</h2>
                    <p class="streak-text">Streak: <strong>${s.streak || 0}</strong> 🔥</p>
                    <p class="score-now">Score: <strong>${s.score || 0} pts</strong></p>
                </div>
            `;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="action-card gameover-card">
                    <div class="result-icon">⚡</div>
                    <h2>GAME FINISHED!</h2>
                    <p>Your Final Score: <strong>${s.score || 0} pts</strong></p>
                    <p>Check the Big Screen for final rankings!</p>
                </div>
            `;
        }
        return `<div>Get ready for next question...</div>`;
    }

    private renderDoodleController(): string {
        const s = this.state!;
        if (s.is_drawer && s.phase === "DRAWING") {
            return `
                <div class="doodle-phone-canvas">
                    <div class="word-to-draw">Draw: <strong>${s.secret_word}</strong></div>
                    <canvas id="mobile-draw-pad" width="320" height="280"></canvas>
                    <div class="draw-tools">
                        <button id="btn-clear-draw" class="btn-tool">CLEAR CANVAS</button>
                    </div>
                </div>
            `;
        } else if (!s.is_drawer && s.phase === "DRAWING") {
            return `
                <div class="doodle-phone-guesser">
                    ${s.has_guessed ? `
                        <div class="action-card correct-card">
                            <h3>YOU GUESSED IT! 🎉</h3>
                            <p>Speed points awarded! Watch others guess.</p>
                        </div>
                    ` : `
                        <div class="guess-container">
                            <h3>GUESS THE DRAWING</h3>
                            <input type="text" id="guess-input" placeholder="Type your guess..." autocomplete="off" />
                            <button id="btn-submit-guess" class="btn-primary-mobile">SUBMIT GUESS</button>
                        </div>
                    `}
                </div>
            `;
        } else if (s.phase === "ROUND_SUMMARY") {
            return `
                <div class="action-card">
                    <h3>ROUND COMPLETE</h3>
                    <p>The word was: <strong>${s.secret_word}</strong></p>
                </div>
            `;
        }
        return `<div>Look at the Big Screen!</div>`;
    }

    private bindControllerActions() {
        // Target buttons (Mafia, Imposter voting)
        this.container.querySelectorAll(".btn-target").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const target = (e.currentTarget as HTMLElement).dataset.target;
                const action = (e.currentTarget as HTMLElement).dataset.action;
                if (target && action) {
                    this.socket.send("GAME_ACTION", { action, data: { target_id: target } });
                }
            });
        });

        // WitClash punchlines
        this.container.querySelectorAll(".btn-submit-punchline").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const pId = parseInt((e.currentTarget as HTMLElement).dataset.promptId || "0", 10);
                const input = this.container.querySelector(`#prompt-ans-${pId}`) as HTMLInputElement;
                if (input && input.value.trim()) {
                    this.socket.send("GAME_ACTION", { action: "SUBMIT_ANSWER", data: { prompt_id: pId, answer: input.value.trim() } });
                }
            });
        });

        // WitClash voting
        this.container.querySelectorAll(".btn-vote-choice").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const choice = parseInt((e.currentTarget as HTMLElement).dataset.choice || "1", 10);
                this.socket.send("GAME_ACTION", { action: "CAST_VOTE", data: { choice } });
            });
        });

        // Trivia options
        this.container.querySelectorAll(".btn-trivia-opt").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const choice = parseInt((e.currentTarget as HTMLElement).dataset.choice || "0", 10);
                (e.currentTarget as HTMLElement).classList.add("selected");
                this.socket.send("GAME_ACTION", { action: "SUBMIT_ANSWER", data: { choice } });
            });
        });

        // Imposter clutch guess
        const impGuessBtn = this.container.querySelector("#btn-submit-imp-guess");
        if (impGuessBtn) {
            impGuessBtn.addEventListener("click", () => {
                const input = this.container.querySelector("#imp-guess-input") as HTMLInputElement;
                if (input && input.value.trim()) {
                    this.socket.send("GAME_ACTION", { action: "SUBMIT_GUESS", data: { guess: input.value.trim() } });
                }
            });
        }

        // DoodleDash guessing
        const guessBtn = this.container.querySelector("#btn-submit-guess");
        if (guessBtn) {
            guessBtn.addEventListener("click", () => {
                const input = this.container.querySelector("#guess-input") as HTMLInputElement;
                if (input && input.value.trim()) {
                    this.socket.send("GAME_ACTION", { action: "SUBMIT_GUESS", data: { guess: input.value.trim() } });
                    input.value = "";
                }
            });
        }

        // DoodleDash touch drawing pad setup
        const canvas = this.container.querySelector("#mobile-draw-pad") as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#ffffff";

                const getPt = (e: PointerEvent) => {
                    const rect = canvas.getBoundingClientRect();
                    return {
                        x: (e.clientX - rect.left) * (canvas.width / rect.width),
                        y: (e.clientY - rect.top) * (canvas.height / rect.height)
                    };
                };

                canvas.addEventListener("pointerdown", (e) => {
                    canvas.setPointerCapture(e.pointerId);
                    this.isDrawing = true;
                    const pt = getPt(e);
                    this.lastDrawPt = pt;
                    ctx.beginPath();
                    ctx.moveTo(pt.x, pt.y);
                    this.socket.send("GAME_ACTION", { action: "DRAW_STROKE", data: { stroke: { type: "start", x: pt.x, y: pt.y } } });
                });

                canvas.addEventListener("pointermove", (e) => {
                    if (!this.isDrawing || !this.lastDrawPt) return;
                    const pt = getPt(e);
                    ctx.lineTo(pt.x, pt.y);
                    ctx.stroke();
                    this.lastDrawPt = pt;
                    this.socket.send("GAME_ACTION", { action: "DRAW_STROKE", data: { stroke: { type: "move", x: pt.x, y: pt.y } } });
                });

                const stopDraw = () => {
                    if (this.isDrawing) {
                        this.isDrawing = false;
                        this.lastDrawPt = null;
                        this.socket.send("GAME_ACTION", { action: "DRAW_STROKE", data: { stroke: { type: "end" } } });
                    }
                };

                canvas.addEventListener("pointerup", stopDraw);
                canvas.addEventListener("pointercancel", stopDraw);
            }

            const clearBtn = this.container.querySelector("#btn-clear-draw");
            if (clearBtn) {
                clearBtn.addEventListener("click", () => {
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                    this.socket.send("GAME_ACTION", { action: "CLEAR_CANVAS" });
                });
            }
        }
    }
}
