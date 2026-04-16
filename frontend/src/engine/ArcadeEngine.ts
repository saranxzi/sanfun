import type { BaseGame } from '../games/BaseGame';
import { InputManager } from './InputManager';

export class ArcadeEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private inputManager: InputManager;
    private currentGame: BaseGame | null = null;
    
    private animationFrameId: number | null = null;
    private lastTime: number = 0;
    private isRunning: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");
        this.ctx = ctx;
        this.inputManager = new InputManager();

        this.handleResize();
        window.addEventListener('resize', this.handleResize);
    }

    private handleResize = () => {
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = window.innerWidth;
        const logicalHeight = window.innerHeight;
        
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        this.canvas.style.width = `${logicalWidth}px`;
        this.canvas.style.height = `${logicalHeight}px`;

        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        if (this.currentGame) {
            this.currentGame.onResize(logicalWidth, logicalHeight);
        }
    }

    public loadGame(game: BaseGame, assets: Record<string, any>) {
        if (this.currentGame) {
            this.currentGame.destroy();
        }
        this.currentGame = game;
        this.currentGame.mount(this.canvas, this.ctx, assets);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.tick(this.lastTime);
    }

    public stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public destroy() {
        this.stop();
        this.inputManager.destroy();
        window.removeEventListener('resize', this.handleResize);
        if (this.currentGame) {
            this.currentGame.destroy();
        }
    }

    private tick = (currentTime: number) => {
        if (!this.isRunning) return;

        let delta = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta to prevent spiral of death
        if (delta > 100) delta = 100;

        try {
            const logicalWidth = window.innerWidth;
            const logicalHeight = window.innerHeight;
            
            // Clear screen
            this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);

            if (this.currentGame) {
                const inputSnapshot = this.inputManager.getSnapshot();
                this.currentGame.update(delta, inputSnapshot);
                this.currentGame.draw(this.ctx);
            }
        } catch (e) {
            console.error("Game loop crashed", e);
            this.stop();
            if (this.currentGame) {
                this.currentGame.destroy();
                this.currentGame = null;
            }
            // Draw error screen
            this.ctx.fillStyle = 'red';
            this.ctx.font = '24px monospace';
            this.ctx.fillText('Engine Error', 50, 50);
        }

        this.animationFrameId = requestAnimationFrame(this.tick);
    }
}
