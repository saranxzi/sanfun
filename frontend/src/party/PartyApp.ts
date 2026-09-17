import { PartySocket } from "./PartySocket";
import { HostLobbyView } from "./views/HostLobbyView";
import { HostGameView } from "./views/HostGameView";
import { PlayerController } from "./views/PlayerController";
import type { LobbyState, HostGameState, PlayerGameState } from "./types";

export class PartyApp {
    private container: HTMLElement;
    private socket: PartySocket | null = null;
    private hostLobbyView: HostLobbyView | null = null;
    private hostGameView: HostGameView | null = null;
    private playerController: PlayerController | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    public async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const partyMode = urlParams.get("party"); // "host"
        const joinCode = urlParams.get("join");   // e.g. "ABCD"

        if (joinCode || partyMode === "player") {
            this.initPlayerMode(joinCode || "");
        } else {
            // Default to host mode
            await this.initHostMode();
        }
    }

    public async initHostMode() {
        // Create room via backend REST
        const loc = window.location;
        const apiBase = loc.port === "5173" ? `http://${loc.hostname}:8000` : "";

        try {
            const res = await fetch(`${apiBase}/api/party/create`, { method: "POST" });
            const data = await res.json();
            const roomCode = data.room_code;

            this.socket = new PartySocket(roomCode, "host");
            this.hostLobbyView = new HostLobbyView(this.container, this.socket);
            this.hostGameView = new HostGameView(this.container, this.socket);

            this.socket.onRoomState = (state: LobbyState | HostGameState) => {
                if (state.state === "LOBBY") {
                    this.hostLobbyView!.updateState(state as LobbyState);
                } else if (state.state === "IN_GAME") {
                    this.hostLobbyView?.destroy();
                    this.hostGameView!.updateState(state as HostGameState);
                }
            };

            this.socket.onTimerTick = (payload: { phase_timer: number }) => {
                this.hostGameView?.updateTimerTick(payload.phase_timer);
            };

            this.socket.connect();
        } catch (e) {
            console.error("Failed to initialize host room", e);
            this.container.innerHTML = `<div class="error-msg">Failed to initialize party server. Make sure backend is running on port 8000!</div>`;
        }
    }

    public initPlayerMode(roomCode: string) {
        this.socket = new PartySocket(roomCode, "player");
        this.playerController = new PlayerController(this.container, this.socket);

        this.socket.onRoomState = (state: LobbyState | HostGameState) => {
            if (state.state === "LOBBY") {
                this.playerController!.handleLobbyState(state as LobbyState);
            }
        };

        this.socket.onPlayerState = (state: PlayerGameState) => {
            this.playerController!.updateState(state);
        };

        this.socket.onTimerTick = (payload: { phase_timer: number }) => {
            this.playerController?.updateTimerTick(payload.phase_timer);
        };

        this.playerController.render();
    }
}
