import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/sound';
import { useSmoothTimer } from '../hooks/useSmoothTimer';
import { MafiaView } from './games/MafiaView';
import { ImposterView } from './games/ImposterView';
import { DialedView } from './games/DialedView';
import { FermiView } from './games/FermiView';
import { GuessPriceView } from './games/GuessPriceView';
import { CircleView } from './games/CircleView';
import { WouldYouRatherView } from './games/WouldYouRatherView';
import { TrendsView } from './games/TrendsView';
import { ArrowLeft, Clock, FastForward, Star, Gamepad2, Tv } from 'lucide-react';

interface GameContainerProps {
  isHost: boolean;
  gameState: any;
  hostGameState?: any;
  playerGameState?: any;
  phaseTimer: number;
  onBackToLobby: () => void;
  onSendAction: (action: string, data?: any) => void;
  onSkipPhase?: () => void;
}

export function GameContainer({
  isHost,
  gameState,
  hostGameState,
  playerGameState,
  phaseTimer,
  onBackToLobby,
  onSendAction,
  onSkipPhase,
}: GameContainerProps) {
  // If host is also a player, allow switching between Controller view and TV view
  const [hostViewMode, setHostViewMode] = useState<'controller' | 'tv'>('controller');

  const activeState = (isHost && hostViewMode === 'tv' && hostGameState)
    ? hostGameState
    : (playerGameState || gameState);

  const viewAsHost = isHost && hostViewMode === 'tv';
  const gameId = activeState?.game_id || gameState?.game_id || 'rather';
  const isGameOver = activeState?.phase === 'GAME_OVER' || activeState?.is_over || gameState?.phase === 'GAME_OVER';
  const { formatted, isUrgent } = useSmoothTimer(phaseTimer);

  const myScore = playerGameState?.score ?? playerGameState?.my_score ?? gameState?.score ?? gameState?.my_score ?? 0;

  useEffect(() => {
    if (isGameOver) {
      soundEngine.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E25241', '#F5A623', '#2B6CB0', '#2A9D8F'],
      });
    }
  }, [isGameOver]);

  const renderGameView = () => {
    switch (gameId) {
      case 'mafia':
        return <MafiaView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'imposter':
        return <ImposterView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'dialed':
        return <DialedView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'fermi':
        return <FermiView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'guess_price':
      case 'auction':
        return <GuessPriceView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'circle':
        return <CircleView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'rather':
      case 'trolley':
        return <WouldYouRatherView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      case 'trends':
        return <TrendsView isHost={viewAsHost} gameState={activeState} onSendAction={onSendAction} />;
      default:
        return <div className="text-center font-mono">Unknown game engine: {gameId}</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Game Controls, Score HUD & Timer Bar */}
      <div className="retro-box-lg rounded-2xl p-4 bg-white flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back to Lobby & Game Name */}
        <div className="flex items-center gap-2.5">
          {isHost && (
            <button
              onClick={onBackToLobby}
              className="retro-btn bg-paper text-ink px-3 py-1.5 rounded-xl text-xs uppercase flex items-center gap-1.5 hover:bg-paper-warm"
              title="Return all players to the lobby"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Lobby</span>
            </button>
          )}

          <div className="font-display font-black text-base md:text-lg text-ink uppercase flex items-center gap-1.5">
            <span>{activeState?.name || gameId.toUpperCase()}</span>
          </div>

          {/* Host Mode View Switcher (Controller vs TV Screen) */}
          {isHost && hostGameState && playerGameState && (
            <div className="flex items-center bg-paper-light border-2 border-ink rounded-xl p-0.5 shadow-retro-sm">
              <button
                type="button"
                onClick={() => {
                  setHostViewMode('controller');
                  soundEngine.playDing();
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  hostViewMode === 'controller'
                    ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                    : 'text-ink hover:bg-paper-warm'
                }`}
              >
                <Gamepad2 size={13} />
                <span>Play</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHostViewMode('tv');
                  soundEngine.playDing();
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  hostViewMode === 'tv'
                    ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                    : 'text-ink hover:bg-paper-warm'
                }`}
              >
                <Tv size={13} />
                <span>TV View</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Player Score HUD & Phase Countdown Timer & Host Skip Control */}
        <div className="flex items-center gap-2">
          {/* Player Live Score HUD Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-arcade-cream font-mono font-black text-xs md:text-sm shadow-retro-sm">
            <Star size={15} className="text-arcade-mustard fill-arcade-mustard" />
            <span>{myScore} PTS</span>
          </div>

          {/* Host Skip Phase Countdown */}
          {isHost && phaseTimer > 0 && onSkipPhase && (
            <button
              type="button"
              onClick={onSkipPhase}
              className="retro-btn bg-arcade-mustard text-ink px-2.5 py-1.5 rounded-xl text-xs uppercase flex items-center gap-1 font-black shadow-retro-sm hover:bg-arcade-mustard/90"
              title="Skip countdown and advance to the next round immediately"
            >
              <FastForward size={14} />
              <span className="hidden sm:inline">Skip</span>
            </button>
          )}

          {/* Phase Countdown Timer */}
          {phaseTimer > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-ink bg-white font-mono font-black text-xs md:text-sm shadow-retro-sm">
              <Clock size={15} className={isUrgent ? 'text-arcade-terracotta animate-ping' : 'text-arcade-cobalt'} />
              <span className={isUrgent ? 'text-arcade-terracotta' : 'text-ink'}>
                {formatted}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Render Active Game View (Controller or TV Arena) */}
      {renderGameView()}

      {/* Persistent Back to Lobby Button on Game Over */}
      {isGameOver && (
        <div className="text-center pt-4">
          {isHost ? (
            <button
              onClick={onBackToLobby}
              className="retro-btn bg-arcade-terracotta text-white px-8 py-3 rounded-2xl text-lg uppercase shadow-retro-lg hover:bg-red-600"
            >
              Return Everyone to Lobby 🎮
            </button>
          ) : (
            <div className="font-mono text-sm font-bold text-ink-muted">
              Waiting for Host to return everyone to the lobby...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
