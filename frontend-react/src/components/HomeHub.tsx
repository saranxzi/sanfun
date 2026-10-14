import React, { useState, useEffect } from 'react';
import { TotemCanvas } from './three/TotemCanvas';
import { soundEngine } from '../audio/sound';
import { ArrowRight, PlusCircle, Sparkles, User, Palette } from 'lucide-react';

interface HomeHubProps {
  onJoin: (code: string, nickname: string, avatar: string, color: string) => void;
  onCreate: (nickname: string, avatar: string, color: string) => void;
  initialCode?: string;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐙', '🦄', '🤖', '👾', '🦖', '🚀'];
const COLORS = ['#E25241', '#F5A623', '#2B6CB0', '#2A9D8F', '#8E44AD', '#FF8E72', '#10b981', '#06b6d4'];

export function HomeHub({ onJoin, onCreate, initialCode = '' }: HomeHubProps) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 4));
  const [nickname, setNickname] = useState(() => localStorage.getItem('sanfun_nickname') || '');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('sanfun_avatar') || '🦊');
  const [color, setColor] = useState(() => localStorage.getItem('sanfun_color') || '#E25241');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase().slice(0, 4));
    }
  }, [initialCode]);

  const handleAvatarSelect = (av: string) => {
    setAvatar(av);
    localStorage.setItem('sanfun_avatar', av);
    soundEngine.playTone(400, 0.05, 'sine', 0.15);
  };

  const handleColorSelect = (c: string) => {
    setColor(c);
    localStorage.setItem('sanfun_color', c);
    soundEngine.playTone(500, 0.05, 'sine', 0.15);
  };

  const handleNicknameChange = (val: string) => {
    const trimmed = val.slice(0, 16);
    setNickname(trimmed);
    localStorage.setItem('sanfun_nickname', trimmed);
  };

  const handleCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setCode(clean);
    if (clean.length > 0) {
      soundEngine.playTone(300 + clean.length * 60, 0.04, 'square', 0.1);
    }
  };

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) return;
    const finalNick = nickname.trim() || `Player ${Math.floor(10 + Math.random() * 90)}`;
    soundEngine.playDing();
    onJoin(code, finalNick, avatar, color);
  };

  const submitCreate = () => {
    setIsSubmitting(true);
    const finalNick = nickname.trim() || `Host ${Math.floor(10 + Math.random() * 90)}`;
    soundEngine.playStart();
    onCreate(finalNick, avatar, color);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      {/* 3D Centerpiece Showcase */}
      <div className="text-center mb-6">
        <TotemCanvas />
        <h1 className="font-display font-black text-4xl md:text-5xl text-ink tracking-tight uppercase mt-2">
          SANFUN ARCADE
        </h1>
        <p className="font-bold text-sm md:text-base text-ink-muted mt-1 max-w-md mx-auto">
          Play 8 handcrafted couch co-op games on your big screen using phones as physical controllers.
        </p>
      </div>

      {/* Profile & Avatar Customizer */}
      <div className="retro-box-lg rounded-2xl p-5 md:p-6 mb-8 bg-white">
        <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-3 mb-4">
          <User size={18} className="text-arcade-cobalt" />
          <h2 className="font-display font-bold text-lg text-ink uppercase">Your Arcade Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Avatar Preview & Nickname Input */}
          <div className="md:col-span-5 flex items-center gap-4">
            <div
              className="w-18 h-18 w-[72px] h-[72px] rounded-2xl border-3 border-ink flex items-center justify-center text-3xl shadow-retro shrink-0 transition-transform"
              style={{ backgroundColor: color }}
            >
              {avatar}
            </div>
            <div className="flex-1">
              <label className="block font-mono text-xs font-bold text-ink-muted uppercase mb-1">
                Nickname
              </label>
              <input
                type="text"
                placeholder="Enter Nickname..."
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                maxLength={16}
                className="w-full h-12 px-3 border-2.5 border-ink rounded-xl font-bold text-base text-ink bg-paper-light focus:outline-none focus:ring-2 focus:ring-arcade-cobalt"
              />
            </div>
          </div>

          {/* Avatar Swatches */}
          <div className="md:col-span-4">
            <label className="block font-mono text-xs font-bold text-ink-muted uppercase mb-1.5">
              Pick Avatar
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => handleAvatarSelect(av)}
                  className={`w-9 h-9 rounded-lg border-2 border-ink flex items-center justify-center text-lg transition-transform ${
                    avatar === av ? 'bg-arcade-mustard scale-110 shadow-retro-sm' : 'bg-paper-light hover:bg-paper-warm'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="md:col-span-3">
            <label className="block font-mono text-xs font-bold text-ink-muted uppercase mb-1.5">
              Player Tint
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleColorSelect(c)}
                  className={`w-8 h-8 rounded-lg border-2 border-ink transition-transform ${
                    color === c ? 'scale-115 ring-2 ring-ink ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Single-Screen Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Join Box */}
        <div className="retro-box-lg rounded-2xl p-6 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-arcade-cobalt uppercase tracking-wider">
                JOIN ON THIS DEVICE
              </span>
              <span className="text-xl">📱</span>
            </div>
            <h3 className="font-display font-black text-2xl text-ink uppercase mb-2">
              Enter Room Code
            </h3>
            <p className="font-medium text-xs text-ink-muted mb-4">
              Enter the 4-letter room code shown on the host's TV or monitor.
            </p>

            <form onSubmit={submitJoin} className="space-y-4">
              <div className="flex justify-center gap-2">
                <input
                  type="text"
                  placeholder="CODE"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  maxLength={4}
                  className="w-full text-center h-16 border-3 border-ink rounded-xl font-mono font-black text-3xl tracking-[0.3em] uppercase bg-paper-light focus:outline-none focus:ring-3 focus:ring-arcade-cobalt shadow-retro-sm"
                />
              </div>

              <button
                type="submit"
                disabled={code.length !== 4}
                className="retro-btn w-full bg-arcade-cobalt text-white rounded-xl text-lg uppercase flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <span>Join Game</span>
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Create Party Box */}
        <div className="retro-box-lg rounded-2xl p-6 bg-arcade-cream border-arcade-terracotta flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase tracking-wider">
                BIG SCREEN / HOST MODE
              </span>
              <span className="text-xl">📺</span>
            </div>
            <h3 className="font-display font-black text-2xl text-ink uppercase mb-2">
              Host New Room
            </h3>
            <p className="font-medium text-xs text-ink-muted mb-5">
              Launch a live room with a big-screen TV display, instant QR code join link, and game selector.
            </p>

            <div className="bg-white border-2 border-ink/20 rounded-xl p-3 mb-5 space-y-1.5 font-mono text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-arcade-mustard shrink-0" />
                <span>Supports 2 to 16 concurrent players</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-arcade-emerald shrink-0" />
                <span>Zero app installs required for friends</span>
              </div>
            </div>
          </div>

          <button
            onClick={submitCreate}
            disabled={isSubmitting}
            className="retro-btn w-full bg-arcade-terracotta text-white rounded-xl text-lg uppercase flex items-center justify-center gap-2 hover:bg-red-600"
          >
            <PlusCircle size={20} />
            <span>{isSubmitting ? 'Creating Room...' : 'Create Party Room'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
