import React, { useRef, useState, useEffect } from 'react';
import { soundEngine } from '../../audio/sound';
import { RotateCcw, Check, Sparkles, Award } from 'lucide-react';

interface CircleViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function CircleView({ isHost, gameState, onSendAction }: CircleViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const phase = gameState?.phase || 'INIT';

  useEffect(() => {
    if (phase === 'DRAWING') {
      setSubmitted(false);
      setPoints([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [phase]);

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (submitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setPoints([[x, y]]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = '#E25241';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    soundEngine.playTone(350, 0.05, 'triangle', 0.1);
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || submitted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints((prev) => [...prev, [x, y]]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawing || submitted) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (submitted) return;
    setPoints([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const submitCircle = () => {
    if (points.length < 20) return;
    setSubmitted(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_CIRCLE', { points });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • DRAW A PERFECT CIRCLE
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'DRAWING' && 'Draw A Freehand Circle In One Stroke'}
          {phase === 'SHOWCASE' && 'Mathematical Circularity Evaluation'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Drawing Pad (Player View) */}
      {!isHost && phase === 'DRAWING' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4 text-center">
          <div className="font-mono text-xs text-ink-muted">
            Draw one continuous closed circle on the pad below. Pratt fitting evaluates your precision!
          </div>

          <div className="relative mx-auto w-full max-w-sm aspect-square bg-paper-light border-3 border-ink rounded-2xl shadow-retro overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              width={350}
              height={350}
              onPointerDown={startDraw}
              onPointerMove={drawMove}
              onPointerUp={endDraw}
              onPointerCancel={endDraw}
              className="w-full h-full cursor-crosshair"
            />
            {points.length === 0 && !isDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-ink-muted font-mono text-xs font-bold">
                START DRAWING HERE ⭕
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3 max-w-sm mx-auto">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={submitted || points.length === 0}
              className="retro-btn bg-paper-dark text-ink text-sm px-4 rounded-xl flex items-center gap-1.5"
            >
              <RotateCcw size={16} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={submitCircle}
              disabled={submitted || points.length < 25}
              className="retro-btn flex-1 bg-arcade-cobalt text-white rounded-xl text-base uppercase flex items-center justify-center gap-2"
            >
              <Check size={18} />
              <span>{submitted ? 'Submitted ✓' : 'Submit Circle'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Showcase Evaluation & Scores */}
      {(phase === 'SHOWCASE' || phase === 'GAME_OVER') && gameState.evals && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <h3 className="font-display font-black text-xl text-ink uppercase border-b-2 border-ink/10 pb-2">
            Circularity Precision Ratings
          </h3>
          <div className="space-y-3">
            {Object.entries(gameState.evals).map(([pid, ev]: [string, any]) => {
              const player = gameState.players?.find((p: any) => p.id === pid);
              const metrics = ev.metrics || {};
              return (
                <div
                  key={pid}
                  className="p-4 rounded-xl border-2.5 border-ink bg-paper-light flex items-center justify-between shadow-retro-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{player?.avatar || '⭕'}</span>
                    <div>
                      <div className="font-bold text-base text-ink">{player?.nickname || pid}</div>
                      <div className="font-mono text-xs text-ink-muted">
                        Coverage: {metrics.angular_coverage_pct || 0}% • Mean Radius: {metrics.mean_radius || 0}px
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-display font-black text-2xl text-arcade-terracotta">
                      {ev.score_pct}%
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-700">
                      +{ev.points} pts
                    </div>
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
