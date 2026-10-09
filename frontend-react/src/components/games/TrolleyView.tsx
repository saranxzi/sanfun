import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { GitFork, Users, Zap, CheckCircle2, Award } from 'lucide-react';

interface TrolleyViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function TrolleyView({ isHost, gameState, onSendAction }: TrolleyViewProps) {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [betMajority, setBetMajority] = useState<boolean>(true);
  const [locked, setLocked] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const title = gameState?.dilemma_title;
  const optionA = gameState?.option_a;
  const optionB = gameState?.option_b;
  const iconA = gameState?.icon_a || '🛤️';
  const iconB = gameState?.icon_b || '🚋';
  const tally = gameState?.tally || {};
  const majority = gameState?.majority_choice;

  const submitChoice = () => {
    if (!selectedOption) return;
    setLocked(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_CHOICE', { choice: selectedOption, bet_majority: betMajority });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • ABSURD DILEMMAS
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'CHOICE' && 'Choose Your Moral Track'}
          {phase === 'REVEAL' && 'Consensus Showdown'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Dilemma Title */}
      {title && (
        <div className="text-center">
          <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase tracking-wider block mb-1">
            PARADOX OF CHOICE
          </span>
          <h3 className="font-display font-black text-2xl md:text-3xl text-ink">
            {title}
          </h3>
        </div>
      )}

      {/* Kinetic Animated Railroad Track Switch Diagram */}
      <div className="retro-box-lg rounded-2xl p-6 bg-white overflow-hidden relative">
        <div className="w-full max-w-md mx-auto h-28 relative flex items-center justify-between px-6">
          {/* Main Track Incoming */}
          <div className="w-16 h-4 bg-ink rounded-l-md border-y border-white" />

          {/* Diverter Switch Box */}
          <motion.div
            animate={{ rotate: selectedOption === 'A' ? -25 : selectedOption === 'B' ? 25 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-12 h-6 bg-arcade-mustard border-2 border-ink rounded-lg shadow-retro-sm flex items-center justify-center font-mono text-[10px] font-bold"
          >
            SWITCH
          </motion.div>

          {/* Fork A and Fork B */}
          <div className="flex flex-col gap-6 w-32">
            <div className={`p-2 rounded-lg border-2 border-ink text-xs font-bold text-center transition-colors ${
              selectedOption === 'A' || majority === 'A' ? 'bg-arcade-terracotta text-white' : 'bg-paper-light'
            }`}>
              Track A {iconA}
            </div>
            <div className={`p-2 rounded-lg border-2 border-ink text-xs font-bold text-center transition-colors ${
              selectedOption === 'B' || majority === 'B' ? 'bg-arcade-cobalt text-white' : 'bg-paper-light'
            }`}>
              Track B {iconB}
            </div>
          </div>
        </div>
      </div>

      {/* Choice Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Track A */}
        <div
          onClick={() => !locked && !isHost && setSelectedOption('A')}
          className={`retro-box-lg rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between ${
            selectedOption === 'A'
              ? 'bg-red-50 border-arcade-terracotta ring-3 ring-arcade-terracotta shadow-retro-lg'
              : 'bg-white hover:bg-paper-warm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase">TRACK A</span>
              <span className="text-3xl">{iconA}</span>
            </div>
            <p className="font-display font-bold text-lg md:text-xl text-ink leading-snug">
              {optionA}
            </p>
          </div>

          {(phase === 'REVEAL' || phase === 'GAME_OVER') && (
            <div className="mt-4 pt-3 border-t-2 border-ink/10 flex justify-between items-center font-mono text-sm font-bold">
              <span>Votes:</span>
              <span className="text-xl text-arcade-terracotta">{tally.A || 0}</span>
            </div>
          )}
        </div>

        {/* Track B */}
        <div
          onClick={() => !locked && !isHost && setSelectedOption('B')}
          className={`retro-box-lg rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between ${
            selectedOption === 'B'
              ? 'bg-blue-50 border-arcade-cobalt ring-3 ring-arcade-cobalt shadow-retro-lg'
              : 'bg-white hover:bg-paper-warm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-arcade-cobalt uppercase">TRACK B</span>
              <span className="text-3xl">{iconB}</span>
            </div>
            <p className="font-display font-bold text-lg md:text-xl text-ink leading-snug">
              {optionB}
            </p>
          </div>

          {(phase === 'REVEAL' || phase === 'GAME_OVER') && (
            <div className="mt-4 pt-3 border-t-2 border-ink/10 flex justify-between items-center font-mono text-sm font-bold">
              <span>Votes:</span>
              <span className="text-xl text-arcade-cobalt">{tally.B || 0}</span>
            </div>
          )}
        </div>
      </div>

      {/* Consensus Prediction & Submit (Player View) */}
      {!isHost && phase === 'CHOICE' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <span className="font-mono text-xs font-bold text-ink-muted uppercase block text-center">
            CONSENSUS BETTING (PREDICT THE ROOM)
          </span>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setBetMajority(true)}
              disabled={locked}
              className={`p-3 rounded-xl border-2 border-ink font-bold text-xs uppercase flex items-center justify-center gap-1.5 ${
                betMajority ? 'bg-arcade-mustard text-ink shadow-retro-sm' : 'bg-paper-light'
              }`}
            >
              <Users size={16} />
              <span>Bet With Room</span>
            </button>
            <button
              type="button"
              onClick={() => setBetMajority(false)}
              disabled={locked}
              className={`p-3 rounded-xl border-2 border-ink font-bold text-xs uppercase flex items-center justify-center gap-1.5 ${
                !betMajority ? 'bg-arcade-mustard text-ink shadow-retro-sm' : 'bg-paper-light'
              }`}
            >
              <Zap size={16} />
              <span>Bet On Chaos</span>
            </button>
          </div>

          <button
            onClick={submitChoice}
            disabled={locked || !selectedOption}
            className="retro-btn w-full bg-arcade-terracotta text-white rounded-xl text-lg uppercase"
          >
            {locked ? 'Choice Submitted ✓' : 'Lock In Track Choice'}
          </button>
        </div>
      )}

      {/* Reveal Phase */}
      {(phase === 'REVEAL' || phase === 'GAME_OVER') && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <div className="text-center p-4 bg-arcade-cream border-2 border-ink rounded-xl">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase">ROOM OUTCOME</span>
            <div className="font-display font-black text-2xl md:text-3xl text-ink uppercase mt-1">
              {majority === 'TIE' ? '⚖️ Chaos Deadlock (50/50 Tie)' : `🏆 Track ${majority} Majority Consensus`}
            </div>
          </div>

          {gameState.round_results && (
            <div className="space-y-2">
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
                          Chose Track {res.choice} • {res.predicted_correctly ? 'Predicted Room Correctly ✓' : 'Prediction Missed'}
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
