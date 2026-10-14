import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HomeHub } from './components/HomeHub';
import { UnifiedLobby } from './components/UnifiedLobby';
import { GameContainer } from './components/GameContainer';
import { usePartySocket } from './hooks/usePartySocket';
import { soundEngine } from './audio/sound';

export function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [role, setRole] = useState<'host' | 'player'>('player');
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('🦊');
  const [color, setColor] = useState<string>('#E25241');
  const [initialJoinCode, setInitialJoinCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (params.get('join') || '').toUpperCase().trim();
    }
    return '';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setInitialJoinCode(joinCode.toUpperCase().trim());
    }
  }, []);

  const handleGameEvent = useCallback((event: any) => {
    // Game event handling
  }, []);

  const handleError = useCallback((msg: string) => {
    alert(`⚠️ ${msg}`);
  }, []);

  const {
    connected,
    lobbyState,
    hostGameState,
    playerGameState,
    phaseTimer,
    errorMsg,
    selectGame,
    startGame,
    backToLobby,
    sendGameAction,
    kickPlayer,
    promoteHost,
    clearScores,
    updateSettings,
    skipPhase,
  } = usePartySocket({
    roomCode: roomCode || '',
    role,
    hostToken,
    nickname,
    avatar,
    color,
    onGameEvent: handleGameEvent,
    onError: handleError,
  });

  const handleJoin = (code: string, nick: string, av: string, col: string) => {
    setNickname(nick);
    setAvatar(av);
    setColor(col);
    setRole('player');
    setHostToken(null);
    setRoomCode(code.toUpperCase().trim());
  };

  const handleCreate = async (nick: string, av: string, col: string) => {
    try {
      const loc = window.location;
      const apiBase = loc.port === '5173' ? `http://${loc.hostname}:8000` : '';
      const res = await fetch(`${apiBase}/api/party/create`, { method: 'POST' });
      const data = await res.json();

      setNickname(nick);
      setAvatar(av);
      setColor(col);
      setRole('host');
      setHostToken(data.host_token);
      setRoomCode(data.room_code);
    } catch (e) {
      alert('Failed to create party room. Ensure backend is running!');
    }
  };

  const handleLeave = () => {
    if (roomCode) {
      localStorage.removeItem(`sanfun_token_${roomCode}`);
    }
    setRoomCode(null);
    setHostToken(null);
    setRole('player');
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Determine current active state
  const isHost = role === 'host' || (playerGameState?.is_host === true);
  const isInGame = (hostGameState && hostGameState.state === 'IN_GAME') ||
    (playerGameState && playerGameState.state === 'IN_GAME' && playerGameState.phase !== 'LOBBY');
  const activeGameState = role === 'host' ? (playerGameState || hostGameState) : playerGameState;

  return (
    <div className="min-h-screen bg-paper-light text-ink flex flex-col font-body">
      <Navbar roomCode={lobbyState?.room_code || roomCode} connected={connected} onLeave={roomCode ? handleLeave : undefined} />

      <main className="flex-1 pb-12">
        {!roomCode ? (
          <HomeHub onJoin={handleJoin} onCreate={handleCreate} initialCode={initialJoinCode} />
        ) : isInGame && activeGameState ? (
          <GameContainer
            isHost={isHost}
            gameState={activeGameState}
            hostGameState={hostGameState}
            playerGameState={playerGameState}
            phaseTimer={phaseTimer}
            onBackToLobby={backToLobby}
            onSendAction={sendGameAction}
            onSkipPhase={skipPhase}
          />
        ) : lobbyState ? (
          <UnifiedLobby
            lobbyState={lobbyState}
            isHost={isHost}
            myPlayerId={playerGameState?.player_id}
            onSelectGame={selectGame}
            onStartGame={startGame}
            onKickPlayer={kickPlayer}
            onPromoteHost={promoteHost}
            onClearScores={clearScores}
            onUpdateSettings={updateSettings}
          />
        ) : (
          <div className="text-center py-20 font-mono text-sm font-bold text-ink-muted">
            <div className="animate-bounce text-4xl mb-3">🎮</div>
            Connecting to Party Room {roomCode}...
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-ink bg-paper py-4 px-4 text-center font-mono text-xs text-ink-muted">
        <span>SANFUN ARCADE • COUCH CO-OP PARTY ENGINE</span>
      </footer>
    </div>
  );
}
export default App;
