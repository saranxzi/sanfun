import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const GLITCH_MANIFEST: GameManifest = {
    id: "glitch",
    title: "Glitch Dodge",
    description: "Avoid the falling glitch blocks. It gets crazy.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "LEFT", keys: ["KeyA", "ArrowLeft"] },
        { action: "RIGHT", keys: ["KeyD", "ArrowRight"] }
    ],
    maxPlayers: 1,
    supportsHighScore: true
}

interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    speed: number;
    color: string;
}

export class GlitchDodgeGame implements BaseGame {
    public readonly manifest = GLITCH_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    // Player
    private playerX = 400;
    private readonly playerY = 550;
    private readonly playerW = 30;
    private readonly playerH = 30;
    private readonly PLAYER_SPEED = 0.6;

    // Obstacles
    private obstacles: Obstacle[] = [];
    private spawnTimer = 0;
    private spawnInterval = 1000;

    public currentScore = 0;
    public isGameOver = false;
    private shakeTimer = 0;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.reset();
    }

    private reset() {
        this.playerX = this.canvasWidth / 2;
        this.obstacles = [];
        this.currentScore = 0;
        this.isGameOver = false;
        this.spawnTimer = 0;
        this.spawnInterval = 1000;
    }

    destroy(): void {}

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) {
            if (input["Space"] || input["Enter"]) this.reset();
            return;
        }

        // Movement
        if (input["KeyA"] || input["ArrowLeft"]) this.playerX -= this.PLAYER_SPEED * delta;
        if (input["KeyD"] || input["ArrowRight"]) this.playerX += this.PLAYER_SPEED * delta;
        this.playerX = Math.max(0, Math.min(this.canvasWidth - this.playerW, this.playerX));

        // Spawning
        this.spawnTimer += delta;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnInterval = Math.max(200, this.spawnInterval - 5);
            this.spawnObstacle();
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += obs.speed * delta;

            // Collision
            if (
                this.playerX < obs.x + obs.w &&
                this.playerX + this.playerW > obs.x &&
                this.playerY < obs.y + obs.h &&
                this.playerY + this.playerH > obs.y
            ) {
                this.isGameOver = true;
                this.shakeTimer = 500;
            }

            // Remove off-screen
            if (obs.y > this.canvasHeight) {
                this.obstacles.splice(i, 1);
                this.currentScore += 1;
            }
        }

        if (this.shakeTimer > 0) this.shakeTimer -= delta;
    }

    private spawnObstacle() {
        const w = 20 + Math.random() * 60;
        this.obstacles.push({
            x: Math.random() * (this.canvasWidth - w),
            y: -100,
            w: w,
            h: 20 + Math.random() * 20,
            speed: 0.2 + Math.random() * 0.4,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Shaky effect on hit or just high score
        if (this.shakeTimer > 0) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw Player
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillRect(this.playerX, this.playerY, this.playerW, this.playerH);

        // Draw Obstacles
        this.obstacles.forEach(obs => {
            ctx.fillStyle = obs.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = obs.color;
            
            // Random glitch offsets
            const gox = (Math.random() - 0.5) * (this.currentScore / 50);
            const goy = (Math.random() - 0.5) * (this.currentScore / 50);
            
            ctx.fillRect(obs.x + gox, obs.y + goy, obs.w, obs.h);
        });

        // UI
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText(`SCORE: ${this.currentScore}`, 20, 40);

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '60px monospace';
            ctx.fillText('GLITCHED', this.canvasWidth/2, this.canvasHeight/2);
            ctx.font = '20px monospace';
            ctx.fillText('Press SPACE to retry', this.canvasWidth/2, this.canvasHeight/2 + 60);
            ctx.textAlign = 'start';
        }

        if (this.shakeTimer > 0) ctx.restore();
    }

    onPause(): void {}
    onResume(): void {}
    onResize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
