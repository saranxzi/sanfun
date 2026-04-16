import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const CHAOS_MANIFEST: GameManifest = {
    id: "chaos",
    title: "Chaos Invaders",
    description: "Space invaders, but everyone is drunk.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "LEFT", keys: ["KeyA", "ArrowLeft"] },
        { action: "RIGHT", keys: ["KeyD", "ArrowRight"] },
        { action: "SHOOT", keys: ["Space", "Enter"] }
    ],
    maxPlayers: 1,
    supportsHighScore: true
}

interface Bullet {
    x: number;
    y: number;
}

interface Enemy {
    x: number;
    y: number;
    vx: number;
    vy: number;
    id: number;
}

export class ChaosInvadersGame implements BaseGame {
    public readonly manifest = CHAOS_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    private playerX = 400;
    private readonly playerY = 550;
    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];
    private shootCooldown = 0;

    public currentScore = 0;
    public isGameOver = false;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.reset();
    }

    private reset() {
        this.playerX = this.canvasWidth / 2;
        this.bullets = [];
        this.enemies = [];
        this.isGameOver = false;
        this.currentScore = 0;
        this.shootCooldown = 0;

        for (let i = 0; i < 20; i++) {
            this.enemies.push({
                x: Math.random() * this.canvasWidth,
                y: 50 + Math.random() * 200,
                vx: (Math.random() - 0.5) * 0.2,
                vy: Math.random() * 0.05,
                id: i
            });
        }
    }

    destroy(): void {}

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) {
            if (input["Space"] || input["Enter"]) this.reset();
            return;
        }

        if (input["KeyA"] || input["ArrowLeft"]) this.playerX -= 0.5 * delta;
        if (input["KeyD"] || input["ArrowRight"]) this.playerX += 0.5 * delta;
        this.playerX = Math.max(20, Math.min(this.canvasWidth - 20, this.playerX));

        if ((input["Space"] || input["Enter"]) && this.shootCooldown <= 0) {
            this.bullets.push({ x: this.playerX, y: this.playerY });
            this.shootCooldown = 300;
        }
        if (this.shootCooldown > 0) this.shootCooldown -= delta;

        // Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].y -= 0.6 * delta;
            if (this.bullets[i].y < 0) this.bullets.splice(i, 1);
        }

        // Enemies
        this.enemies.forEach(e => {
            e.x += e.vx * delta;
            e.y += e.vy * delta;

            // Wobble
            e.vx += (Math.random() - 0.5) * 0.02;
            e.vx = Math.max(-0.3, Math.min(0.3, e.vx));

            if (e.x < 0 || e.x > this.canvasWidth) e.vx *= -1;
            if (e.y > this.playerY) this.isGameOver = true;

            // Hit test
            this.bullets.forEach((b, bi) => {
                if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 20) {
                    this.bullets.splice(bi, 1);
                    e.y = -50;
                    e.x = Math.random() * this.canvasWidth;
                    this.currentScore += 10;
                }
            });
        });
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Player
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(this.playerX, this.playerY - 15);
        ctx.lineTo(this.playerX - 20, this.playerY + 15);
        ctx.lineTo(this.playerX + 20, this.playerY + 15);
        ctx.fill();

        // Bullets
        ctx.fillStyle = '#ffff00';
        this.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 10, 4, 10));

        // Enemies
        this.enemies.forEach(e => {
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillRect(e.x - 15, e.y - 15, 30, 30);
            
            // Derpy eyes
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(e.x - 8, e.y - 8, 4, 4);
            ctx.fillRect(e.x + 4, e.y - 8, 4, 4);
        });

        // UI
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f0';
        ctx.font = '20px monospace';
        ctx.fillText(`SCORE: ${this.currentScore}`, 20, 30);

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(255,0,0,0.5)';
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = '50px monospace';
            ctx.fillText('INVASION COMPLETE', this.canvasWidth/2, this.canvasHeight/2);
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
