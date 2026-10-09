import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Target, Music, Check, Volume2, Sparkles } from 'lucide-react';

interface DialedViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function DialedView({ isHost, gameState, onSendAction }: DialedViewProps) {
  const [hue, setHue] = useState(180);
  const [saturation, setSaturation] = useState(85);
  const [value, setValue] = useState(90);
  const [pitch, setPitch] = useState(330);
  const [locked, setLocked] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const roundType = gameState?.round_type || 'COLOR';
  const targetColor = gameState?.target_color;
  const targetPitch = gameState?.target_pitch;

  useEffect(() => {
    if (phase === 'INSPECT' && roundType === 'PITCH' && targetPitch) {
      soundEngine.playTone(targetPitch.freq, 1.2, 'sine', 0.3);
    }
    if (phase === 'INSPECT') {
      setLocked(false);
    }
  }, [phase, roundType, targetPitch]);

  const previewHex = `hsl(${hue}, ${saturation}%, ${value * 0.5}%)`;

  const playMyPitch = () => {
    soundEngine.playTone(pitch, 0.4, 'sine', 0.25);
  };

  const submitDial = () => {
    setLocked(true);
    soundEngine.playDing();
    if (roundType === 'COLOR') {
      onSendAction('SUBMIT_DIAL', { h: hue, s: saturation, v: value });
    } else {
      onSendAction('SUBMIT_DIAL', { pitch });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • {roundType} MATCH
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'INSPECT' && 'Memorize The Target'}
          {phase === 'DIAL' && (roundType === 'COLOR' ? 'Tune Your Color Dial' : 'Tune Your Frequency')}
          {phase === 'REVEAL' && 'Precision Reveal'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Target Preview Box (During Inspect or Reveal) */}
      {(phase === 'INSPECT' || phase === 'REVEAL' || phase === 'GAME_OVER') && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white text-center space-y-4">
          <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-wider">
            TARGET REFERENCE
          </span>

          {roundType === 'COLOR' && targetColor && (
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 rounded-2xl border-4 border-ink shadow-retro-lg mb-3"
                style={{ backgroundColor: targetColor.hex }}
              />
              <h3 className="font-display font-black text-2xl text-ink">{targetColor.name}</h3>
              <span className="font-mono text-xs text-ink-muted">{targetColor.hex}</span>
            </div>
          )}

          {roundType === 'PITCH' && targetPitch && (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-2xl border-4 border-ink bg-arcade-mustard flex items-center justify-center text-4xl shadow-retro-lg mb-3">
                <Music size={40} className="text-ink" />
              </div>
              <h3 className="font-display font-black text-2xl text-ink">{targetPitch.name}</h3>
              <span className="font-mono text-sm text-ink-muted">{targetPitch.freq} Hz</span>
              <button
                type="button"
                onClick={() => soundEngine.playTone(targetPitch.freq, 0.8, 'sine', 0.3)}
                className="retro-btn bg-paper-light text-ink text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 mt-2"
              >
                <Volume2 size={14} />
                <span>Replay Target Tone</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Dial Controller (Player View) */}
      {!isHost && phase === 'DIAL' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-6">
          {roundType === 'COLOR' ? (
            <div className="space-y-5">
              {/* Live Swatch Preview */}
              <div className="text-center">
                <div
                  className="w-28 h-28 mx-auto rounded-2xl border-4 border-ink shadow-retro transition-colors duration-100"
                  style={{ backgroundColor: previewHex }}
                />
                <span className="font-mono text-xs font-bold text-ink-muted mt-2 block">
                  YOUR LIVE COLOR TUNER
                </span>
              </div>

              {/* Hue Rotary / Spring Slider */}
              <div>
                <div className="flex justify-between font-mono text-xs font-bold text-ink mb-1">
                  <span>Color Hue ({hue}°)</span>
                  <span>Spectrum</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={hue}
                  onChange={(e) => setHue(Number(e.target.value))}
                  disabled={locked}
                  className="w-full h-8 rounded-lg appearance-none cursor-pointer border-2 border-ink"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  }}
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between font-mono text-xs font-bold text-ink mb-1">
                  <span>Saturation ({saturation}%)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  disabled={locked}
                  className="w-full h-4 rounded-lg bg-paper-warm border-2 border-ink"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-arcade-cream border-2 border-ink rounded-xl">
                <span className="font-mono text-xs font-bold text-ink-muted">TUNED FREQUENCY</span>
                <div className="font-mono font-black text-4xl text-arcade-cobalt my-1">
                  {pitch} Hz
                </div>
                <button
                  type="button"
                  onClick={playMyPitch}
                  className="retro-btn bg-white text-ink text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                >
                  <Volume2 size={14} />
                  <span>Test Tuned Pitch</span>
                </button>
              </div>

              {/* Pitch Slider */}
              <input
                type="range"
                min="130"
                max="590"
                value={pitch}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPitch(val);
                  soundEngine.playTone(val, 0.08, 'sine', 0.15);
                }}
                disabled={locked}
                className="w-full h-6 rounded-lg bg-paper-warm border-2 border-ink"
              />
            </div>
          )}

          <button
            onClick={submitDial}
            disabled={locked}
            className="retro-btn w-full bg-arcade-terracotta text-white rounded-xl text-lg uppercase"
          >
            {locked ? 'Dial Locked In ✓' : 'Lock In Guess'}
          </button>
        </div>
      )}

      {/* Round Reveal Leaderboard */}
      {(phase === 'REVEAL' || phase === 'GAME_OVER') && gameState.round_results && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <h3 className="font-display font-black text-xl text-ink uppercase border-b-2 border-ink/10 pb-2">
            Round Precision Scores
          </h3>
          <div className="space-y-2.5">
            {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => {
              const player = gameState.players?.find((p: any) => p.id === pid);
              return (
                <div
                  key={pid}
                  className="p-3.5 rounded-xl border-2 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player?.avatar || '🎮'}</span>
                    <div>
                      <div className="font-bold text-sm text-ink">{player?.nickname || pid}</div>
                      <div className="font-mono text-xs text-ink-muted">
                        Accuracy: <span className="font-bold text-arcade-cobalt">{res.score_pct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-black text-lg text-emerald-700">
                    +{res.points_awarded || 0} pts
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
