export interface AssetEntry {
    type: 'image' | 'audio' | 'font'
    url: string
    id: string
}

export interface InputBinding {
    action: string
    keys: string[]
}

export interface GameManifest {
    id: string
    title: string
    description: string
    version: string
    author?: string
    assets: AssetEntry[]
    inputMap: InputBinding[]
    maxPlayers: 1 | 2
    supportsHighScore: boolean
}

export type InputSnapshot = Record<string, boolean>

export interface BaseGame {
    readonly manifest: GameManifest

    // Lifecycle
    mount(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, assets: Record<string, any>): void
    destroy(): void

    // Tick
    update(delta: number, input: InputSnapshot): void
    draw(ctx: CanvasRenderingContext2D): void

    // Events
    onPause(): void
    onResume(): void
    onResize(width: number, height: number): void

    // State
    readonly currentScore: number
    readonly isGameOver: boolean
}
