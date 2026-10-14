import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Tag, Sparkles, Check, DollarSign, RotateCcw } from 'lucide-react';

interface GuessPriceViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function GuessPriceView({ isHost, gameState, onSendAction }: GuessPriceViewProps) {
  const [price, setPrice] = useState<number>(100000);
  const [locked, setLocked] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const itemName = gameState?.item_name || 'Artifact';
  const category = gameState?.category || 'Oddity';
  const description = gameState?.description || '';
  const imageIcon = gameState?.image_icon || '🏷️';
  const actualPrice = gameState?.actual_price;
  const funFact = gameState?.fun_fact;

  useEffect(() => {
    setPrice(100000);
    setLocked(false);
  }, [gameState?.round_number, phase]);

  const isLocked = locked || Boolean(gameState?.has_locked);

  const addAmount = (delta: number) => {
    if (isLocked) return;
    setPrice((prev) => Math.max(1, prev + delta));
    soundEngine.playTick();
  };

  const multiplyAmount = (factor: number) => {
    if (isLocked) return;
    setPrice((prev) => Math.max(1, Math.round(prev * factor)));
    soundEngine.playTone(450, 0.05, 'square', 0.12);
  };

  const resetPrice = () => {
    if (isLocked) return;
    setPrice(10000);
    soundEngine.playTone(300, 0.05, 'triangle', 0.12);
  };

  const handleLockIn = () => {
    setLocked(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_GUESS', { guess: price });
  };

  const formatMoney = (val?: number | null) => {
    if (val === undefined || val === null) return '???';
    return '$' + Math.round(val).toLocaleString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • GUESS THE PRICE
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'GUESS' && 'Appraise This Artifact'}
          {phase === 'REVEAL' && 'True Price Revealed!'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Item Card */}
      <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
        <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
          <span className="inline-block px-3 py-1 rounded-lg border-2 border-ink bg-arcade-cream font-mono text-xs font-bold text-ink uppercase">
            {category}
          </span>
          <span className="font-mono text-xs font-bold text-ink-muted">
            {phase === 'GUESS' ? 'APPRAISALS OPEN' : 'LOT HAMMERED'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 py-2">
          <div className="w-28 h-28 rounded-2xl border-3 border-ink bg-paper-light flex items-center justify-center text-6xl shadow-retro shrink-0">
            {imageIcon}
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-display font-black text-2xl md:text-3xl text-ink leading-tight">
              {itemName}
            </h3>
            <p className="font-mono text-xs md:text-sm text-ink-muted leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Player Controller: Direct Input & Quick Increments */}
      {!isHost && phase === 'GUESS' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-6 text-center">
          {/* Price Value Box */}
          <div className="p-5 bg-paper-dark border-3 border-ink rounded-2xl shadow-retro">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase block mb-1">
              YOUR APPRAISAL (USD)
            </span>
            <div className="font-mono font-black text-3xl md:text-5xl text-arcade-cobalt">
              {formatMoney(price)}
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase block">
              Quick Adjustments
            </span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => addAmount(1000)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                +$1k
              </button>
              <button
                type="button"
                onClick={() => addAmount(10000)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                +$10k
              </button>
              <button
                type="button"
                onClick={() => addAmount(100000)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                +$100k
              </button>
              <button
                type="button"
                onClick={() => addAmount(1000000)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                +$1M
              </button>
              <button
                type="button"
                onClick={() => addAmount(10000000)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                +$10M
              </button>
              <button
                type="button"
                onClick={() => multiplyAmount(10)}
                disabled={isLocked}
                className="retro-btn bg-arcade-mustard text-ink text-xs font-black py-2 rounded-lg"
              >
                ×10
              </button>
              <button
                type="button"
                onClick={() => multiplyAmount(0.5)}
                disabled={isLocked}
                className="retro-btn bg-paper-light text-ink text-xs font-bold py-2 rounded-lg"
              >
                ½ Halve
              </button>
              <button
                type="button"
                onClick={resetPrice}
                disabled={isLocked}
                className="retro-btn bg-paper text-ink text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Tactile Lock In Button */}
          <button
            onClick={handleLockIn}
            disabled={isLocked}
            className={`retro-btn w-full py-4 rounded-xl text-lg uppercase flex items-center justify-center gap-2 ${
              isLocked
                ? 'bg-paper-dark text-ink-muted cursor-not-allowed opacity-80'
                : 'bg-arcade-mustard text-ink hover:bg-arcade-mustard/90'
            }`}
          >
            {isLocked ? (
              <>
                <Check size={20} />
                <span>Estimate Locked In ✓</span>
              </>
            ) : (
              <>
                <Tag size={20} />
                <span>Lock In Estimate</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Reveal Phase */}
      {(phase === 'REVEAL' || phase === 'GAME_OVER') && actualPrice !== undefined && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-5">
          {/* Actual Price Banner */}
          <div className="text-center p-6 bg-arcade-cream border-3 border-ink rounded-2xl shadow-retro">
            <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase tracking-wider block mb-1">
              ACTUAL RECORD SALE PRICE
            </span>
            <div className="font-mono font-black text-4xl md:text-6xl text-ink">
              {formatMoney(actualPrice)}
            </div>
          </div>

          {/* Historical Fun Fact */}
          {funFact && (
            <div className="p-4 rounded-xl border-2 border-ink bg-paper-light font-mono text-xs text-ink leading-relaxed">
              <span className="font-bold text-arcade-cobalt uppercase block mb-1">HISTORICAL DOSSIER:</span>
              {funFact}
            </div>
          )}

          {/* Standings */}
          {gameState.round_results && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-arcade-terracotta uppercase">
                <Sparkles size={16} />
                <span>Appraiser Accuracy Standings</span>
              </div>

              <div className="space-y-2">
                {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => (
                  <div
                    key={pid}
                    className="p-4 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{res.avatar || '🏷️'}</span>
                      <div>
                        <span className="font-bold text-sm text-ink block">{res.nickname}</span>
                        <span className="font-mono text-xs text-ink-muted">
                          Guessed: {formatMoney(res.guess)} • {res.verdict}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-black text-lg text-arcade-cobalt">
                      +{res.points_earned || 0} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
