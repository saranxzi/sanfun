import React, { useEffect } from 'react';
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
import { ArrowLeft, Clock, FastForward } from 'lucide-react';

interface GameContainerProps {
  isHost: boolean;
  gameState: any;
  phaseTimer: number;
  onBackToLobby: () => void;
  onSendAction: (action: string, data?: any) => void;
  onSkipPhase?: () => void;
}

export function GameContainer({
  isHost,
  gameState,
  phaseTimer,
  onBackToLobby,
  onSendAction,
  onSkipPhase,
}: GameContainerProps) {
  const gameId = gameState?.game_id || 'mafia';
  const isGameOver = gameState?.phase === 'GAME_OVER' || gameState?.is_over;
  const { formatted, isUrgent, progressPct } = useSmoothTimer(phaseTimer);

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
        return <MafiaView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'imposter':
        return <ImposterView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'dialed':
        return <DialedView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'fermi':
        return <FermiView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'guess_price':
      case 'auction':
        return <GuessPriceView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'circle':
        return <CircleView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'rather':
      case 'trolley':
        return <WouldYouRatherView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      case 'trends':
        return <TrendsView isHost={isHost} gameState={gameState} onSendAction={onSendAction} />;
      default:
        return <div className="text-center font-mono">Unknown game engine: {gameId}</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Game Controls & Timer Bar */}
      <div className="retro-box-lg rounded-2xl p-4 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Host Back to Lobby Control */}
          {isHost && (
            <button
              onClick={onBackToLobby}
              className="retro-btn bg-paper text-ink px-3.5 py-1.5 rounded-xl text-xs uppercase flex items-center gap-1.5 hover:bg-paper-warm"
            >
              <ArrowLeft size={16} />
              <span>Back To Lobby</span>
            </button>
          )}

          <div className="font-display font-black text-lg md:text-xl text-ink uppercase flex items-center gap-2">
            <span>{gameState?.name || gameId.toUpperCase()}</span>
          </div>
        </div>

        {/* Phase Countdown Timer & Host Skip Control */}
        <div className="flex items-center gap-2">
          {isHost && phaseTimer > 0 && onSkipPhase && (
            <button
              type="button"
              onClick={onSkipPhase}
              className="retro-btn bg-arcade-mustard text-ink px-3 py-1.5 rounded-xl text-xs uppercase flex items-center gap-1 font-black shadow-retro-sm hover:bg-arcade-mustard/90"
              title="Skip countdown and advance to the next round immediately"
            >
              <FastForward size={14} />
              <span>Skip Timer ⏭️</span>
            </button>
          )}

          {phaseTimer > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-ink bg-arcade-cream font-mono font-black text-sm md:text-base shadow-retro-sm">
              <Clock size={16} className={isUrgent ? 'text-arcade-terracotta animate-ping' : 'text-arcade-cobalt'} />
              <span className={isUrgent ? 'text-arcade-terracotta' : 'text-ink'}>
                {formatted}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Render Active Game View */}
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
