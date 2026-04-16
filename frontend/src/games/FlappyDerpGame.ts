import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const FLAPPY_MANIFEST: GameManifest = {
    id: "flappy",
    title: "Flappy Derp",
    description: "Gravity is your enemy. Derp is your friend.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "FLAP", keys: ["Space", "Enter", "ArrowUp", "KeyW"] }
    ],
    maxPlayers: 1,
    supportsHighScore: true
}

interface Pipe {
    x: number;
    gapY: number;
    passed: boolean;
}

export class FlappyDerpGame implements BaseGame {
    public readonly manifest = FLAPPY_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    // Bird
    private birdY = 300;
    private birdVY = 0;
    private readonly BIRD_X = 150;
    private readonly GRAVITY = 0.0018;
    private readonly LIFT = -0.5;

    // Pipes
    private pipes: Pipe[] = [];
    private pipeTimer = 0;
    private readonly PIPE_SPAWN = 1500;
    private readonly PIPE_GAP = 160;
    private readonly PIPE_WIDTH = 60;

    public currentScore = 0;
    public isGameOver = false;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.reset();
    }

    private reset() {
        this.birdY = 300;
        this.birdVY = 0;
        this.pipes = [];
        this.pipeTimer = 0;
        this.currentScore = 0;
        this.isGameOver = false;
    }

    destroy(): void {}

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) {
            if (input["Space"] || input["Enter"]) this.reset();
            return;
        }

        // Input
        if (input["Space"] || input["Enter"] || input["ArrowUp"] || input["KeyW"]) {
            // We only flap once per press in a real engine, but for simplicity here 
            // the user can hold it or we can throttle. Let's just give a fixed lift.
            this.birdVY = this.LIFT;
        }

        // Physics
        this.birdVY += this.GRAVITY * delta;
        this.birdY += this.birdVY * delta;

        // Wall collision
        if (this.birdY < 0 || this.birdY > this.canvasHeight) {
            this.isGameOver = true;
        }

        // Pipes
        this.pipeTimer += delta;
        if (this.pipeTimer >= this.PIPE_SPAWN) {
            this.pipeTimer = 0;
            this.pipes.push({
                x: this.canvasWidth,
                gapY: 100 + Math.random() * (this.canvasHeight - 200 - this.PIPE_GAP),
                passed: false
            });
        }

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const p = this.pipes[i];
            p.x -= 0.2 * delta;

            // Collision
            if (
                this.BIRD_X + 20 > p.x && 
                this.BIRD_X - 20 < p.x + this.PIPE_WIDTH &&
                (this.birdY - 15 < p.gapY || this.birdY + 15 > p.gapY + this.PIPE_GAP)
            ) {
                this.isGameOver = true;
            }

            // Score
            if (!p.passed && p.x + this.PIPE_WIDTH < this.BIRD_X) {
                p.passed = true;
                this.currentScore += 1;
            }

            // Remove
            if (p.x < -this.PIPE_WIDTH) this.pipes.splice(i, 1);
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#110022';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw Pipes
        ctx.fillStyle = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff00';
        this.pipes.forEach(p => {
            // Top
            ctx.fillRect(p.x, 0, this.PIPE_WIDTH, p.gapY);
            // Bottom
            ctx.fillRect(p.x, p.gapY + this.PIPE_GAP, this.PIPE_WIDTH, this.canvasHeight - (p.gapY + this.PIPE_GAP));
        });

        // Draw Bird
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.BIRD_X, this.birdY, 15, 0, Math.PI * 2);
        ctx.fill();

        // Derpy Eye
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.BIRD_X + 8, this.birdY - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.BIRD_X + 10 + Math.sin(Date.now()/50)*2, this.birdY - 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = '30px monospace';
        ctx.fillText(this.currentScore.toString(), this.canvasWidth / 2, 50);

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = '50px monospace';
            ctx.fillText('DOINK!', this.canvasWidth/2, this.canvasHeight/2);
            ctx.font = '20px monospace';
            ctx.fillText('Press SPACE to try again', this.canvasWidth/2, this.canvasHeight/2 + 50);
            ctx.textAlign = 'start';
        }
    }

    onPause(): void {}
    onResume(): void {}
    onResize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
