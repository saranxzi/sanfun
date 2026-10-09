import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundEngine } from '../../audio/sound';
import { Gavel, DollarSign, Award, Tag, Sparkles } from 'lucide-react';

interface AuctionViewProps {
  isHost: boolean;
  gameState: any;
  onSendAction: (action: string, data?: any) => void;
}

export function AuctionView({ isHost, gameState, onSendAction }: AuctionViewProps) {
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [locked, setLocked] = useState(false);
  const [gavelDropped, setGavelDropped] = useState(false);

  const phase = gameState?.phase || 'INIT';
  const itemTitle = gameState?.item_title;
  const itemDesc = gameState?.item_description;
  const itemIcon = gameState?.item_icon || '🏛️';
  const itemCat = gameState?.item_category || 'Collectible';
  const hammerPrice = gameState?.hammer_price;

  useEffect(() => {
    if (phase === 'CATALOG') {
      setLocked(false);
      setBidAmount(0);
      setGavelDropped(false);
    } else if (phase === 'HAMMER') {
      // Trigger swinging kinetic gavel drop
      const timer = setTimeout(() => {
        setGavelDropped(true);
        soundEngine.playGavel();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const addBid = (amount: number) => {
    setBidAmount((prev) => prev + amount);
    soundEngine.playTick();
  };

  const submitBid = () => {
    setLocked(true);
    soundEngine.playDing();
    onSendAction('SUBMIT_BID', { bid: bidAmount });
  };

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('en-US');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="retro-box-lg rounded-2xl p-5 text-center bg-white">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-arcade-cobalt mb-1">
          ROUND {gameState.round_number || 1} OF {gameState.max_rounds || 3} • THE AUCTION HOUSE
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl text-ink uppercase">
          {phase === 'CATALOG' && 'Lot Inspection'}
          {phase === 'BIDDING' && 'Secret Valuation Bidding'}
          {phase === 'HAMMER' && 'Going, Going... SOLD!'}
          {phase === 'GAME_OVER' && `${gameState.winner || 'GAME'} WINS!`}
        </h2>
      </div>

      {/* Item Catalog Card */}
      {itemTitle && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
            <span className="font-mono text-xs font-bold text-arcade-terracotta uppercase">
              LOT #{gameState.round_number || 1} • {itemCat}
            </span>
            <span className="text-3xl">{itemIcon}</span>
          </div>

          <div className="text-center md:text-left">
            <h3 className="font-display font-black text-2xl md:text-3xl text-ink leading-tight mb-2">
              {itemTitle}
            </h3>
            <p className="font-medium text-xs md:text-sm text-ink-muted leading-relaxed">
              {itemDesc}
            </p>
          </div>
        </div>
      )}

      {/* Kinetic Swinging Gavel & Hammer Price Drop */}
      {(phase === 'HAMMER' || phase === 'GAME_OVER') && (
        <div className="retro-box-lg rounded-2xl p-6 bg-arcade-cream border-arcade-terracotta text-center space-y-4 overflow-hidden relative">
          <div className="h-28 flex items-center justify-center relative">
            <motion.div
              initial={{ rotate: -55, y: -20 }}
              animate={gavelDropped ? { rotate: 20, y: 15 } : { rotate: -55, y: -20 }}
              transition={{ type: 'spring', stiffness: 450, damping: 15 }}
              className="origin-bottom-right"
            >
              <div className="text-7xl select-none filter drop-shadow-[4px_4px_0_#1F1916]">
                🔨
              </div>
            </motion.div>
          </div>

          {gavelDropped && hammerPrice !== undefined && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-2"
            >
              <div className="inline-block bg-arcade-terracotta text-white font-mono font-black text-xs px-3 py-1 rounded-md uppercase tracking-widest shadow-retro-sm">
                HAMMER PRICE
              </div>
              <div className="font-mono font-black text-4xl md:text-5xl text-ink">
                {formatCurrency(hammerPrice)}
              </div>
              {gameState.fact && (
                <p className="font-mono text-xs text-ink-muted max-w-lg mx-auto pt-2">
                  {gameState.fact}
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Player Secret Bid Pad */}
      {!isHost && phase === 'BIDDING' && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-5 text-center">
          <div className="p-5 bg-paper-dark border-3 border-ink rounded-2xl shadow-retro">
            <span className="font-mono text-xs font-bold text-ink-muted uppercase block mb-1">
              YOUR SECRET VALUATION
            </span>
            <div className="font-mono font-black text-4xl text-arcade-cobalt">
              {formatCurrency(bidAmount)}
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[1000, 10000, 50000, 250000, 1000000, 5000000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => addBid(amt)}
                disabled={locked}
                className="p-2.5 rounded-xl border-2 border-ink bg-paper-light font-mono text-xs font-bold hover:bg-paper-warm active:translate-y-0.5 shadow-retro-sm"
              >
                +{amt >= 1e6 ? `${amt / 1e6}M` : amt >= 1e3 ? `${amt / 1e3}K` : amt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBidAmount(0)}
              disabled={locked}
              className="retro-btn bg-paper-dark text-ink text-sm px-4 rounded-xl"
            >
              Reset
            </button>
            <button
              onClick={submitBid}
              disabled={locked || bidAmount <= 0}
              className="retro-btn flex-1 bg-arcade-cobalt text-white rounded-xl text-lg uppercase"
            >
              {locked ? 'Bid Submitted ✓' : 'Submit Secret Bid'}
            </button>
          </div>
        </div>
      )}

      {/* Results Leaderboard */}
      {(phase === 'HAMMER' || phase === 'GAME_OVER') && gavelDropped && gameState.round_results && (
        <div className="retro-box-lg rounded-2xl p-6 bg-white space-y-3">
          <h3 className="font-display font-black text-xl text-ink uppercase border-b-2 border-ink/10 pb-2">
            Auction Bids & Winners
          </h3>
          <div className="space-y-2.5">
            {Object.entries(gameState.round_results).map(([pid, res]: [string, any]) => {
              const player = gameState.players?.find((p: any) => p.id === pid);
              return (
                <div
                  key={pid}
                  className={`p-3.5 rounded-xl border-2.5 border-ink flex items-center justify-between shadow-retro-sm ${
                    res.won_lot ? 'bg-amber-100 ring-2 ring-arcade-mustard' : 'bg-paper-light'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{player?.avatar || '🎮'}</span>
                    <div>
                      <div className="font-bold text-sm text-ink flex items-center gap-1.5">
                        <span>{player?.nickname || pid}</span>
                        {res.won_lot && (
                          <span className="text-[10px] font-mono font-bold bg-arcade-mustard text-ink px-1.5 py-0.2 rounded border border-ink">
                            WINNER
                          </span>
                        )}
                        {res.went_over && (
                          <span className="text-[10px] font-mono font-bold bg-red-100 text-red-700 px-1.5 py-0.2 rounded">
                            OVER
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-ink-muted">
                        Bid: {formatCurrency(res.bid)}
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
        </div>
      )}
    </div>
  );
}
