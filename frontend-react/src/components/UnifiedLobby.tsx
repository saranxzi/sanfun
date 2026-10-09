import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { LobbyState, GameMetadata } from '../types';
import { soundEngine } from '../audio/sound';
import { Play, Copy, Check, Users, Crown, UserX, Wifi, Globe, Sparkles, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnifiedLobbyProps {
  lobbyState: LobbyState;
  isHost: boolean;
  myPlayerId?: string;
  onSelectGame: (gameId: string) => void;
  onStartGame: () => void;
  onKickPlayer: (targetPid: string) => void;
  onPromoteHost: (targetPid: string) => void;
}

export function UnifiedLobby({
  lobbyState,
  isHost,
  myPlayerId,
  onSelectGame,
  onStartGame,
  onKickPlayer,
  onPromoteHost,
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

      {/* Main Row: Game Cartridge Selector & Player Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Game Cartridge Selector */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-xl text-ink uppercase flex items-center gap-2">
              <span>Select Game Cartridge</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-arcade-mustard border border-ink">
                8 AVAILABLE
              </span>
            </h2>
            {isHost && (
              <span className="font-mono text-xs text-ink-muted">Tap to switch cartridge</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {lobbyState.available_games.map((g: GameMetadata) => {
              const isSelected = g.id === lobbyState.selected_game_id;
              return (
                <motion.div
                  key={g.id}
                  whileHover={{ scale: isHost ? 1.02 : 1 }}
                  whileTap={{ scale: isHost ? 0.98 : 1 }}
                  onClick={() => isHost && onSelectGame(g.id)}
                  className={`p-4 rounded-2xl border-3 border-ink transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                    isSelected
                      ? 'bg-arcade-cream border-arcade-terracotta shadow-retro-lg ring-2 ring-arcade-terracotta'
                      : 'bg-white hover:bg-paper-warm shadow-retro'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-arcade-terracotta text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-b border-l border-ink uppercase">
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
        </div>

        {/* Live Player Roster */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-xl text-ink uppercase flex items-center gap-2">
              <Users size={20} className="text-arcade-cobalt" />
              <span>Joined Crew</span>
              <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded-lg border-2 border-ink shadow-retro-sm">
                {lobbyState.player_count}
              </span>
            </h2>
            <span className="font-mono text-xs text-ink-muted">
              {canStart ? 'Ready to play' : `Need ${playersNeeded} more`}
            </span>
          </div>

          <div className="retro-box-lg rounded-2xl p-4 bg-white min-h-[320px] flex flex-col justify-between">
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
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

                        <span className="font-mono text-[11px] text-ink-muted">
                          Score: {p.score} pts
                        </span>
                      </div>
                    </div>

                    {/* Host Controls for Player Management */}
                    {isHost && !p.is_host && (
                      <div className="flex items-center gap-1.5">
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
  );
}
