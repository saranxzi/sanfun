import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'
import { GAME_REGISTRY, getGameById } from './games/index'

// Initialize game instances to get manifests for the menu
const gamesMetadata = Object.keys(GAME_REGISTRY).map(id => {
    const instance = getGameById(id);
    return instance?.manifest;
}).filter(Boolean);

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="background-3d">
    <div class="grid-plane"></div>
    <div class="glow-horizon"></div>
  </div>
  
  <div class="arcade-wrapper">
    <div id="ui-overlay">
      <div class="menu">
        <div class="title-container">
            <h1>SANFUN ARCADE</h1>
        </div>
        
        <div class="game-grid">
          ${gamesMetadata.map(m => `
            <div class="game-card" data-game="${m?.id}">
              <h2>${m?.title.toUpperCase()}</h2>
              <p>${m?.description}</p>
              <button class="play-btn">COIN START</button>
            </div>
          `).join('')}
        </div>
        
        <p class="hint">ESC: RETURN TO COLLECTION | WASD/ARROWS: MOVE | SPACE: ACTION</p>
      </div>
    </div>

    <div class="arcade-container" id="arcade-container" style="display: none;">
      <div class="scanlines"></div>
      <canvas id="game-canvas"></canvas>
    </div>
  </div>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const engine = new ArcadeEngine(canvas)
const overlay = document.getElementById('ui-overlay')!;
const cabinet = document.getElementById('arcade-container')!;

const loadGame = (id: string) => {
    const game = getGameById(id);
    if (game) {
        engine.loadGame(game, {});
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            cabinet.style.display = 'flex';
            engine.start();
        }, 500);
    }
}

document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLDivElement).dataset.game;
        if (id) loadGame(id);
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        engine.stop();
        cabinet.style.display = 'none';
        overlay.style.display = 'flex';
        setTimeout(() => overlay.style.opacity = '1', 10);
    }
});

