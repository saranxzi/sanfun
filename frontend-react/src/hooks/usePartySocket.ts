import { useState, useEffect, useRef, useCallback } from 'react';
import type { LobbyState, HostGameState, PlayerGameState } from '../types';
import { soundEngine } from '../audio/sound';

interface UsePartySocketOptions {
  roomCode: string;
  role: 'host' | 'player';
  hostToken?: string | null;
  nickname?: string;
  avatar?: string;
  color?: string;
  onGameEvent?: (event: { event: string; [key: string]: any }) => void;
  onError?: (msg: string) => void;
}

export function usePartySocket({
  roomCode,
  role,
  hostToken,
  nickname,
  avatar,
  color,
  onGameEvent,
  onError,
}: UsePartySocketOptions) {
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [hostGameState, setHostGameState] = useState<HostGameState | null>(null);
  const [playerGameState, setPlayerGameState] = useState<PlayerGameState | null>(null);
  const [phaseTimer, setPhaseTimer] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(1000);
  const manualCloseRef = useRef<boolean>(false);
  const prevPlayerCountRef = useRef<number>(0);

  const normalizedCode = roomCode.toUpperCase().trim();
  const tokenKey = `sanfun_token_${normalizedCode}`;

  const connect = useCallback(() => {
    if (!normalizedCode || manualCloseRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc.port === '5173' ? `${loc.hostname}:8000` : (loc.port ? `${loc.hostname}:${loc.port}` : loc.hostname);

    const query = new URLSearchParams({ role });
    if (hostToken) query.set('host_token', hostToken);

    const savedSessionToken = localStorage.getItem(tokenKey);
    if (savedSessionToken) query.set('session_token', savedSessionToken);
    if (nickname) query.set('nickname', nickname);
    if (avatar) query.set('avatar', avatar);
    if (color) query.set('color', color);

    const wsUrl = `${protocol}//${host}/api/party/ws/${normalizedCode}?${query.toString()}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMsg(null);
      backoffRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'ROOM_STATE': {
            if (payload.state === 'LOBBY') {
              setLobbyState(payload);
              setHostGameState(null);
              // Audio cue on player join/leave
              if (payload.player_count > prevPlayerCountRef.current) {
                soundEngine.playJoin();
              } else if (payload.player_count < prevPlayerCountRef.current) {
                soundEngine.playLeave();
              }
              prevPlayerCountRef.current = payload.player_count;
            } else if (payload.state === 'IN_GAME') {
              setHostGameState(payload);
              if (payload.phase_timer !== undefined) {
                setPhaseTimer(payload.phase_timer);
              }
            }
            break;
          }

          case 'PLAYER_STATE': {
            if (payload.session_token) {
              localStorage.setItem(tokenKey, payload.session_token);
            }
            setPlayerGameState(payload);
            if (payload.phase_timer !== undefined) {
              setPhaseTimer(payload.phase_timer);
            }
            break;
          }

          case 'TIMER_TICK': {
            if (payload.phase_timer !== undefined) {
              setPhaseTimer(payload.phase_timer);
              if (payload.phase_timer <= 5 && payload.phase_timer > 0) {
                soundEngine.playTick();
              }
            }
            break;
          }

          case 'GAME_EVENT': {
            if (payload.event === 'GAME_STARTED') {
              soundEngine.playStart();
            } else if (payload.event === 'BACK_TO_LOBBY' || payload.event === 'RETURN_TO_LOBBY') {
              setHostGameState(null);
              setPlayerGameState((prev) => (prev ? { ...prev, state: 'LOBBY', phase: 'LOBBY' } : null));
              soundEngine.playDing();
            } else if (payload.event === 'PLAYER_KICKED') {
              soundEngine.playLeave();
            } else if (payload.event === 'PROMOTED_TO_HOST') {
              setPlayerGameState((prev) => (prev ? { ...prev, is_host: true } : prev));
              soundEngine.playDing();
            }
            onGameEvent?.(payload);
            break;
          }

          case 'ERROR': {
            const err = payload?.message || 'Server error';
            setErrorMsg(err);
            onError?.(err);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      wsRef.current = null;

      if (!manualCloseRef.current && event.code !== 1008) {
        const timeout = Math.min(backoffRef.current, 10000);
        backoffRef.current = Math.min(backoffRef.current * 1.5, 10000);
        reconnectTimeoutRef.current = setTimeout(connect, timeout);
      }
    };

    ws.onerror = () => {
      // Handled in onclose
    };
  }, [normalizedCode, role, hostToken, nickname, avatar, color, tokenKey, onGameEvent, onError]);

  useEffect(() => {
    manualCloseRef.current = false;
    connect();

    // Heartbeat ping every 15 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);

    return () => {
      manualCloseRef.current = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((type: string, data: any = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
    }
  }, []);

  const selectGame = useCallback((gameId: string) => {
    send('SELECT_GAME', { game_id: gameId });
  }, [send]);

  const startGame = useCallback(() => {
    send('START_GAME', {});
  }, [send]);

  const backToLobby = useCallback(() => {
    send('BACK_TO_LOBBY', {});
  }, [send]);

  const sendGameAction = useCallback((action: string, data: any = {}) => {
    send('GAME_ACTION', { action, data });
  }, [send]);

  const kickPlayer = useCallback((targetPid: string) => {
    send('KICK_PLAYER', { target_player_id: targetPid });
  }, [send]);

  const promoteHost = useCallback((targetPid: string) => {
    send('PROMOTE_HOST', { target_player_id: targetPid });
  }, [send]);

  return {
    connected,
    lobbyState,
    hostGameState,
    playerGameState,
    phaseTimer,
    errorMsg,
    send,
    selectGame,
    startGame,
    backToLobby,
    sendGameAction,
    kickPlayer,
    promoteHost,
  };
}
