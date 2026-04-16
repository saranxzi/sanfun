import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'
import { PongGame } from './games/PongGame'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="arcade-container">
    <canvas id="game-canvas"></canvas>
  </div>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const engine = new ArcadeEngine(canvas)
const pong = new PongGame()

// Wait until assets are theoretically loaded
engine.loadGame(pong, {})
engine.start()
