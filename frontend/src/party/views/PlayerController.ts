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
    private cardHidden: boolean = false;
    private hintRevealed: boolean = false;

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

        if (newPhase === "WORD_REVEAL" && prevPhase !== "WORD_REVEAL") {
            this.cardHidden = false;
            this.hintRevealed = false;
        }

        this.state = merged;

        // Preserve form inputs across renders
        const savedInputs: Record<string, string> = {};
        this.container.querySelectorAll("input").forEach(input => {
            if (input.id) savedInputs[input.id] = input.value;
        });

        this.render();

        Object.entries(savedInputs).forEach(([id, val]) => {
            const input = this.container.querySelector(`#${id}`) as HTMLInputElement;
            if (input && !input.value) input.value = val;
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
                        <input type="text" id="join-nick" maxlength="16" placeholder="Your Name" value="${savedNick}" class="input-nick" />
                    </div>
                    <button id="btn-player-join" class="btn-primary-mobile">ENTER PARTY</button>
                </div>
            </div>
        `;

        this.container.querySelector("#btn-player-join")?.addEventListener("click", () => {
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

    private renderLobbyWaiting() {
        this.container.innerHTML = `
            <div class="player-waiting-screen">
                <div class="controller-card">
                    <div class="player-profile-mini" style="justify-content: center; margin-bottom: 1rem;">
                        <span class="av">${this.state!.avatar || "🎮"}</span>
                        <span class="nick">${this.state!.nickname || "Player"}</span>
                    </div>
                    <h3>YOU'RE IN! 🎉</h3>
                    <p style="margin: 0.8rem 0; color: #aaa;">Room: <strong style="color: var(--primary);">${this.state!.room_code}</strong></p>
                    <p style="font-size: 0.85rem; color: #777;">Look at the Big Screen! The host will choose a game to start.</p>
                </div>
            </div>
        `;
    }

    private renderCandidateList(candidates: any[] | undefined, selectedId: any, action: string): string {
        if (!candidates || candidates.length === 0) return "";
        return `
            <div class="candidates-list">
                ${candidates.map((c: any) => `
                    <button class="btn-target ${selectedId === c.id ? "selected" : ""}" data-action="${action}" data-target="${c.id}">
                        ${c.avatar} ${c.nickname}
                    </button>
                `).join("")}
            </div>
        `;
    }

    private renderGameController() {
        const s = this.state!;
        let html = "";

        switch (s.game_id) {
            case "mafia": html = this.renderMafiaController(); break;
            case "imposter": html = this.renderImposterController(); break;
            case "witclash": html = this.renderWitClashController(); break;
            case "trivia": html = this.renderTriviaController(); break;
            case "doodledash": html = this.renderDoodleController(); break;
            case "mostlikely": html = this.renderMostLikelyController(); break;
            case "wordbomb": html = this.renderWordBombController(); break;
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

    private renderMafiaController(): string {
        const s = this.state!;
        if (!s.is_alive) return `<div class="dead-screen">👻 Eliminated! Watch the trial on TV.</div>`;

        if (s.phase === "ROLE_REVEAL") {
            const hints: Record<string, string> = {
                MAFIA: "Eliminate villagers in secret without being discovered.",
                DOCTOR: "Choose 1 person each night to protect from death.",
                DETECTIVE: "Investigate 1 person each night to learn their role.",
                VILLAGER: "Find and vote out the Mafia during daytime town debates."
            };
            return `
                <div class="role-reveal-phone">
                    <h3>SECRET ROLE</h3>
                    <div class="role-card-box" style="border-color: var(--primary);">
                        <div class="role-name">${s.my_role || "VILLAGER"}</div>
                        <p class="role-hint">${hints[s.my_role || "VILLAGER"] || hints.VILLAGER}</p>
                    </div>
                </div>
            `;
        } else if (s.phase === "NIGHT_ACTIONS") {
            if (s.night_action === "MAFIA_KILL") {
                return `<h3>🔪 NIGHT ATTACK</h3>${this.renderCandidateList(s.candidates, s.my_vote, "MAFIA_KILL")}`;
            } else if (s.night_action === "DOCTOR_HEAL") {
                return `<h3>💉 HEAL SOMEONE</h3>${this.renderCandidateList(s.candidates, s.my_heal, "DOCTOR_HEAL")}`;
            } else if (s.night_action === "DETECTIVE_INVESTIGATE") {
                const res = s.detective_result ? `<div class="panel-glass" style="padding: 0.6rem; margin-bottom: 0.8rem; color: var(--accent);"><strong>${s.detective_result.target_name}</strong>: ${s.detective_result.alignment}</div>` : "";
                return `<h3>🔍 INVESTIGATE</h3>${res}${this.renderCandidateList(s.candidates, null, "DETECTIVE_INVESTIGATE")}`;
            }
            return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><h3>😴 SLEEPING</h3><p style="color: #888;">Rest up for tomorrow's debate.</p></div>`;
        } else if (s.phase === "DAY_VOTE") {
            return `
                <h3>⚖️ CAST VOTE</h3>
                ${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE")}
                <button class="btn-skip" data-action="CAST_VOTE" data-target="SKIP">SKIP VOTE</button>
            `;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private renderImposterController(): string {
        const s = this.state!;
        if (s.phase === "WORD_REVEAL" || s.phase === "CLUE_ROUNDS") {
            return `
                <div class="imposter-wrapper-phone">
                    <div class="card-privacy-bar">
                        <button id="btn-toggle-card" class="btn-card-toggle">
                            ${this.cardHidden ? "👁️ REVEAL CARD" : "🙈 HIDE CARD"}
                        </button>
                    </div>

                    ${this.cardHidden ? `
                        <div class="imposter-card-phone card-hidden-state" id="card-box-toggle">
                            <div class="cat-pill">CATEGORY: ${s.category}</div>
                            <div class="card-hidden-overlay">
                                <div class="lock-icon">🔒</div>
                                <h3>CARD HIDDEN</h3>
                                <p class="tap-note">Tap here to view your secret role</p>
                            </div>
                        </div>
                    ` : `
                        <div class="imposter-card-phone" id="card-box-toggle">
                            <div class="cat-pill">CATEGORY: ${s.category}</div>
                            ${s.is_imposter ? `
                                <h2 style="color: #ff0055; margin-bottom: 0.6rem;">YOU ARE THE IMPOSTER! 🦎</h2>
                                <p style="color: #aaa; font-size: 0.85rem; margin-bottom: 1.2rem;">You do not know the secret word. Blend in, listen carefully, and bluff!</p>
                                
                                <!-- Imposter-only Hint Feature -->
                                <div class="imposter-hint-container">
                                    <button id="btn-toggle-hint" class="btn-imposter-hint">
                                        ${this.hintRevealed ? "💡 HIDE HINT" : "💡 REVEAL HINT"}
                                    </button>
                                    ${this.hintRevealed && s.imposter_hint ? `
                                        <div class="imposter-hint-box">
                                            <span class="hint-label">CONFIDENTIAL CLUE:</span>
                                            <p class="hint-text">${s.imposter_hint}</p>
                                        </div>
                                    ` : ""}
                                </div>
                            ` : `
                                <div style="font-size: 0.85rem; color: #888; margin-bottom: 0.4rem;">SECRET WORD</div>
                                <h2 style="color: var(--green); font-size: 2.2rem; margin-bottom: 0.8rem; letter-spacing: 1px;">${s.secret_word}</h2>
                                <p style="color: #888; font-size: 0.8rem;">Keep this word hidden from the imposter!</p>
                            `}
                        </div>
                    `}
                </div>
            `;
        } else if (s.phase === "VOTING") {
            return `<h3>WHO IS THE IMPOSTER?</h3>${this.renderCandidateList(s.candidates, s.my_vote, "CAST_VOTE")}`;
        } else if (s.phase === "IMPOSTER_GUESS") {
            if (s.is_imposter) {
                return `
                    <div class="panel-glass" style="padding: 1.5rem;">
                        <h3>CLUTCH GUESS</h3>
                        <p class="guess-note">Guess the secret word to win!</p>
                        <div class="guess-form">
                            <input type="text" id="imp-guess-input" placeholder="Secret word..." autofocus />
                            <button id="btn-submit-imp-guess">GUESS</button>
                        </div>
                    </div>
                `;
            }
            return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>The Imposter is guessing...</p></div>`;
        } else if (s.phase === "GAME_OVER") {
            return `
                <div class="panel-glass gameover-phone" style="padding: 2rem; text-align: center;">
                    <h2>ROUND FINISHED! 🏆</h2>
                    <div class="player-score-badge" style="margin: 1rem 0; font-size: 1.2rem; color: var(--primary);">
                        Current Score: <strong>${s.score || 0} pts</strong>
                    </div>
                    <p style="color: #aaa; font-size: 0.85rem;">Look at the Big Screen for final results!</p>
                    <p style="color: #666; font-size: 0.8rem; margin-top: 0.8rem;">Waiting for host to start the next round...</p>
                </div>
            `;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private renderWitClashController(): string {
        const s = this.state!;
        if (s.phase === "PROMPT_INPUT") {
            return `
                <div class="witclash-phone">
                    ${(s.my_prompts || []).map((p: any) => `
                        <div class="prompt-input-card" style="padding: 1rem; margin-bottom: 1rem;">
                            <p style="font-weight: bold; margin-bottom: 0.5rem; color: var(--accent);">"${p.text}"</p>
                            ${p.answered ? `<span style="color: var(--green); font-size: 0.85rem;">✓ Answer Submitted</span>` : `
                                <input type="text" maxlength="80" placeholder="Your punchline..." id="prompt-ans-${p.id}" style="width: 100%; padding: 0.6rem; margin-bottom: 0.6rem;" />
                                <button class="btn-submit-punchline" data-prompt-id="${p.id}" style="width: 100%; padding: 0.6rem; background: var(--primary); color: #000; font-weight: bold;">SUBMIT</button>
                            `}
                        </div>
                    `).join("")}
                </div>
            `;
        } else if (s.phase === "SHOWDOWN_VOTE") {
            if (s.can_vote) {
                return `
                    <div class="vote-phone-options">
                        <h3 style="text-align: center;">VOTE FOR THE BEST!</h3>
                        <button class="btn-vote-choice choice-1" data-choice="1">A: "${s.answer_1}"</button>
                        <button class="btn-vote-choice choice-2" data-choice="2">B: "${s.answer_2}"</button>
                    </div>
                `;
            }
            return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Your matchup! Watch the votes roll in on TV.</p></div>`;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private renderTriviaController(): string {
        const s = this.state!;
        if (s.phase === "QUESTION") {
            if (s.has_answered) {
                const choiceSymbols = ["▲ Red", "◆ Blue", "● Yellow", "■ Green"];
                const choiceText = s.selected_choice !== null && s.selected_choice !== undefined ? choiceSymbols[s.selected_choice] : "Registered";
                return `
                    <div class="locked-card panel-glass">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔒</div>
                        <h3>ANSWER LOCKED IN</h3>
                        <div class="locked-choice">${choiceText}</div>
                        <p class="locked-sub">Results will reveal on TV when the clock expires!</p>
                    </div>
                `;
            }
            return `
                <div class="trivia-mobile-buttons">
                    <button class="btn-trivia-opt opt-0" data-choice="0">▲</button>
                    <button class="btn-trivia-opt opt-1" data-choice="1">◆</button>
                    <button class="btn-trivia-opt opt-2" data-choice="2">●</button>
                    <button class="btn-trivia-opt opt-3" data-choice="3">■</button>
                </div>
            `;
        } else if (s.phase === "REVEAL") {
            return `
                <div class="panel-glass" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">${s.is_correct ? "🎉" : "❌"}</div>
                    <h2 style="color: ${s.is_correct ? "var(--green)" : "#ff0055"};">${s.is_correct ? "CORRECT!" : "WRONG!"}</h2>
                    <p style="margin-top: 0.5rem;">Streak: <strong>${s.streak || 0}</strong> 🔥</p>
                </div>
            `;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Get ready for next question...</p></div>`;
    }

    private renderDoodleController(): string {
        const s = this.state!;
        if (s.is_drawer && s.phase === "DRAWING") {
            return `
                <div class="doodle-phone-canvas">
                    <div class="doodle-top-bar">
                        <span>Draw:</span>
                        <span class="word-to-draw">${s.secret_word}</span>
                    </div>
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
                        <div class="panel-glass" style="padding: 2rem; text-align: center; border-color: var(--green);">
                            <h3 style="color: var(--green);">YOU GUESSED IT! 🎉</h3>
                            <p style="color: #aaa; font-size: 0.85rem; margin-top: 0.4rem;">Points awarded! Watch others guess.</p>
                        </div>
                    ` : `
                        <div class="panel-glass" style="padding: 1.5rem;">
                            <h3>GUESS THE DRAWING</h3>
                            <div class="guess-form">
                                <input type="text" id="guess-input" placeholder="Type word..." autocomplete="off" />
                                <button id="btn-submit-guess">GUESS</button>
                            </div>
                        </div>
                    `}
                </div>
            `;
        } else if (s.phase === "ROUND_SUMMARY") {
            return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><h3>ROUND COMPLETE</h3><p>The word was: <strong>${s.secret_word}</strong></p></div>`;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private renderMostLikelyController(): string {
        const s = this.state!;
        const promptText = s.question || s.prompt || "Who is most likely to...";
        if (s.phase === "QUESTION_VOTE" || s.phase === "VOTING") {
            if (s.has_voted) {
                const votedCandidate = s.candidates?.find((c: any) => c.id === s.my_vote);
                const votedName = votedCandidate ? votedCandidate.nickname : "Your pick";
                return `
                    <div class="panel-glass" style="padding: 2rem; text-align: center;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🗳️</div>
                        <h3>VOTE RECORDED!</h3>
                        <p style="color: var(--primary); font-weight: bold; margin: 0.5rem 0;">Picked: ${votedName}</p>
                        <p style="color: #888; font-size: 0.85rem;">Look at the big screen when votes are revealed!</p>
                    </div>
                `;
            }
            return `
                <div class="mostlikely-phone">
                    <div class="prompt-box" style="margin-bottom: 1.2rem; text-align: center;">
                        <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">WHO IS MOST LIKELY TO:</span>
                        <h2 style="font-size: 1.15rem; color: var(--accent); margin-top: 0.3rem;">"${promptText}"</h2>
                    </div>
                    <div class="candidates-vote-grid" style="display: flex; flex-direction: column; gap: 0.6rem;">
                        ${(s.candidates || []).map((c: any) => `
                            <button class="btn-mostlikely-candidate ${s.my_vote === c.id ? "selected" : ""}" data-candidate-id="${c.id}" style="display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 1.2rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: #fff; font-size: 1rem; cursor: pointer; text-align: left; width: 100%;">
                                <span style="font-size: 1.4rem;">${c.avatar}</span>
                                <span style="font-weight: 600;">${c.nickname}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>
            `;
        } else if (s.phase === "VOTE_REVEAL" || s.phase === "REVEAL") {
            return `
                <div class="panel-glass" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
                    <h3>RESULTS ON SCREEN!</h3>
                    <p style="color: #aaa; margin-top: 0.5rem;">Check the TV to see who got roasted and who scored!</p>
                </div>
            `;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private renderWordBombController(): string {
        const s = this.state!;
        const strikes = s.strikes !== undefined ? s.strikes : 0;
        const lives = s.my_lives !== undefined ? s.my_lives : Math.max(0, 3 - strikes);
        const isAlive = lives > 0;
        const currentPrompt = s.current_prompt || s.prompt || "...";
        const isMyTurn = Boolean(s.is_holding_bomb || s.is_active);

        if (!isAlive) {
            return `
                <div class="panel-glass" style="padding: 2rem; text-align: center; border-color: #ff0055;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">💀</div>
                    <h2 style="color: #ff0055;">YOU ARE OUT!</h2>
                    <p style="color: #aaa; font-size: 0.85rem; margin-top: 0.5rem;">You ran out of lives. Cheer for the survivors on TV!</p>
                </div>
            `;
        }

        if (s.phase === "ROUND_ACTIVE" || s.phase === "ROUND") {
            if (isMyTurn) {
                return `
                    <div class="wordbomb-active-turn" style="text-align: center;">
                        <div style="font-size: 2.5rem; animation: pulse 0.8s infinite alternate;">💣</div>
                        <h2 style="color: #ff0055; margin: 0.3rem 0;">YOUR TURN! DEFUSE IT!</h2>
                        <div class="letters-prompt-card" style="background: rgba(255, 0, 85, 0.12); border: 1px solid #ff0055; border-radius: 12px; padding: 1rem; margin: 1rem 0;">
                            <div style="font-size: 0.8rem; color: #aaa; letter-spacing: 0.05em;">MUST CONTAIN:</div>
                            <div style="font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: 0.15em;">${currentPrompt}</div>
                        </div>
                        <div class="word-submit-box" style="display: flex; flex-direction: column; gap: 0.8rem;">
                            <input type="text" id="wordbomb-input" class="input-nick" placeholder="Type a word..." autocomplete="off" autofocus style="text-transform: uppercase; font-size: 1.2rem; text-align: center; font-weight: bold; width: 100%;" />
                            <button id="btn-submit-wordbomb" class="btn-primary-mobile" style="background: linear-gradient(135deg, #ff0055, #ff5500); border-color: #ff5500;">PASS BOMB ➔</button>
                        </div>
                        <div class="lives-indicator" style="margin-top: 1rem; font-size: 0.9rem; color: #aaa;">
                            Lives: <span style="letter-spacing: 2px;">${"❤️".repeat(lives)}</span>
                        </div>
                    </div>
                `;
            }
            return `
                <div class="wordbomb-waiting-turn panel-glass" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
                    <h3>BOMB IS TICKING!</h3>
                    <p style="color: var(--accent); margin: 0.5rem 0;"><strong>${s.holder_name || s.active_player_name || "Someone"}</strong> has the bomb!</p>
                    <div style="background: rgba(255,255,255,0.06); padding: 0.5rem 1rem; border-radius: 20px; display: inline-block; margin-top: 0.5rem;">
                        Contains: <strong style="color: var(--primary); letter-spacing: 1px;">${currentPrompt}</strong>
                    </div>
                    <div class="lives-indicator" style="margin-top: 1.5rem; font-size: 0.9rem; color: #aaa;">
                        Your Lives: <span style="letter-spacing: 2px;">${"❤️".repeat(lives)}</span>
                    </div>
                    <p style="color: #777; font-size: 0.8rem; margin-top: 1rem;">Get ready to type when the bomb is passed to you!</p>
                </div>
            `;
        } else if (s.phase === "EXPLOSION") {
            return `
                <div class="panel-glass" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">💥</div>
                    <h2>BOOM!</h2>
                    <p style="color: #aaa;">${s.last_exploded_player || s.exploded_player_name || "A player"} ran out of time!</p>
                </div>
            `;
        }
        return `<div class="panel-glass" style="padding: 2rem; text-align: center;"><p>Look at the Big Screen!</p></div>`;
    }

    private bindControllerActions() {
        // Most Likely To voting
        this.container.querySelectorAll(".btn-mostlikely-candidate").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetId = (e.currentTarget as HTMLElement).dataset.candidateId;
                if (targetId) this.socket.send("GAME_ACTION", { action: "CAST_VOTE", data: { target_id: targetId } });
            });
        });

        // Word Bomb submit word
        const submitWordBomb = () => {
            const input = this.container.querySelector("#wordbomb-input") as HTMLInputElement;
            if (input && input.value.trim()) {
                this.socket.send("GAME_ACTION", { action: "SUBMIT_WORD", data: { word: input.value.trim() } });
                input.value = "";
            }
        };
        this.container.querySelector("#btn-submit-wordbomb")?.addEventListener("click", submitWordBomb);
        this.container.querySelector("#wordbomb-input")?.addEventListener("keydown", (e: Event) => {
            if ((e as KeyboardEvent).key === "Enter") {
                e.preventDefault();
                submitWordBomb();
            }
        });

        // Target buttons
        this.container.querySelectorAll(".btn-target, .btn-skip").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const el = e.currentTarget as HTMLElement;
                const target = el.dataset.target;
                const action = el.dataset.action;
                if (target && action) this.socket.send("GAME_ACTION", { action, data: { target_id: target } });
            });
        });

        // WitClash submit punchline
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
                this.socket.send("GAME_ACTION", { action: "SUBMIT_ANSWER", data: { choice } });
            });
        });

        // Imposter card privacy toggle
        this.container.querySelector("#btn-toggle-card")?.addEventListener("click", () => {
            this.cardHidden = !this.cardHidden;
            this.render();
        });

        const cardBox = this.container.querySelector("#card-box-toggle");
        if (cardBox) {
            cardBox.addEventListener("click", (e) => {
                if ((e.target as HTMLElement).closest("#btn-toggle-hint")) return;
                this.cardHidden = !this.cardHidden;
                this.render();
            });
        }

        // Imposter hint toggle
        this.container.querySelector("#btn-toggle-hint")?.addEventListener("click", (e) => {
            e.stopPropagation();
            this.hintRevealed = !this.hintRevealed;
            this.render();
        });

        // Imposter guess
        this.container.querySelector("#btn-submit-imp-guess")?.addEventListener("click", () => {
            const input = this.container.querySelector("#imp-guess-input") as HTMLInputElement;
            if (input?.value.trim()) this.socket.send("GAME_ACTION", { action: "SUBMIT_GUESS", data: { guess: input.value.trim() } });
        });

        // DoodleDash guess
        this.container.querySelector("#btn-submit-guess")?.addEventListener("click", () => {
            const input = this.container.querySelector("#guess-input") as HTMLInputElement;
            if (input?.value.trim()) {
                this.socket.send("GAME_ACTION", { action: "SUBMIT_GUESS", data: { guess: input.value.trim() } });
                input.value = "";
            }
        });

        // Touch drawing pad
        const canvas = this.container.querySelector("#mobile-draw-pad") as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#00f0ff";

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

            this.container.querySelector("#btn-clear-draw")?.addEventListener("click", () => {
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.socket.send("GAME_ACTION", { action: "CLEAR_CANVAS" });
            });
        }
    }
}
