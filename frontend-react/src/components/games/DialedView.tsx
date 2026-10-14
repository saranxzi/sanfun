import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Target, Sparkles, Check, Sliders } from 'lucide-react';

interface DialedViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function DialedView({ isHost, gameState, onSendAction }: DialedViewProps) {
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(85);
  const [value, setValue] = useState(85);
  const [locked, setLocked] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const targetColor = gameState?.target_color;

  useEffect(() => {
    setLocked(false);
  }, [gameState?.round_number, phase]);

  const isLocked = locked || Boolean(gameState?.has_submitted);

  // Convert HSB to HSL for CSS preview
  // L = V * (1 - S / 2)
  // S_hsl = (L === 0 || L === 1) ? 0 : (V - L) / Math.min(L, 1 - L)
  const sNorm = saturation / 100;
  const vNorm = value / 100;
  const lNorm = vNorm * (1 - sNorm / 2);
  const sHslNorm = (lNorm === 0 || lNorm === 1) ? 0 : (vNorm - lNorm) / Math.min(lNorm, 1 - lNorm);
  const previewHex = `hsl(${Math.round(hue)}, ${Math.round(sHslNorm * 100)}%, ${Math.round(lNorm * 100)}%)`;

  const submitDial = () => {
    setLocked(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_DIAL', { h: hue, s: saturation, v: value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • COLOR CHROMATIC MATCH
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'INSPECT' && 'Memorize The Exact Shade'}
          {phase === 'DIAL' && 'Tune Your Hue, Contrast & Brightness'}
          {phase === 'REVEAL' && 'Chromatic Precision Reveal'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Host TV: Prominent, Giant Hero Swatch (Closer to Full Screen) */}
      {(phase === 'INSPECT' || phase === 'REVEAL' || phase === 'GAME_OVER') && targetColor && (
        <div className="retro-box-lg rounded-3xl p-6 md:p-8 bg-white text-center space-y-4">
          <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest block">
            TARGET COLOR REFERENCE
          </span>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full h-72 md:h-96 rounded-2xl md:rounded-3xl border-4 border-ink shadow-retro-lg flex flex-col items-center justify-end p-6 relative overflow-hidden"
            style={{ backgroundColor: targetColor.hex }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 bg-white/95 backdrop-blur-sm border-3 border-ink px-6 py-3 rounded-2xl shadow-retro">
              <h3 className="font-display font-black text-2xl md:text-3xl text-ink tracking-tight">
                {targetColor.name}
              </h3>
              <span className="font-mono text-xs md:text-sm font-bold text-ink-muted tracking-widest uppercase">
                {targetColor.hex}
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Player Controller: Three Distinct Sliders (Hue, Contrast/Saturation, Brightness) */}
      {!isHost && phase === 'DIAL' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-6">
          {/* Real-time Dynamic Color Swatch Preview */}
          <div className="text-center space-y-2">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-wider block">
              YOUR TUNED ESTIMATE
            </span>
            <div
              className="w-full h-36 md:h-44 rounded-2xl border-4 border-ink shadow-retro flex flex-col items-center justify-center transition-colors duration-75"
              style={{ backgroundColor: previewHex }}
            >
              <div className="bg-white/90 border-2 border-ink px-4 py-1.5 rounded-xl font-mono text-xs font-bold text-ink shadow-sm">
                {previewHex}
              </div>
            </div>
          </div>

          {/* 3 Physical Touch Sliders */}
          <div className="space-y-5">
            {/* Slider 1: Hue (0 - 360 deg) */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs font-bold text-ink">
                <span>1. HUE (TINT)</span>
                <span>{Math.round(hue)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={hue}
                onChange={(e) => {
                  setHue(Number(e.target.value));
                  soundEngine.playTick();
                }}
                disabled={isLocked}
                className="w-full h-9 rounded-xl border-3 border-ink cursor-pointer appearance-none outline-none"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
            </div>

            {/* Slider 2: Contrast / Saturation (0 - 100%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs font-bold text-ink">
                <span>2. CONTRAST / SATURATION</span>
                <span>{Math.round(saturation)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={saturation}
                onChange={(e) => {
                  setSaturation(Number(e.target.value));
                  soundEngine.playTick();
                }}
                disabled={isLocked}
                className="w-full h-9 rounded-xl border-3 border-ink cursor-pointer appearance-none outline-none"
                style={{
                  background: `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`,
                }}
              />
            </div>

            {/* Slider 3: Brightness / Value (0 - 100%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs font-bold text-ink">
                <span>3. BRIGHTNESS (LIGHTNESS)</span>
                <span>{Math.round(value)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={value}
                onChange={(e) => {
                  setValue(Number(e.target.value));
                  soundEngine.playTick();
                }}
                disabled={isLocked}
                className="w-full h-9 rounded-xl border-3 border-ink cursor-pointer appearance-none outline-none"
                style={{
                  background: `linear-gradient(to right, #000000, hsl(${hue}, ${saturation}%, 50%), #ffffff)`,
                }}
              />
            </div>
          </div>

          {/* Tactile Lock In Button */}
          <button
            onClick={submitDial}
            disabled={isLocked}
            className={`retro-btn w-full py-4 rounded-xl text-lg uppercase flex items-center justify-center gap-2 ${
              isLocked
                ? 'bg-paper-dark text-ink-muted cursor-not-allowed opacity-80'
                : 'bg-arcade-terracotta text-white hover:bg-arcade-terracotta/90'
            }`}
          >
            {isLocked ? (
              <>
                <Check size={20} />
                <span>Color Locked In ✓</span>
              </>
            ) : (
              <>
                <Target size={20} />
                <span>Lock In Color Estimate</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Reveal Phase Results */}
      {(phase === 'REVEAL' || phase === 'GAME_OVER') && gameState.results && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-arcade-terracotta uppercase">
            <Sparkles size={16} />
            <span>Round Standings & Accuracy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(gameState.results).map(([pid, res]: [string, any]) => {
              const score = Math.round(res.score || 0);
              const dial = res.dial || {};
              const dialS = (dial.s || 85) / 100;
              const dialV = (dial.v || 85) / 100;
              const dialL = dialV * (1 - dialS / 2);
              const dialHslS = (dialL === 0 || dialL === 1) ? 0 : (dialV - dialL) / Math.min(dialL, 1 - dialL);
              const playerColor = `hsl(${Math.round(dial.h || 0)}, ${Math.round(dialHslS * 100)}%, ${Math.round(dialL * 100)}%)`;

              return (
                <div
                  key={pid}
                  className="p-4 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-ink shadow-sm"
                      style={{ backgroundColor: playerColor }}
                      title="Player's submitted color"
                    />
                    <div>
                      <span className="font-bold text-sm text-ink block">{res.nickname}</span>
                      <span className="font-mono text-xs text-ink-muted">
                        Accuracy: {score}%
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-black text-lg text-arcade-cobalt">
                    +{res.points_earned || 0} pts
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
