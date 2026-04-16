import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'
import { GAME_REGISTRY, getGameById } from './games/index'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="arcade-wrapper">
    <div id="ui-overlay">
      <div class="menu">
        <h1>SANFUN ARCADE</h1>
        <div class="game-list">
          ${Object.keys(GAME_REGISTRY).map(id => `
            <button class="game-btn" data-game="${id}">${id.toUpperCase()}</button>
          `).join('')}
        </div>
        <p class="hint">Controls: WASD/Arrows + Space/Enter</p>
      </div>
    </div>
    <div class="arcade-container">
      <canvas id="game-canvas"></canvas>
    </div>
  </div>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const engine = new ArcadeEngine(canvas)

const loadGame = (id: string) => {
    const game = getGameById(id);
    if (game) {
        engine.loadGame(game, {});
        document.getElementById('ui-overlay')!.style.display = 'none';
        engine.start();
    }
}

document.querySelectorAll('.game-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLButtonElement).dataset.game;
        if (id) loadGame(id);
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        engine.stop();
        document.getElementById('ui-overlay')!.style.display = 'flex';
    }
});

