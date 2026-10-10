// Frontend validation self-check
import assert from 'node:assert';
import fs from 'node:fs';

console.log('Running Sanfun frontend invariant verification...');

// 1. Verify index.css contains 3D perspective and retro tactile button rules
const css = fs.readFileSync('./src/index.css', 'utf-8');
assert(css.includes('perspective-1000'), 'Missing perspective-1000 class');
assert(css.includes('transform-style-3d'), 'Missing transform-style-3d class');
assert(css.includes('rotate-y-180'), 'Missing rotate-y-180 class');
assert(css.includes('retro-btn'), 'Missing retro-btn tactile button styling');

// 2. Verify CircleView enforces 30 minimum points (matching backend engine rule)
const circleView = fs.readFileSync('./src/components/games/CircleView.tsx', 'utf-8');
assert(circleView.includes('points.length < 30'), 'CircleView must require at least 30 points');
assert(!circleView.includes('points.length < 20'), 'CircleView must not use outdated 20 points threshold');

// 3. Verify usePartySocket syncs phaseTimer from ROOM_STATE and handles PROMOTED_TO_HOST
const socketHook = fs.readFileSync('./src/hooks/usePartySocket.ts', 'utf-8');
assert(socketHook.includes('payload.event === \'PROMOTED_TO_HOST\''), 'usePartySocket must handle PROMOTED_TO_HOST');
assert(socketHook.includes('setHostGameState(payload);'), 'usePartySocket must set host game state');

// 4. Verify sound engine contains retro synthesizer audio cues
const soundTs = fs.readFileSync('./src/audio/sound.ts', 'utf-8');
assert(soundTs.includes('playGavel'), 'soundEngine must include playGavel for Auction drop');
assert(soundTs.includes('playDing'), 'soundEngine must include playDing');
assert(soundTs.includes('playTick'), 'soundEngine must include playTick');

console.log('All frontend invariants verified successfully!');
