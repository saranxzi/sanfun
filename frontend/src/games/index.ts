import { PongGame } from './PongGame';
import { SnakeGame } from './SnakeGame';
import { GlitchDodgeGame } from './GlitchDodgeGame';
import { OrbitalJumpGame } from './OrbitalJumpGame';
import { FlappyDerpGame } from './FlappyDerpGame';
import { ChaosInvadersGame } from './ChaosInvadersGame';
import type { BaseGame } from './BaseGame';

// We'll add new games here as we build them
export const GAME_REGISTRY: Record<string, new () => BaseGame> = {
    'pong': PongGame,
    'snake': SnakeGame,
    'glitch': GlitchDodgeGame,
    'orbital': OrbitalJumpGame,
    'flappy': FlappyDerpGame,
    'chaos': ChaosInvadersGame
};



export const getGameById = (id: string): BaseGame | null => {
    const GameClass = GAME_REGISTRY[id];
    return GameClass ? new GameClass() : null;
};
