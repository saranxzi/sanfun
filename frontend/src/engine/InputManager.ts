import type { InputSnapshot } from '../games/BaseGame';

export class InputManager {
    private keys: Record<string, boolean> = {};

    constructor() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        this.keys[e.code] = true;
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        this.keys[e.code] = false;
    }

    public getSnapshot(): InputSnapshot {
        // Return an immutable copy of the state
        return { ...this.keys };
    }

    public destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}
