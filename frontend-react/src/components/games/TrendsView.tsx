import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { TrendingUp, TrendingDown, Flame, CheckCircle, XCircle } from 'lucide-react';

interface TrendsViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function TrendsView({ isHost, gameState, onSendAction }: TrendsViewProps) {
  const [selectedGuess, setSelectedGuess] = useState<'HIGHER' | 'LOWER' | null>(null);

  const phase = gameState?.phase || 'INIT';
  const itemA = gameState?.item_a;
  const itemB = gameState?.item_b;
  const isReveal = phase === 'REVEAL' || phase === 'GAME_OVER';

  const handleGuess = (choice: 'HIGHER' | 'LOWER') => {
    setSelectedGuess(choice);
    soundEngine.playDing();
    onSendAction('SUBMIT_GUESS', { guess: choice });
  };

  const formatVolume = (val?: number | null) => {
    if (!val) return '???';
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M searches/mo`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K searches/mo`;
    return `${val} searches/mo`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 4} • HIGHER OR LOWER
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'GUESS' && 'Search Volume Showdown'}
          {phase === 'REVEAL' && 'Volume Revealed!'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Matchup Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        {/* Item A */}
        {itemA && (
          <div className="retro-box-lg rounded-2xl p-6 bg-white text-center space-y-3">
            <span className="text-5xl">{itemA.icon}</span>
            <h3 className="font-display font-black text-2xl text-ink">{itemA.name}</h3>
            <div className="p-3 bg-paper-light border-2 border-ink rounded-xl font-mono font-bold text-lg text-arcade-cobalt shadow-retro-sm">
              {formatVolume(itemA.volume)}
            </div>
            <span className="font-mono text-[11px] text-ink-muted uppercase">Benchmark Volume</span>
          </div>
        )}

        {/* Item B */}
        {itemB && (
          <div className="retro-box-lg rounded-2xl p-6 bg-arcade-cream border-arcade-terracotta text-center space-y-3">
            <span className="text-5xl">{itemB.icon}</span>
            <h3 className="font-display font-black text-2xl text-ink">{itemB.name}</h3>

            {/* Rolling Counter / Concealed Reveal */}
            <div className="p-3 bg-white border-2 border-ink rounded-xl font-mono font-black text-lg text-arcade-terracotta shadow-retro-sm min-h-[52px] flex items-center justify-center">
              {isReveal ? (
                <motion.div
                  initial={{ scale: 0.8, y: -6 }}
                  animate={{ scale: 1, y: 0 }}
                  className="text-xl"
                >
                  {formatVolume(itemB.volume)}
                </motion.div>
              ) : (
                <div className="animate-pulse tracking-widest text-ink-muted">
                  [ ??? SEARCHES ]
                </div>
              )}
            </div>
            <span className="font-mono text-[11px] text-ink-muted uppercase">
              Is Item B Higher or Lower than Item A?
            </span>
          </div>
        )}
      </div>

      {/* Player Controller Action Buttons */}
      {!isHost && phase === 'GUESS' && (
        <div className="space-y-4">
          {/* Streak Indicator */}
          {gameState.my_streak !== undefined && gameState.my_streak > 0 && (
            <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold text-arcade-terracotta">
              <Flame size={16} />
              <span>CURRENT STREAK: {gameState.my_streak}x MULTIPLIER!</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleGuess('HIGHER')}
              disabled={selectedGuess !== null}
              className={`retro-btn w-full rounded-2xl text-xl uppercase flex items-center justify-center gap-2 ${
                selectedGuess === 'HIGHER'
                  ? 'bg-emerald-600 text-white shadow-retro-sm'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              <TrendingUp size={24} />
              <span>HIGHER ▲</span>
            </button>

            <button
              onClick={() => handleGuess('LOWER')}
              disabled={selectedGuess !== null}
              className={`retro-btn w-full rounded-2xl text-xl uppercase flex items-center justify-center gap-2 ${
                selectedGuess === 'LOWER'
                  ? 'bg-red-700 text-white shadow-retro-sm'
                  : 'bg-arcade-terracotta hover:bg-red-600 text-white'
              }`}
            >
              <TrendingDown size={24} />
              <span>LOWER ▼</span>
            </button>
          </div>
        </div>
      )}

      {/* Reveal Results */}
      {isReveal && gameState.round_results && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <h3 className="font-display font-black text-xl text-ink uppercase border-b-2 border-ink/10 pb-2">
            Matchup Verdict: {gameState.relation}
          </h3>

          <div className="space-y-2">
            {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => {
              const player = gameState.players?.find((p: any) => p.id === pid);
              return (
                <div
                  key={pid}
                  className="p-3.5 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{player?.avatar || '🎮'}</span>
                    <div>
                      <div className="font-bold text-sm text-ink">{player?.nickname || pid}</div>
                      <div className="font-mono text-xs text-ink-muted">
                        Chose: {res.guess} • Streak: {res.streak || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.is_correct ? (
                      <span className="flex items-center gap-1 font-mono font-bold text-emerald-700 text-sm">
                        <CheckCircle size={16} />
                        +{res.points} pts
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono font-bold text-arcade-terracotta text-sm">
                        <XCircle size={16} />
                        +0 pts
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
