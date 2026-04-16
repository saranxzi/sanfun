import type { BaseGame, GameManifest, InputSnapshot } from './BaseGame';

export const SNAKE_MANIFEST: GameManifest = {
    id: "snake",
    title: "Neon Snake",
    description: "Classic snake with a neon glow and derpy physics.",
    version: "1.0.0",
    assets: [],
    inputMap: [
        { action: "UP", keys: ["KeyW", "ArrowUp"] },
        { action: "DOWN", keys: ["KeyS", "ArrowDown"] },
        { action: "LEFT", keys: ["KeyA", "ArrowLeft"] },
        { action: "RIGHT", keys: ["KeyD", "ArrowRight"] }
    ],
    maxPlayers: 1,
    supportsHighScore: true
}

export class SnakeGame implements BaseGame {
    public readonly manifest = SNAKE_MANIFEST;
    private canvasWidth = 800;
    private canvasHeight = 600;

    // Grid config
    private GRID_SIZE = 20;
    private cols = 0;
    private rows = 0;

    // Game state
    private snake: {x: number, y: number}[] = [];
    private direction: {x: number, y: number} = {x: 1, y: 0};
    private nextDirection: {x: number, y: number} = {x: 1, y: 0};
    private food: {x: number, y: number} = {x: 5, y: 5};
    
    private moveAccumulator = 0;
    private MOVE_INTERVAL = 150; // ms per move
    
    public currentScore = 0;
    public isGameOver = false;

    mount(_canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D, _assets: Record<string, any>): void {
        this.reset();
    }

    private reset() {
        this.cols = Math.floor(this.canvasWidth / this.GRID_SIZE);
        this.rows = Math.floor(this.canvasHeight / this.GRID_SIZE);
        this.snake = [
            { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) },
            { x: Math.floor(this.cols / 2) - 1, y: Math.floor(this.rows / 2) },
            { x: Math.floor(this.cols / 2) - 2, y: Math.floor(this.rows / 2) }
        ];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.spawnFood();
        this.currentScore = 0;
        this.isGameOver = false;
        this.moveAccumulator = 0;
    }

    private spawnFood() {
        this.food = {
            x: Math.floor(Math.random() * this.cols),
            y: Math.floor(Math.random() * this.rows)
        };
    }

    destroy(): void {}

    update(delta: number, input: InputSnapshot): void {
        if (this.isGameOver) {
            if (input["Space"] || input["Enter"]) this.reset();
            return;
        }

        // Input buffering
        if ((input["KeyW"] || input["ArrowUp"]) && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
        if ((input["KeyS"] || input["ArrowDown"]) && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
        if ((input["KeyA"] || input["ArrowLeft"]) && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
        if ((input["KeyD"] || input["ArrowRight"]) && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };

        this.moveAccumulator += delta;
        if (this.moveAccumulator >= this.MOVE_INTERVAL) {
            this.moveAccumulator -= this.MOVE_INTERVAL;
            this.step();
        }
    }

    private step() {
        this.direction = { ...this.nextDirection };
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        // Wall collision
        if (head.x < 0 || head.x >= this.cols || head.y < 0 || head.y >= this.rows) {
            this.isGameOver = true;
            return;
        }

        // Self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.isGameOver = true;
            return;
        }

        this.snake.unshift(head);

        // Food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.currentScore += 10;
            this.spawnFood();
            // Speed up slightly
            this.MOVE_INTERVAL = Math.max(50, this.MOVE_INTERVAL - 2);
        } else {
            this.snake.pop();
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Draw Food (pulse effect)
        const pulse = Math.sin(Date.now() / 100) * 2;
        ctx.fillStyle = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00ff';
        ctx.fillRect(
            this.food.x * this.GRID_SIZE + 2 - pulse/2, 
            this.food.y * this.GRID_SIZE + 2 - pulse/2, 
            this.GRID_SIZE - 4 + pulse, 
            this.GRID_SIZE - 4 + pulse
        );

        // Draw Snake
        this.snake.forEach((segment, i) => {
            const isHead = i === 0;
            ctx.fillStyle = isHead ? '#00ffff' : '#008888';
            ctx.shadowBlur = isHead ? 20 : 5;
            ctx.shadowColor = isHead ? '#00ffff' : '#008888';
            
            // Derpy wobble for head
            let ox = 0, oy = 0;
            if (isHead) {
                ox = Math.sin(Date.now() / 50) * 2;
                oy = Math.cos(Date.now() / 50) * 2;
            }

            ctx.fillRect(
                segment.x * this.GRID_SIZE + 1 + ox, 
                segment.y * this.GRID_SIZE + 1 + oy, 
                this.GRID_SIZE - 2, 
                this.GRID_SIZE - 2
            );
        });

        // UI
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Courier New"';
        ctx.fillText(`SCORE: ${this.currentScore}`, 20, 30);

        if (this.isGameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctx.fillStyle = '#ff0000';
            ctx.font = '50px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvasWidth/2, this.canvasHeight/2);
            ctx.font = '20px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText('Press SPACE to Restart', this.canvasWidth/2, this.canvasHeight/2 + 50);
            ctx.textAlign = 'start';
        }
    }

    onPause(): void {}
    onResume(): void {}
    onResize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.cols = Math.floor(width / this.GRID_SIZE);
        this.rows = Math.floor(height / this.GRID_SIZE);
    }
}
