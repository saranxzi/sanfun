import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const ORBITAL_MANIFEST: GameManifest = {
    id: "orbital",
    title: "Orbital Jump",
    description: "Jump between rotating orbits. Timing is everything.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "JUMP", keys: ["Space", "Enter", "KeyW", "ArrowUp"] }
    ],
    maxPlayers: 1,
    supportsHighScore: true
}

interface Orbit {
    radius: number;
    angle: number;
    speed: number;
}

export class OrbitalJumpGame implements BaseGame {
    public readonly manifest = ORBITAL_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    // Game state
    private orbits: Orbit[] = [];
    private currentOrbitIndex = 0;
    private playerAngle = 0;
    private isJumping = false;
    private jumpProgress = 0;

    public currentScore = 0;
    public isGameOver = false;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.reset();
    }

    private reset() {
        this.orbits = [];
        for (let i = 0; i < 6; i++) {
            this.orbits.push({
                radius: 50 + i * 80,
                angle: Math.random() * Math.PI * 2,
                speed: (0.001 + Math.random() * 0.002) * (i % 2 === 0 ? 1 : -1)
            });
        }
        this.currentOrbitIndex = 0;
        this.playerAngle = 0;
        this.isJumping = false;
        this.jumpProgress = 0;
        this.currentScore = 0;
        this.isGameOver = false;
    }

    destroy(): void {}

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) {
            if (input["Space"] || input["Enter"]) this.reset();
            return;
        }

        // Rotate orbits
        this.orbits.forEach(o => {
            o.angle += o.speed * delta;
        });

        if (!this.isJumping) {
            // Player rotates with current orbit
            this.playerAngle += this.orbits[this.currentOrbitIndex].speed * delta;
            
            if (input["Space"] || input["Enter"] || input["ArrowUp"] || input["KeyW"]) {
                if (this.currentOrbitIndex < this.orbits.length - 1) {
                    this.isJumping = true;
                    this.jumpProgress = 0;
                }
            }
        } else {
            // Jumping logic
            this.jumpProgress += 0.005 * delta;
            if (this.jumpProgress >= 1) {
                this.isJumping = false;
                this.jumpProgress = 0;
                this.currentOrbitIndex++;
                this.currentScore += 10;
                
                // If we reached the end, maybe loop or just celebrate
                if (this.currentOrbitIndex >= this.orbits.length - 1) {
                    // Start over with harder speeds
                    this.currentOrbitIndex = 0;
                    this.orbits.forEach(o => o.speed *= 1.2);
                }
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        // Draw Orbits
        this.orbits.forEach((o, i) => {
            ctx.beginPath();
            ctx.arc(centerX, centerY, o.radius, 0, Math.PI * 2);
            ctx.strokeStyle = i === this.currentOrbitIndex ? '#00ffff' : '#222244';
            ctx.lineWidth = i === this.currentOrbitIndex ? 2 : 1;
            ctx.stroke();
        });

        // Player Position
        let px, py;
        if (!this.isJumping) {
            const r = this.orbits[this.currentOrbitIndex].radius;
            px = centerX + Math.cos(this.playerAngle) * r;
            py = centerY + Math.sin(this.playerAngle) * r;
        } else {
            const rStart = this.orbits[this.currentOrbitIndex].radius;
            const rEnd = this.orbits[this.currentOrbitIndex + 1].radius;
            const r = rStart + (rEnd - rStart) * this.jumpProgress;
            px = centerX + Math.cos(this.playerAngle) * r;
            py = centerY + Math.sin(this.playerAngle) * r;
        }

        // Draw Player
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // UI
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText(`SCORE: ${this.currentScore}`, 20, 30);
        ctx.textAlign = 'center';
        ctx.fillText('SPACE TO JUMP', centerX, this.canvasHeight - 30);
        ctx.textAlign = 'start';
    }

    onPause(): void {}
    onResume(): void {}
    onResize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
}
