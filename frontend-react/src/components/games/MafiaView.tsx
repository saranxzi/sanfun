import React, { useState } from 'react';
import { RoleCard3D } from './RoleCard3D';
import { soundEngine } from '../../audio/sound';
import { Moon, Sun, Skull, Shield, Search, CheckCircle } from 'lucide-react';

interface MafiaViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function MafiaView({ isHost, gameState, onSendAction }: MafiaViewProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const phase = gameState?.phase || 'INIT';
  const myRole = gameState?.my_role || 'VILLAGER';
  const isAlive = gameState?.is_alive !== false;

  const roleDetails: Record<string, { icon: string; color: string; desc: string }> = {
    MAFIA: { icon: '🕵️', color: '#E25241', desc: 'Eliminate all villagers without getting caught.' },
    DOCTOR: { icon: '💉', color: '#2A9D8F', desc: 'Protect one innocent person from the Mafia each night.' },
    DETECTIVE: { icon: '🔍', color: '#2B6CB0', desc: 'Investigate one suspect each night to expose their alignment.' },
    VILLAGER: { icon: '🧑‍🌾', color: '#F5A623', desc: 'Find the Mafia and execute them during the town vote.' },
  };

  const currentRole = roleDetails[myRole] || roleDetails.VILLAGER;

  const handleCastNightAction = () => {
    if (!selectedTarget) return;
    soundEngine.playDing();
    if (myRole === 'MAFIA') {
      onSendAction('MAFIA_KILL', { target_id: selectedTarget });
    } else if (myRole === 'DOCTOR') {
      onSendAction('DOCTOR_HEAL', { target_id: selectedTarget });
    } else if (myRole === 'DETECTIVE') {
      onSendAction('DETECTIVE_INVESTIGATE', { target_id: selectedTarget });
    }
  };

  const handleCastDayVote = (targetId: string) => {
    soundEngine.playDing();
    onSendAction('CAST_VOTE', { target_id: targetId });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Phase Banner */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
          {phase.startsWith('NIGHT') ? <Moon size={16} className="text-arcade-cobalt" /> : <Sun size={16} className="text-arcade-mustard" />}
          <span>CURRENT PHASE: {phase.replace('_', ' ')}</span>
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'ROLE_REVEAL' && 'Secret Roles Assigned'}
          {phase === 'NIGHT_ACTIONS' && 'Night Has Fallen'}
          {phase === 'DAY_DAWN' && 'Dawn In The Village'}
          {phase === 'DAY_DISCUSS' && 'Town Discussion'}
          {phase === 'DAY_VOTE' && 'Cast Your Execution Vote'}
          {phase === 'DAY_EXECUTION' && 'Town Execution Judgment'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* 3D Secret Role Card (Mobile & Player Screen) */}
      {!isHost && (
        <RoleCard3D
          cardTitle="Secret Identity"
          secretTitle={myRole}
          secretSubtitle={currentRole.desc}
          secretIcon={currentRole.icon}
          accentColor={currentRole.color}
          isSpecial={myRole === 'MAFIA'}
          secretDetails={
            gameState.mafia_teammates && gameState.mafia_teammates.length > 0
              ? `Fellow Syndicate: ${gameState.mafia_teammates.join(', ')}`
              : null
          }
        />
      )}

      {/* Detective Investigation Notice */}
      {!isHost && gameState.detective_result && (
        <div className="retro-box rounded-xl p-4 bg-arcade-cream border-arcade-cobalt">
          <div className="flex items-center gap-2 font-bold text-sm text-arcade-cobalt mb-1">
            <Search size={16} />
            <span>Detective Dossier</span>
          </div>
          <p className="font-mono text-xs text-ink">
            Suspect <span className="font-bold">{gameState.detective_result.target_name}</span> is aligned with:{' '}
            <span className="font-black text-sm text-arcade-terracotta">
              {gameState.detective_result.alignment}
            </span>
          </p>
        </div>
      )}

      {/* Night Action Control Panel (For active alive players) */}
      {!isHost && phase === 'NIGHT_ACTIONS' && isAlive && gameState.candidates && (
        <div className="retro-box-lg rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <h3 className="font-display font-bold text-lg text-ink uppercase flex items-center gap-2">
              <span>{gameState.night_action?.replace('_', ' ')}</span>
            </h3>
            <span className="font-mono text-xs font-bold text-ink-muted">Choose your target</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {gameState.candidates.map((c: any) => {
              const isSelected = selectedTarget === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedTarget(c.id)}
                  className={`p-3 rounded-xl border-2.5 border-ink text-left flex items-center gap-2.5 transition-all ${
                    isSelected ? 'bg-arcade-terracotta text-white shadow-retro-sm' : 'bg-paper-light hover:bg-paper-warm'
                  }`}
                >
                  <span className="text-xl">{c.avatar || '👤'}</span>
                  <span className="font-bold text-xs truncate">{c.nickname}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleCastNightAction}
            disabled={!selectedTarget}
            className="retro-btn w-full bg-arcade-cobalt text-white rounded-xl text-base uppercase"
          >
            Confirm Action
          </button>
        </div>
      )}

      {/* Day Vote Control Panel */}
      {!isHost && phase === 'DAY_VOTE' && isAlive && gameState.candidates && (
        <div className="retro-box-lg rounded-2xl p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <h3 className="font-display font-bold text-lg text-ink uppercase">Town Execution Ballot</h3>
            <span className="font-mono text-xs text-ink-muted">Vote who to eliminate</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {gameState.candidates.map((c: any) => {
              const isVoted = gameState.my_vote === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCastDayVote(c.id)}
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

          <button
            onClick={() => handleCastDayVote('SKIP')}
            className={`retro-btn w-full rounded-xl text-sm uppercase ${
              gameState.my_vote === 'SKIP' ? 'bg-ink text-white' : 'bg-paper text-ink'
            }`}
          >
            Skip / Abstain from Voting
          </button>
        </div>
      )}

      {/* Host Big Screen Log & Village History */}
      {isHost && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <h3 className="font-display font-black text-xl text-ink uppercase border-b-2 border-ink/10 pb-2">
            Village Chronicle & Night Reports
          </h3>

          {gameState.last_killed_name && (
            <div className="p-4 rounded-xl border-3 border-ink bg-red-100 flex items-center gap-3">
              <Skull className="text-arcade-terracotta shrink-0" size={28} />
              <div>
                <div className="font-display font-black text-lg text-ink">
                  {gameState.last_killed_name} was eliminated!
                </div>
                {gameState.last_killed_role && (
                  <div className="font-mono text-xs text-ink-muted">
                    Alignment was revealed as: <span className="font-bold">{gameState.last_killed_role}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState.doctor_saved && (
            <div className="p-4 rounded-xl border-3 border-ink bg-emerald-100 flex items-center gap-3">
              <Shield className="text-emerald-700 shrink-0" size={28} />
              <div className="font-display font-bold text-emerald-900">
                The Doctor successfully intervened and saved the target tonight!
              </div>
            </div>
          )}

          <div className="space-y-1.5 font-mono text-xs text-ink-muted bg-paper-light p-4 rounded-xl border border-ink/20">
            {gameState.history_log?.map((log: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-arcade-cobalt font-bold">•</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
