import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';

interface RoleCard3DProps {
  cardTitle: string;
  secretTitle: string;
  secretSubtitle?: string;
  secretDetails?: string | null;
  secretIcon: string;
  accentColor?: string;
  isSpecial?: boolean;
}

export function RoleCard3D({
  cardTitle,
  secretTitle,
  secretSubtitle,
  secretDetails,
  secretIcon,
  accentColor = '#E25241',
  isSpecial = false,
}: RoleCard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-sm mx-auto my-4 select-none">
      <div className="text-center mb-2 font-mono text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center justify-center gap-1.5">
        {isFlipped ? <EyeOff size={14} /> : <Eye size={14} />}
        {isFlipped ? 'Tap to conceal secret' : 'Tap or hold to peek secret'}
      </div>

      <div
        className="w-full h-72 perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        onTouchStart={() => setIsFlipped(true)}
        onTouchEnd={() => setIsFlipped(false)}
        onMouseDown={() => setIsFlipped(true)}
        onMouseUp={() => setIsFlipped(false)}
        onMouseLeave={() => setIsFlipped(false)}
      >
        <motion.div
          className="w-full h-full relative transform-style-3d transition-transform duration-500 rounded-2xl"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {/* FRONT: Concealed Identity (Physical Card Back) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border-4 border-ink bg-paper-dark p-6 flex flex-col justify-between shadow-retro-lg overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-4 border-ink/20 pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full border-4 border-ink/20 pointer-events-none" />

            <div className="flex justify-between items-center border-b-2 border-ink/20 pb-3">
              <span className="font-mono text-xs font-bold tracking-widest text-ink">TOP SECRET</span>
              <span className="text-xl">🔒</span>
            </div>

            <div className="my-auto text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl border-3 border-ink bg-paper-light flex items-center justify-center text-4xl shadow-retro mb-4">
                ❓
              </div>
              <h3 className="font-display font-black text-2xl text-ink tracking-tight uppercase">
                {cardTitle}
              </h3>
              <p className="font-mono text-xs text-ink-muted mt-1">CONFIDENTIAL DOSSIER</p>
            </div>

            <div className="bg-ink text-paper-light text-center py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase">
              HOLD TO REVEAL
            </div>
          </div>

          {/* BACK: Revealed Secret Role / Word */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border-4 border-ink p-6 flex flex-col justify-between shadow-retro-lg overflow-hidden"
            style={{ backgroundColor: isSpecial ? '#FFF9E6' : '#FFFFFF' }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-4 border-b-3 border-ink"
              style={{ backgroundColor: accentColor }}
            />

            <div className="flex justify-between items-center border-b-2 border-ink/10 pb-3 pt-2">
              <span className="font-mono text-xs font-bold tracking-widest" style={{ color: accentColor }}>
                CLASSIFIED ASSIGNMENT
              </span>
              <span className="text-2xl">{secretIcon}</span>
            </div>

            <div className="my-auto text-center px-2">
              <div className="w-20 h-20 mx-auto rounded-2xl border-3 border-ink bg-paper-light flex items-center justify-center text-4xl shadow-retro mb-3">
                {secretIcon}
              </div>
              <div
                className="font-display font-black text-3xl tracking-tight uppercase"
                style={{ color: accentColor }}
              >
                {secretTitle}
              </div>
              {secretSubtitle && (
                <div className="font-bold text-sm text-ink-muted mt-1">
                  {secretSubtitle}
                </div>
              )}
              {secretDetails && (
                <div className="font-mono text-xs text-ink/80 bg-paper-warm border border-ink/20 p-2.5 rounded-lg mt-3 text-left">
                  {secretDetails}
                </div>
              )}
            </div>

            <div className="border-t-2 border-ink/10 pt-2 text-center font-mono text-[11px] text-ink-muted uppercase">
              Keep screen tilted away from neighbors!
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
