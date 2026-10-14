import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { LobbyState, GameMetadata } from '../types';
import { soundEngine } from '../audio/sound';
import { Play, Copy, Check, Users, Crown, UserX, Wifi, Globe, Sparkles, Bell, RotateCcw, Sliders, Gamepad2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnifiedLobbyProps {
  lobbyState: LobbyState;
  isHost: boolean;
  myPlayerId?: string;
  onSelectGame: (gameId: string) => void;
  onStartGame: () => void;
  onKickPlayer: (targetPid: string) => void;
  onPromoteHost: (targetPid: string) => void;
  onClearScores?: (targetPid?: string) => void;
  onUpdateSettings?: (settings: Record<string, any>) => void;
}

export function UnifiedLobby({
  lobbyState,
  isHost,
  myPlayerId,
  onSelectGame,
  onStartGame,
  onKickPlayer,
  onPromoteHost,
  onClearScores,
  onUpdateSettings,
}: UnifiedLobbyProps) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [useTunnelUrl, setUseTunnelUrl] = useState(false);
  const [honkCount, setHonkCount] = useState(0);

  const netInfo = lobbyState.network_info;
  const joinUrl = (useTunnelUrl && netInfo?.tunnel_url)
    ? `${netInfo.tunnel_url}/?join=${lobbyState.room_code}`
    : `${netInfo?.local_url || window.location.origin}/?join=${lobbyState.room_code}`;

  useEffect(() => {
    QRCode.toString(joinUrl, { type: 'svg', margin: 1, color: { dark: '#1F1916', light: '#FFFFFF' } })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [joinUrl]);

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    soundEngine.playDing();
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedGame = lobbyState.available_games.find(
    (g) => g.id === lobbyState.selected_game_id
  ) || lobbyState.available_games[0];

  const canStart = lobbyState.player_count >= (selectedGame?.min_players || 2);
  const playersNeeded = Math.max(0, (selectedGame?.min_players || 2) - lobbyState.player_count);

  const handleWarmUpHonk = () => {
    soundEngine.playHonk();
    setHonkCount((prev) => prev + 1);
  };

  const handleCartridgeClick = (gameId: string) => {
    if (!isHost) return;
    soundEngine.playDing();
    onSelectGame(gameId);
  };

  const currentRounds = lobbyState.settings?.max_rounds || 3;
  const currentTime = lobbyState.settings?.time_limit || 30;

  // Render game-dependent match configuration settings
  const renderGameSettings = () => {
    const gameId = selectedGame?.id || 'rather';

    switch (gameId) {
      case 'rather':
      case 'trolley':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Dilemma Rounds
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 7, 10].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Answer Pacing
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '15s Blitz', val: 15 },
                  { label: '30s Normal', val: 30 },
                  { label: '45s Chill', val: 45 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Majority Bet Rule:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                +500 / -500 pts
              </span>
            </div>
          </div>
        );

      case 'dialed':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Color Rounds
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 8].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Dialing Time Limit
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '15s Fast', val: 15 },
                  { label: '25s Standard', val: 25 },
                  { label: '40s Generous', val: 40 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Sliders Config:</span>
              <span className="font-bold text-arcade-cobalt bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                Hue, Contrast & Brightness
              </span>
            </div>
          </div>
        );

      case 'fermi':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Fermi Rounds
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 7].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Order of Magnitude Timer
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '25s Blitz', val: 25 },
                  { label: '35s Normal', val: 35 },
                  { label: '50s Thinker', val: 50 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Scoring Curve:</span>
              <span className="font-bold text-arcade-terracotta">1000 pts - 250×|ΔExp|</span>
            </div>
          </div>
        );

      case 'guess_price':
      case 'auction':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Valuation Lots
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 8].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r} Lots
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Valuation Timer
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '20s Blitz', val: 20 },
                  { label: '30s Normal', val: 30 },
                  { label: '45s Deep', val: 45 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Bidding Rule:</span>
              <span className="font-bold text-arcade-cobalt">Closest Hammer Price</span>
            </div>
          </div>
        );

      case 'circle':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Circle Rounds
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 8].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Stroke Drawing Timer
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '15s Speed', val: 15 },
                  { label: '20s Normal', val: 20 },
                  { label: '35s Zen', val: 35 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Size Threshold:</span>
              <span className="font-bold text-arcade-terracotta bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Min 60px Diameter
              </span>
            </div>
          </div>
        );

      case 'trends':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Trend Matchups
              </label>
              <div className="flex items-center gap-1.5">
                {[5, 8, 12].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Decision Timer
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '12s Blitz', val: 12 },
                  { label: '16s Normal', val: 16 },
                  { label: '25s Casual', val: 25 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'imposter':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Investigation Rounds
              </label>
              <div className="flex items-center gap-1.5">
                {[3, 5, 7].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ max_rounds: r })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-xs transition-all ${
                      currentRounds === r
                        ? 'bg-arcade-terracotta text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Debate Duration
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '45s Blitz', val: 45 },
                  { label: '75s Normal', val: 75 },
                  { label: '100s Debate', val: 100 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Imposter Clue Style:</span>
              <span className="font-bold text-arcade-terracotta">Related Chameleon Word</span>
            </div>
          </div>
        );

      case 'mafia':
        return (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-ink-muted uppercase mb-1">
                Day Discussion Time
              </label>
              <div className="flex items-center gap-1.5">
                {[
                  { label: '30s Quick', val: 30 },
                  { label: '45s Normal', val: 45 },
                  { label: '60s Long', val: 60 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings?.({ time_limit: p.val })}
                    className={`flex-1 py-1.5 rounded-lg border-2 border-ink font-mono font-bold text-[11px] transition-all ${
                      currentTime === p.val
                        ? 'bg-arcade-cobalt text-white shadow-retro-sm'
                        : isHost
                        ? 'bg-white hover:bg-paper-warm text-ink'
                        : 'bg-white text-ink-muted opacity-80 cursor-default'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-paper border border-ink/20 flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-ink">Special Roles:</span>
              <span className="font-bold text-arcade-cobalt">Doctor & Detective Active</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar: Room Code & Join QR Code */}
      <div className="retro-box-lg rounded-2xl p-5 md:p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Room Code Showcase */}
          <div className="md:col-span-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-wider">
                LOBBY OPEN • CODE TO JOIN
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 my-2">
              <span className="font-mono font-black text-5xl md:text-6xl tracking-[0.2em] text-arcade-terracotta select-all">
                {lobbyState.room_code}
              </span>

              <button
                onClick={copyJoinLink}
                className="retro-btn bg-paper-light hover:bg-paper-warm text-ink text-sm px-4 py-2 rounded-xl flex items-center gap-2"
                title="Copy Join URL"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <p className="font-medium text-xs md:text-sm text-ink-muted mt-1">
              Phones: open browser to <span className="font-mono font-bold text-ink underline">{joinUrl}</span> or scan the QR code to join in seconds.
            </p>

            {/* Network Tunnel Selector */}
            {netInfo?.tunnel_url && (
              <div className="flex items-center gap-2 mt-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setUseTunnelUrl(false)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-ink flex items-center gap-1.5 ${
                    !useTunnelUrl ? 'bg-arcade-cobalt text-white font-bold' : 'bg-paper text-ink'
                  }`}
                >
                  <Wifi size={13} />
                  <span>Local Wi-Fi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseTunnelUrl(true)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-ink flex items-center gap-1.5 ${
                    useTunnelUrl ? 'bg-arcade-terracotta text-white font-bold' : 'bg-paper text-ink'
                  }`}
                >
                  <Globe size={13} />
                  <span>Public Cloudflare Tunnel</span>
                </button>
              </div>
            )}
          </div>

          {/* Inline SVG QR Code */}
          <div className="md:col-span-4 flex flex-col items-center justify-center">
            <div className="p-3 bg-white border-3 border-ink rounded-2xl shadow-retro shrink-0 w-40 h-40 flex items-center justify-center">
              {qrSvg ? (
                <div
                  className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="font-mono text-xs text-ink-muted">Generating QR...</div>
              )}
            </div>
            <span className="font-mono text-[10px] font-bold text-ink-muted uppercase mt-2 tracking-wider">
              SCAN TO JOIN INSTANTLY
            </span>
          </div>
        </div>
      </div>

      {/* Main Row: Game Cartridge Selector / Hero Showcase (Left) & Settings + Crew Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-7): Cartridge Selector for Host, Hero Showcase for Players */}
        <div className="lg:col-span-7 space-y-4">
          {isHost ? (
            /* Host View: 8-Cartridge Selector Grid with Tactile Spring Physics */
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ink uppercase flex items-center gap-2">
                  <Gamepad2 size={22} className="text-arcade-terracotta" />
                  <span>Select Game Cartridge</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-arcade-mustard border border-ink">
                    8 AVAILABLE
                  </span>
                </h2>
                <span className="font-mono text-xs text-ink-muted">Tap to switch cartridge</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {lobbyState.available_games.map((g: GameMetadata) => {
                  const isSelected = g.id === lobbyState.selected_game_id;
                  return (
                    <motion.div
                      key={g.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      animate={isSelected ? { scale: [1, 1.03, 1], y: -2 } : { scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                      onClick={() => handleCartridgeClick(g.id)}
                      className={`p-4 rounded-2xl border-3 border-ink transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] select-none ${
                        isSelected
                          ? 'bg-arcade-cream border-arcade-terracotta shadow-retro-lg ring-2 ring-arcade-terracotta'
                          : 'bg-white hover:bg-paper-warm shadow-retro'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-arcade-terracotta text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg border-b border-l border-ink uppercase tracking-wider">
                          ACTIVE
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-3xl">{g.icon}</span>
                          <div>
                            <h3 className="font-display font-black text-lg text-ink leading-tight">
                              {g.name}
                            </h3>
                            <span className="font-mono text-[11px] font-bold text-arcade-cobalt uppercase">
                              {g.min_players}-{g.max_players} PLAYERS
                            </span>
                          </div>
                        </div>
                        <p className="font-medium text-xs text-ink-muted line-clamp-2">
                          {g.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-ink/10 flex justify-between items-center text-[11px] font-mono font-bold text-ink-muted">
                        <span className="italic">"{g.tagline}"</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Player View: Animated Selected Game Hero Showcase Card */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-black text-xl text-ink uppercase flex items-center gap-2">
                  <Gamepad2 size={22} className="text-arcade-cobalt" />
                  <span>Next Game Up</span>
                </h2>
                <span className="font-mono text-xs font-bold text-ink-muted uppercase">
                  WAITING FOR HOST
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedGame.id}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="retro-box-lg rounded-3xl p-6 md:p-8 bg-white border-3 border-ink shadow-retro-lg space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-arcade-cream border-2 border-ink text-arcade-terracotta uppercase">
                      ACTIVE CARTRIDGE
                    </span>
                    <span className="font-mono text-xs font-bold text-arcade-cobalt uppercase">
                      {selectedGame.min_players}-{selectedGame.max_players} PLAYERS
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="text-5xl md:text-6xl p-3 bg-arcade-cream rounded-2xl border-3 border-ink shadow-retro-sm shrink-0">
                      {selectedGame.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-2xl md:text-3xl text-ink uppercase leading-tight">
                        {selectedGame.name}
                      </h3>
                      <p className="font-mono text-xs md:text-sm text-ink-muted italic mt-0.5">
                        "{selectedGame.tagline}"
                      </p>
                    </div>
                  </div>

                  <p className="font-medium text-sm text-ink bg-paper-light p-4 rounded-xl border-2 border-ink">
                    {selectedGame.description}
                  </p>

                  <div className="p-3 bg-arcade-mustard/20 border-2 border-dashed border-ink/40 rounded-xl text-center font-mono text-xs font-bold text-ink">
                    🎮 The host selects the game and settings. Your phone will instantly switch to the physical controller once launched!
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-5): Game-Dependent Settings (Above) + Joined Crew Roster (Below) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Game-Dependent Settings Panel (Moved to Right Column as Requested) */}
          <div className="retro-box-lg rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between border-b-2 border-ink/10 pb-2">
              <h3 className="font-display font-black text-base text-ink uppercase flex items-center gap-2">
                <Sliders size={18} className="text-arcade-cobalt" />
                <span>{selectedGame.name} Rules</span>
              </h3>
              {!isHost && (
                <span className="font-mono text-[11px] font-bold text-ink-muted bg-paper-light px-2 py-0.5 rounded border border-ink/20">
                  Host Configured
                </span>
              )}
            </div>

            {renderGameSettings()}
          </div>

          {/* Joined Crew Roster */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-xl text-ink uppercase flex items-center gap-2">
                <Users size={20} className="text-arcade-cobalt" />
                <span>Joined Crew</span>
                <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded-lg border-2 border-ink shadow-retro-sm">
                  {lobbyState.player_count}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {isHost && lobbyState.players.some((p) => p.score > 0) && (
                  <button
                    type="button"
                    onClick={() => onClearScores?.()}
                    className="px-2 py-0.5 text-[11px] font-mono font-bold text-red-600 hover:bg-red-50 border border-red-300 rounded-lg flex items-center gap-1 shadow-retro-sm"
                    title="Reset all player scores to 0"
                  >
                    <RotateCcw size={11} />
                    <span>Reset All</span>
                  </button>
                )}
                <span className="font-mono text-xs text-ink-muted">
                  {canStart ? 'Ready to play' : `Need ${playersNeeded} more`}
                </span>
              </div>
            </div>

            <div className="retro-box-lg rounded-2xl p-4 bg-white min-h-[280px] flex flex-col justify-between">
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {lobbyState.players.map((p) => {
                  const isMe = p.id === myPlayerId;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border-2.5 border-ink bg-paper-light shadow-retro-sm hover:bg-paper-warm transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl border-2 border-ink flex items-center justify-center text-xl shadow-retro-sm shrink-0"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.avatar}
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-ink truncate max-w-[130px]">
                              {p.nickname}
                            </span>
                            {p.is_host && (
                              <span className="flex items-center gap-0.5 bg-arcade-mustard text-ink text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-ink">
                                <Crown size={10} />
                                <span>HOST</span>
                              </span>
                            )}
                            {isMe && (
                              <span className="bg-arcade-cobalt text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                          </div>

                          <span className="font-mono text-[11px] font-bold text-ink-muted">
                            Score: {p.score} pts
                          </span>
                        </div>
                      </div>

                      {/* Host Controls for Player Management */}
                      {isHost && (
                        <div className="flex items-center gap-1">
                          {p.score > 0 && (
                            <button
                              type="button"
                              onClick={() => onClearScores?.(p.id)}
                              className="p-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 border border-ink/30 rounded-lg shadow-retro-sm"
                              title="Reset this player's score to 0"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                          {!p.is_host && (
                            <>
                              <button
                                type="button"
                                onClick={() => onPromoteHost(p.id)}
                                className="px-2 py-1 text-[11px] font-mono font-bold bg-white hover:bg-arcade-mustard border-2 border-ink rounded-lg shadow-retro-sm"
                                title="Transfer Room Host Role"
                              >
                                Make Host
                              </button>
                              <button
                                type="button"
                                onClick={() => onKickPlayer(p.id)}
                                className="w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-100 border-2 border-ink rounded-lg shadow-retro-sm"
                                title="Kick Player from Room"
                                aria-label="Kick Player"
                              >
                                <UserX size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {lobbyState.players.length === 0 && (
                  <div className="text-center py-10 font-mono text-xs text-ink-muted">
                    No players connected yet. Scan QR code to join!
                  </div>
                )}
              </div>

              {/* Launch Game Action or Player Warm-Up Widget */}
              <div className="mt-5 pt-4 border-t-2 border-ink/10">
                {isHost ? (
                  <div>
                    <button
                      onClick={onStartGame}
                      disabled={!canStart}
                      className="retro-btn w-full bg-arcade-terracotta text-white rounded-xl text-lg uppercase flex items-center justify-center gap-2 hover:bg-red-600"
                    >
                      <Play size={20} />
                      <span>Launch {selectedGame.name}</span>
                    </button>
                    {!canStart && (
                      <p className="font-mono text-center text-xs text-arcade-terracotta font-bold mt-2">
                        ⚠️ Needs at least {selectedGame.min_players} players (current: {lobbyState.player_count})
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-arcade-cream border-2 border-ink rounded-xl text-center">
                      <p className="font-bold text-sm text-ink flex items-center justify-center gap-1.5">
                        <Sparkles size={16} className="text-arcade-mustard" />
                        <span>Ready in Lobby! Waiting for Host to launch...</span>
                      </p>
                    </div>

                    {/* Interactive Warm-Up Honk Widget */}
                    <button
                      type="button"
                      onClick={handleWarmUpHonk}
                      className="retro-btn w-full bg-arcade-mustard text-ink rounded-xl text-sm uppercase flex items-center justify-center gap-2 hover:bg-amber-400"
                    >
                      <Bell size={16} />
                      <span>Warm Up Buzzer {honkCount > 0 ? `(${honkCount})` : ''}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
