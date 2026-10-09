import React, { useState } from 'react';
import { RoleCard3D } from './RoleCard3D';
import { soundEngine } from '../../audio/sound';
import { Eye, HelpCircle, CheckCircle, Award } from 'lucide-react';

interface ImposterViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function ImposterView({ isHost, gameState, onSendAction }: ImposterViewProps) {
  const [guessInput, setGuessInput] = useState('');
  const phase = gameState?.phase || 'INIT';
  const isImposter = Boolean(gameState?.is_imposter);

  const handleCastVote = (targetId: string) => {
    soundEngine.playDing();
    onSendAction('CAST_VOTE', { target_id: targetId });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    soundEngine.playDing();
    onSendAction('GUESS_WORD', { guess: guessInput.trim() });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Category Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          CATEGORY: {gameState.category || 'MYSTERY'}
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'WORD_REVEAL' && 'Secret Word Dispatched'}
          {phase === 'CLUE_ROUNDS' && 'One-Word Clue Rounds'}
          {phase === 'VOTING' && 'Vote Out The Suspected Imposter'}
          {phase === 'IMPOSTER_GUESS' && 'Caught! Clutch Guess For The Word'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* 3D Secret Role Card */}
      {!isHost && (
        <RoleCard3D
          cardTitle="Secret Word Dossier"
          secretTitle={isImposter ? 'YOU ARE THE IMPOSTER' : (gameState.secret_word || '???')}
          secretSubtitle={isImposter ? 'Blend in. Give a vague clue. Avoid detection!' : `Category: ${gameState.category}`}
          secretIcon={isImposter ? '🦎' : '🎯'}
          accentColor={isImposter ? '#E25241' : '#2A9D8F'}
          isSpecial={isImposter}
          secretDetails={isImposter && gameState.imposter_hint ? `Chameleon Hint: ${gameState.imposter_hint}` : null}
        />
      )}

      {/* Speaking Clue Order (Big Screen TV & Mobile) */}
      {gameState.clue_order && gameState.clue_order.length > 0 && (
        <div className="retro-box-lg rounded-2xl p-5 bg-white space-y-3">
          <h3 className="font-display font-bold text-lg text-ink uppercase border-b-2 border-ink/10 pb-2">
            Clue Order (Say One Single Word Out Loud)
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {gameState.clue_order.map((name: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-ink bg-paper-light font-bold text-sm shadow-retro-sm"
              >
                <span className="w-5 h-5 rounded-full bg-arcade-cobalt text-white flex items-center justify-center text-xs font-mono">
                  {idx + 1}
                </span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voting Ballot */}
      {!isHost && phase === 'VOTING' && gameState.candidates && (
        <div className="retro-box-lg rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <h3 className="font-display font-bold text-lg text-ink uppercase">Suspect Ballot</h3>
            <span className="font-mono text-xs text-ink-muted">Tap suspect to cast vote</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {gameState.candidates.map((c: any) => {
              const isVoted = gameState.my_vote === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCastVote(c.id)}
                  className={`p-3 rounded-xl border-2.5 border-ink text-left flex items-center gap-2.5 transition-all ${
                    isVoted ? 'bg-arcade-terracotta text-white shadow-retro-sm' : 'bg-paper-light hover:bg-paper-warm'
                  }`}
                >
                  <span className="text-xl">{c.avatar || '👤'}</span>
                  <span className="font-bold text-xs truncate">{c.nickname}</span>
                  {isVoted && <CheckCircle size={16} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Imposter Clutch Guess Input (When Imposter is Caught) */}
      {!isHost && phase === 'IMPOSTER_GUESS' && isImposter && (
        <div className="retro-box-lg rounded-2xl p-6 bg-red-50 border-arcade-terracotta space-y-4">
          <div className="text-center">
            <h3 className="font-display font-black text-2xl text-arcade-terracotta uppercase">
              YOU WERE CAUGHT!
            </h3>
            <p className="font-medium text-xs text-ink-muted mt-1">
              You have 18 seconds to clutch-guess the exact secret word to steal victory!
            </p>
          </div>

          <form onSubmit={handleGuessSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Type your guess here..."
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              className="w-full h-14 px-4 border-3 border-ink rounded-xl font-bold text-lg text-ink bg-white focus:outline-none focus:ring-2 focus:ring-arcade-terracotta"
              autoFocus
            />
            <button
              type="submit"
              className="retro-btn w-full bg-arcade-terracotta text-white rounded-xl text-lg uppercase"
            >
              Submit Clutch Guess
            </button>
          </form>

          {/* Candidate Words Quick Picker */}
          {gameState.candidate_words && (
            <div className="pt-2">
              <span className="font-mono text-[11px] font-bold text-ink-muted uppercase block mb-1">
                Candidate Words in Category:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {gameState.candidate_words.map((w: string) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setGuessInput(w)}
                    className="px-2 py-1 rounded bg-white border border-ink text-xs font-bold hover:bg-paper-warm"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over Report */}
      {phase === 'GAME_OVER' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white text-center space-y-3">
          <Award className="mx-auto text-arcade-mustard" size={48} />
          <h3 className="font-display font-black text-3xl text-ink uppercase">
            {gameState.winner} TEAM VICTORIOUS!
          </h3>
          <p className="font-mono text-sm text-ink-muted">
            The secret word was:{' '}
            <span className="font-bold text-arcade-terracotta underline">
              {gameState.secret_word}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
