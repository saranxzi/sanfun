import React, { useState } from 'react';
import { Volume2, VolumeX, Radio, LogOut, Copy, Check } from 'lucide-react';
import { soundEngine } from '../audio/sound';

interface NavbarProps {
  roomCode?: string | null;
  connected: boolean;
  onLeave?: () => void;
}

export function Navbar({ roomCode, connected, onLeave }: NavbarProps) {
  const [muted, setMuted] = useState(soundEngine.isMuted());
  const [copied, setCopied] = useState(false);

  const handleMuteToggle = () => {
    const isNowMuted = soundEngine.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      soundEngine.playTone(660, 0.1, 'triangle', 0.2);
    }
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    soundEngine.playDing();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full bg-paper border-b-3 border-ink px-4 py-3 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onLeave && onLeave()}>
            <span className="w-9 h-9 rounded-xl bg-arcade-terracotta border-2.5 border-ink flex items-center justify-center text-xl shadow-retro-sm font-black text-white">
              S
            </span>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl tracking-tight text-ink leading-none">
                SANFUN
              </span>
              <span className="font-mono text-[10px] font-bold text-arcade-terracotta tracking-wider uppercase">
                COUCH ARCADE
              </span>
            </div>
          </div>
        </div>

        {/* Room Code Badge (if active) */}
        {roomCode && (
          <div
            onClick={copyRoomCode}
            className="cursor-pointer bg-white border-2.5 border-ink rounded-xl px-3 py-1 flex items-center gap-2 shadow-retro-sm hover:translate-y-[-1px] transition-transform"
          >
            <span className="font-mono text-xs text-ink-muted uppercase">ROOM:</span>
            <span className="font-mono font-black text-base tracking-widest text-arcade-cobalt">
              {roomCode}
            </span>
            {copied ? <Check size={14} className="text-arcade-emerald" /> : <Copy size={14} className="text-ink-muted" />}
          </div>
        )}

        {/* Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Connection Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-ink bg-white font-mono text-xs font-bold shadow-retro-sm">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[11px] text-ink">{connected ? 'ONLINE' : 'CONNECTING'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleMuteToggle}
            className="w-10 h-10 rounded-xl border-2.5 border-ink bg-white flex items-center justify-center shadow-retro-sm hover:bg-paper-warm active:translate-y-0.5 active:shadow-retro-press transition-all"
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            aria-label="Toggle Sound"
          >
            {muted ? <VolumeX size={18} className="text-arcade-terracotta" /> : <Volume2 size={18} className="text-ink" />}
          </button>

          {/* Leave Room Button */}
          {roomCode && onLeave && (
            <button
              onClick={onLeave}
              className="w-10 h-10 rounded-xl border-2.5 border-ink bg-paper-dark flex items-center justify-center shadow-retro-sm hover:bg-arcade-terracotta hover:text-white active:translate-y-0.5 transition-all"
              title="Exit Room"
              aria-label="Exit Room"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
