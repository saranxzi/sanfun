import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Zap, Sparkles, Check, TrendingUp } from 'lucide-react';

interface WouldYouRatherViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function WouldYouRatherView({ isHost, gameState, onSendAction }: WouldYouRatherViewProps) {
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [betMajority, setBetMajority] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const optionA = gameState?.option_a || 'Option A';
  const iconA = gameState?.icon_a || '🅰️';
  const optionB = gameState?.option_b || 'Option B';
  const iconB = gameState?.icon_b || '🅱️';
  const topic = gameState?.topic || 'Absurd Dilemma';
  const isReveal = phase === 'REVEAL' || phase === 'GAME_OVER';

  useEffect(() => {
    setSelectedChoice(null);
    setBetMajority(false);
  }, [gameState?.round_number, phase]);

  const handleChoose = (choice: 'A' | 'B') => {
    setSelectedChoice(choice);
    soundEngine.playDing();
    onSendAction('SUBMIT_CHOICE', { choice, bet_majority: betMajority });
  };

  const isLocked = Boolean(gameState?.has_locked) || selectedChoice !== null;
  const pctA = gameState?.pct_a !== undefined && gameState.pct_a !== null ? gameState.pct_a : 50;
  const pctB = gameState?.pct_b !== undefined && gameState.pct_b !== null ? gameState.pct_b : 50;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • WOULD YOU RATHER?
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'CHOICE' && 'Pick Your Poison'}
          {phase === 'REVEAL' && 'The Room Has Spoken!'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Dilemma Topic Pill */}
      <div className="text-center">
        <span className="inline-block px-4 py-1.5 rounded-full border-2 border-ink bg-arcade-cream font-mono text-xs font-bold text-ink uppercase shadow-retro-sm">
          CATEGORY: {topic}
        </span>
      </div>

      {/* Split Dilemma Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Option A (Terracotta) */}
        <div
          className={`retro-box-lg rounded-3xl p-6 bg-white flex flex-col justify-between border-4 border-ink transition-transform ${
            selectedChoice === 'A' ? 'ring-4 ring-arcade-terracotta translate-y-[-2px]' : ''
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg border-2 border-ink bg-arcade-terracotta text-white font-mono text-xs font-black uppercase">
                OPTION A
              </span>
              <span className="text-4xl">{iconA}</span>
            </div>
            <h3 className="font-display font-black text-2xl md:text-3xl text-ink leading-tight">
              {optionA}
            </h3>
          </div>

          {!isHost && phase === 'CHOICE' && (
            <button
              type="button"
              onClick={() => handleChoose('A')}
              disabled={isLocked}
              className={`retro-btn w-full mt-6 py-4 rounded-xl text-base uppercase font-black flex items-center justify-center gap-2 ${
                selectedChoice === 'A'
                  ? 'bg-arcade-terracotta text-white'
                  : 'bg-paper-light text-ink hover:bg-paper-warm'
              }`}
            >
              {selectedChoice === 'A' ? (
                <>
                  <Check size={18} />
                  <span>Selected Option A ✓</span>
                </>
              ) : (
                <span>Choose Option A</span>
              )}
            </button>
          )}
        </div>

        {/* Option B (Cobalt) */}
        <div
          className={`retro-box-lg rounded-3xl p-6 bg-white flex flex-col justify-between border-4 border-ink transition-transform ${
            selectedChoice === 'B' ? 'ring-4 ring-arcade-cobalt translate-y-[-2px]' : ''
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg border-2 border-ink bg-arcade-cobalt text-white font-mono text-xs font-black uppercase">
                OPTION B
              </span>
              <span className="text-4xl">{iconB}</span>
            </div>
            <h3 className="font-display font-black text-2xl md:text-3xl text-ink leading-tight">
              {optionB}
            </h3>
          </div>

          {!isHost && phase === 'CHOICE' && (
            <button
              type="button"
              onClick={() => handleChoose('B')}
              disabled={isLocked}
              className={`retro-btn w-full mt-6 py-4 rounded-xl text-base uppercase font-black flex items-center justify-center gap-2 ${
                selectedChoice === 'B'
                  ? 'bg-arcade-cobalt text-white'
                  : 'bg-paper-light text-ink hover:bg-paper-warm'
              }`}
            >
              {selectedChoice === 'B' ? (
                <>
                  <Check size={18} />
                  <span>Selected Option B ✓</span>
                </>
              ) : (
                <span>Choose Option B</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Majority Bet Toggle on Controller */}
      {!isHost && phase === 'CHOICE' && (
        <div className="retro-box-lg rounded-2xl p-4 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-arcade-mustard" />
            <div>
              <span className="font-mono text-xs font-black uppercase block text-ink">
                Majority Consensus Bet (+500 / -500 pts)
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                Bet that your choice is what the majority picks! +500 if right, -500 if wrong.
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={betMajority}
            onChange={(e) => setBetMajority(e.target.checked)}
            disabled={isLocked}
            className="w-6 h-6 border-2 border-ink rounded cursor-pointer accent-arcade-mustard"
          />
        </div>
      )}

      {/* Reveal Phase: Animated Room Consensus Bar */}
      {isReveal && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs font-black uppercase">
              <span className="text-arcade-terracotta">OPTION A: {pctA}%</span>
              <span className="text-arcade-cobalt">OPTION B: {pctB}%</span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-8 rounded-xl border-3 border-ink overflow-hidden flex bg-paper-dark shadow-retro-sm">
              <motion.div
                initial={{ width: '50%' }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-arcade-terracotta"
              />
              <motion.div
                initial={{ width: '50%' }}
                animate={{ width: `${pctB}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-arcade-cobalt"
              />
            </div>
          </div>

          {/* Player's Personal Verdict Callout */}
          {gameState.my_result && (
            <div className={`p-4 rounded-xl border-3 border-ink text-center shadow-retro-sm ${
              (gameState.my_result.points_earned || 0) > 0
                ? 'bg-emerald-50 border-emerald-600'
                : (gameState.my_result.points_earned || 0) < 0
                ? 'bg-red-50 border-red-600'
                : 'bg-paper-light'
            }`}>
              <div className="font-display font-black text-xl text-ink">
                {gameState.my_result.verdict}
              </div>
              <div className={`font-mono font-black text-sm mt-1 ${
                (gameState.my_result.points_earned || 0) < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                Round Result: {(gameState.my_result.points_earned || 0) > 0 ? `+${gameState.my_result.points_earned}` : (gameState.my_result.points_earned || 0)} pts
              </div>
            </div>
          )}

          {/* Standings & Player Decisions */}
          {gameState.round_results && Object.keys(gameState.round_results).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-arcade-terracotta uppercase">
                <Sparkles size={16} />
                <span>Room Votes & Bets</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => (
                  <div
                    key={pid}
                    className="p-4 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{res.avatar || '⚡'}</span>
                      <div>
                        <span className="font-bold text-sm text-ink block">{res.nickname}</span>
                        <span className="font-mono text-xs text-ink-muted">
                          Picked {res.choice === 'A' ? 'Option A' : 'Option B'} • {res.verdict}
                        </span>
                      </div>
                    </div>
                    <div className={`font-mono font-black text-lg ${
                      (res.points_earned || 0) < 0 ? 'text-red-600' : 'text-arcade-cobalt'
                    }`}>
                      {(res.points_earned || 0) > 0 ? `+${res.points_earned}` : (res.points_earned || 0)} pts
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
