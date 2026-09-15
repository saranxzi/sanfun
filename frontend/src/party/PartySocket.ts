import type { LobbyState, HostGameState, PlayerGameState } from "./types";

export class PartySocket {
    private ws: WebSocket | null = null;
    public roomCode: string;
    public role: "host" | "player";
    public sessionToken: string | null = null;
    public nickname: string = "";
    public avatar: string = "🦊";
    public color: string = "#00f0ff";

    public onRoomState?: (state: LobbyState | HostGameState) => void;
    public onPlayerState?: (state: PlayerGameState) => void;
    public onTimerTick?: (payload: { phase_timer: number }) => void;
    public onGameEvent?: (event: { event: string; [key: string]: any }) => void;
    public onError?: (msg: string) => void;
    public onOpen?: () => void;
    public onClose?: () => void;

    constructor(roomCode: string, role: "host" | "player" = "player") {
        this.roomCode = roomCode.toUpperCase().trim();
        this.role = role;
        this.sessionToken = localStorage.getItem(`sanfun_token_${this.roomCode}`);
    }

    public connect(): void {
        const loc = window.location;
        const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
        const host = loc.port === "5173" ? `${loc.hostname}:8000` : (loc.port ? `${loc.hostname}:${loc.port}` : loc.hostname);

        const query = new URLSearchParams({
            role: this.role
        });
        if (this.sessionToken) query.set("session_token", this.sessionToken);
        if (this.nickname) query.set("nickname", this.nickname);
        if (this.avatar) query.set("avatar", this.avatar);
        if (this.color) query.set("color", this.color);

        const wsUrl = `${protocol}//${host}/api/party/ws/${this.roomCode}?${query.toString()}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "ROOM_STATE" && this.onRoomState) {
                    this.onRoomState(msg.payload);
                } else if (msg.type === "PLAYER_STATE" && this.onPlayerState) {
                    if (msg.payload.session_token) {
                        this.sessionToken = msg.payload.session_token;
                        localStorage.setItem(`sanfun_token_${this.roomCode}`, msg.payload.session_token);
                    }
                    this.onPlayerState(msg.payload);
                } else if (msg.type === "TIMER_TICK" && this.onTimerTick) {
                    this.onTimerTick(msg.payload);
                } else if (msg.type === "GAME_EVENT" && this.onGameEvent) {
                    this.onGameEvent(msg.payload);
                } else if (msg.type === "ERROR" && this.onError) {
                    this.onError(msg.payload.message);
                }
            } catch (err) {
                console.error("Error parsing party WS message", err);
            }
        };

        this.ws.onclose = () => {
            if (this.onClose) this.onClose();
        };
    }

    public send(type: string, data: any = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }

    public close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
