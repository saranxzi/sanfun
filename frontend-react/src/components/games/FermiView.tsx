import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Compass, Sparkles, CheckCircle2 } from 'lucide-react';

interface FermiViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function FermiView({ isHost, gameState, onSendAction }: FermiViewProps) {
  const [logVal, setLogVal] = useState(6); // 10^6 = 1 Million default
  const [locked, setLocked] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const prompt = gameState?.prompt;
  const unit = gameState?.unit || 'items';

  useEffect(() => {
    setLocked(false);
  }, [gameState?.round_number, phase]);

  const isLocked = locked || Boolean(gameState?.has_locked);

  const rawEstimatedValue = Math.pow(10, logVal);

  const formatNumberHuman = (val: number) => {
    if (val >= 1e21) return `${(val / 1e21).toFixed(1)} Sextillion`;
    if (val >= 1e18) return `${(val / 1e18).toFixed(1)} Quintillion`;
    if (val >= 1e15) return `${(val / 1e15).toFixed(1)} Quadrillion`;
    if (val >= 1e12) return `${(val / 1e12).toFixed(1)} Trillion`;
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)} Billion`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)} Million`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)} Thousand`;
    return Math.round(val).toLocaleString();
  };

  const handleLockIn = () => {
    setLocked(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_GUESS', { guess: rawEstimatedValue });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • FERMI ESTIMATOR
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'QUESTION' && 'Cosmic Order-of-Magnitude'}
          {phase === 'REVEAL' && 'True Scientific Reveal'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Cosmic Prompt Display */}
      {prompt && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-arcade-terracotta uppercase">
            <Compass size={16} />
            <span>Scale Riddle</span>
          </div>
          <h3 className="font-display font-black text-2xl md:text-3xl text-ink leading-tight">
            {prompt}
          </h3>
          <span className="inline-block px-3 py-1 rounded-lg border-2 border-ink bg-arcade-cream font-mono text-xs font-bold text-ink">
            Target Unit: {unit}
          </span>
        </div>
      )}

      {/* Controller: Kinetic Logarithmic Exponential Slider */}
      {!isHost && phase === 'QUESTION' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-6 text-center">
          {/* Slot-Machine Rolling Number Counter */}
          <div className="p-6 bg-paper-dark border-3 border-ink rounded-2xl shadow-retro">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase block mb-1">
              ESTIMATED VALUE (10^{logVal.toFixed(1)})
            </span>
            <motion.div
              key={logVal}
              initial={{ y: -8, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.08 }}
              className="font-mono font-black text-3xl md:text-4xl text-arcade-cobalt"
            >
              {formatNumberHuman(rawEstimatedValue)} {unit}
            </motion.div>
          </div>

          {/* Logarithmic Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs font-bold text-ink-muted">
              <span>10⁰ (Units)</span>
              <span>10⁹ (Billions)</span>
              <span>10²¹ (Sextillions)</span>
            </div>
            <input
              type="range"
              min="0"
              max="21"
              step="0.1"
              value={logVal}
              onChange={(e) => {
                setLogVal(Number(e.target.value));
                soundEngine.playTick();
              }}
              disabled={isLocked}
              className="w-full h-8 rounded-lg bg-paper-warm border-2 border-ink cursor-pointer"
            />
          </div>

          <button
            onClick={handleLockIn}
            disabled={isLocked}
            className={`retro-btn w-full rounded-xl text-lg uppercase ${
              isLocked
                ? 'bg-paper-dark text-ink-muted cursor-not-allowed opacity-80'
                : 'bg-arcade-cobalt text-white hover:bg-arcade-cobalt/90'
            }`}
          >
            {isLocked ? 'Estimate Locked In ✓' : 'Lock In Estimate'}
          </button>
        </div>
      )}

      {/* Reveal Phase */}
      {(phase === 'REVEAL' || phase === 'GAME_OVER') && gameState.actual !== undefined && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-5">
          <div className="text-center p-5 bg-arcade-cream border-3 border-ink rounded-2xl shadow-retro">
            <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase tracking-wider block mb-1">
              ACTUAL SCIENTIFIC VALUE
            </span>
            <div className="font-mono font-black text-3xl md:text-5xl text-ink">
              {formatNumberHuman(gameState.actual)} {unit}
            </div>
          </div>

          {gameState.fact && (
            <div className="p-4 rounded-xl border-2 border-ink bg-paper-light font-mono text-xs text-ink leading-relaxed">
              <span className="font-bold text-arcade-cobalt uppercase block mb-1">FACT FILE:</span>
              {gameState.fact}
            </div>
          )}

          {gameState.round_results && (
            <div className="space-y-2 pt-2">
              <span className="font-display font-bold text-base text-ink uppercase block">
                Player Estimates
              </span>
              {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => {
                const player = gameState.players?.find((p: any) => p.id === pid);
                return (
                  <div
                    key={pid}
                    className="p-3 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{player?.avatar || '🎮'}</span>
                      <div>
                        <div className="font-bold text-sm text-ink">{player?.nickname || pid}</div>
                        <div className="font-mono text-xs text-ink-muted">
                          Guessed: {formatNumberHuman(res.guess)} • {res.d_log} orders off
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-black text-lg text-emerald-700">
                      +{res.points} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
