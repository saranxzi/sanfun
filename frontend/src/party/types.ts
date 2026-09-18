export interface PlayerInfo {
    id: string;
    nickname: string;
    avatar: string;
    color: string;
    is_host: boolean;
    is_connected: boolean;
    score: number;
}

export interface GameMetadata {
    id: string;
    name: string;
    tagline: string;
    description: string;
    icon: string;
    min_players: number;
    max_players: number;
}

export interface NetworkInfo {
    primary_ip: string;
    candidates: string[];
    port: number;
    local_url: string;
    tunnel_url?: string | null;
    is_loopback: boolean;
}

export interface LobbyState {
    room_code: string;
    state: "LOBBY" | "IN_GAME";
    selected_game_id: string;
    available_games: GameMetadata[];
    players: PlayerInfo[];
    player_count: number;
    host_connected: boolean;
    network_info: NetworkInfo;
}

export interface HostGameState {
    room_code: string;
    state: "IN_GAME";
    game_id: string;
    phase: string;
    phase_timer: number;
    round_number?: number;
    players: any[];
    winner?: string | null;
    [key: string]: any;
}

export interface PlayerGameState {
    player_id?: string;
    session_token?: string;
    nickname?: string;
    avatar?: string;
    color?: string;
    room_code: string;
    state: "LOBBY" | "IN_GAME";
    game_id?: string;
    phase?: string;
    phase_timer?: number;
    is_alive?: boolean;
    my_role?: string;
    is_imposter?: boolean;
    secret_word?: string;
    imposter_hint?: string | null;
    my_prompts?: any[];
    candidates?: any[];
    my_vote?: any;
    score?: number;
    [key: string]: any;
}
