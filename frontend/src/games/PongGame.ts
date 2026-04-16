import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const PONG_MANIFEST: GameManifest = {
    id: "pong",
    title: "Classic Pong",
    description: "Two paddles, one ball.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "P1_UP", keys: ["KeyW"] },
        { action: "P1_DOWN", keys: ["KeyS"] },
        { action: "P2_UP", keys: ["ArrowUp"] },
        { action: "P2_DOWN", keys: ["ArrowDown"] }
    ],
    maxPlayers: 2,
    supportsHighScore: false
}

export class PongGame implements BaseGame {
    public readonly manifest = PONG_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    // Game State
    private p1Y = 250;
    private p2Y = 250;
    private readonly PADDLE_W = 15;
    private readonly PADDLE_H = 100;
    private readonly PADDLE_SPEED = 0.5; // pixels per ms

    private ballX = 400;
    private ballY = 300;
    private ballVX = 0.4;
    private ballVY = 0.3;
    private readonly BALL_SIZE = 10;

    public currentScore = 0;
    public isGameOver = false;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.p1Y = this.canvasHeight / 2 - this.PADDLE_H / 2;
        this.p2Y = this.canvasHeight / 2 - this.PADDLE_H / 2;
        this.ballX = this.canvasWidth / 2;
        this.ballY = this.canvasHeight / 2;
    }

    destroy(): void {
        // Clean up any strict internal listeners if any existed.
    }

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) return;

        // Player 1 Input
        if (input["KeyW"]) this.p1Y -= this.PADDLE_SPEED * delta;
        if (input["KeyS"]) this.p1Y += this.PADDLE_SPEED * delta;

        // Player 2 Input
        if (input["ArrowUp"]) this.p2Y -= this.PADDLE_SPEED * delta;
        if (input["ArrowDown"]) this.p2Y += this.PADDLE_SPEED * delta;

        // Clamp paddles
        this.p1Y = Math.max(0, Math.min(this.canvasHeight - this.PADDLE_H, this.p1Y));
        this.p2Y = Math.max(0, Math.min(this.canvasHeight - this.PADDLE_H, this.p2Y));

        // Move Ball
        this.ballX += this.ballVX * delta;
        this.ballY += this.ballVY * delta;

        // Bounce Floor/Ceil
        if (this.ballY <= 0 || this.ballY + this.BALL_SIZE >= this.canvasHeight) {
            this.ballVY *= -1;
            this.ballY = this.ballY <= 0 ? 0 : this.canvasHeight - this.BALL_SIZE;
        }

        // Paddle Collision
        if (this.ballX <= this.PADDLE_W && this.ballY + this.BALL_SIZE >= this.p1Y && this.ballY <= this.p1Y + this.PADDLE_H) {
            // P1 Hit
            this.ballVX = Math.abs(this.ballVX);
            this.ballX = this.PADDLE_W;
            this.ballVY += (Math.random() - 0.5) * 0.2; // Add some english
        }

        if (this.ballX + this.BALL_SIZE >= this.canvasWidth - this.PADDLE_W && this.ballY + this.BALL_SIZE >= this.p2Y && this.ballY <= this.p2Y + this.PADDLE_H) {
            // P2 Hit
            this.ballVX = -Math.abs(this.ballVX);
            this.ballX = this.canvasWidth - this.PADDLE_W - this.BALL_SIZE;
            this.ballVY += (Math.random() - 0.5) * 0.2;
        }

        // Score logic
        if (this.ballX < 0 || this.ballX > this.canvasWidth) {
            // Reset ball
            this.ballX = this.canvasWidth / 2;
            this.ballY = this.canvasHeight / 2;
            this.ballVX *= -1;
            this.ballVY = 0.3 * (Math.random() > 0.5 ? 1 : -1);
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // We draw assuming logical scale (800x600 mapping)
        // Engine handles the actual device pixel ratio scaling.
        
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Center dashed line
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.setLineDash([10, 15]);
        ctx.moveTo(this.canvasWidth / 2, 0);
        ctx.lineTo(this.canvasWidth / 2, this.canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Paddles
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, this.p1Y, this.PADDLE_W, this.PADDLE_H); // P1
        ctx.fillRect(this.canvasWidth - this.PADDLE_W, this.p2Y, this.PADDLE_W, this.PADDLE_H); // P2

        // Draw Ball
        ctx.fillRect(this.ballX, this.ballY, this.BALL_SIZE, this.BALL_SIZE);
    }

    onPause(): void {}
    onResume(): void {}
    onResize(width: number, height: number): void {
        // For Pong, we just scale the canvas or keep internal 800x600 resolution and let CSS stretch it.
        // The ArcadeEngine handles retina DPI. We'll simply let the boundaries act exactly as 800x600.
        // So we can assume `ctx.scale` in ArcadeEngine is already done.
        
        // Let's dynamically update internal bounds to match the actual window width
        this.canvasWidth = width;
        this.canvasHeight = height;

        // Keep ball bounded initially if it gets stuck
        if (this.ballX > width) this.ballX = width / 2;
        if (this.ballY > height) this.ballY = height / 2;
    }
}
