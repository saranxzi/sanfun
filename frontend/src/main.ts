import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="arcade-container">
    <canvas id="game-canvas"></canvas>
  </div>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const engine = new ArcadeEngine(canvas)
engine.start()
