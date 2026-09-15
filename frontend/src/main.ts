import './style.css'
import { ArcadeEngine } from './engine/ArcadeEngine'
import { GAME_REGISTRY, getGameById } from './games/index'
import { PartyApp } from './party/PartyApp'

const appEl = document.querySelector<HTMLDivElement>('#app')!;
const urlParams = new URLSearchParams(window.location.search);
const isPartyHost = urlParams.get('party') === 'host';
const joinCode = urlParams.get('join');
const isPlayer = urlParams.get('party') === 'player' || Boolean(joinCode);

if (isPartyHost || isPlayer) {
    const partyApp = new PartyApp(appEl);
    partyApp.init();
} else {
    // Render Arcade Collection + Couch Co-op Party Gateway
    const gamesMetadata = Object.keys(GAME_REGISTRY).map(id => {
        const instance = getGameById(id);
        return instance?.manifest;
    }).filter(Boolean);

    appEl.innerHTML = `
      <div class="background-3d">
        <div class="grid-plane"></div>
        <div class="glow-horizon"></div>
      </div>
      
      <div class="arcade-wrapper">
        <div id="ui-overlay">
          <div class="menu">
            <div class="title-container">
                <span class="arcade-subtitle">ARCADE & COUCH GAMING PLATFORM</span>
                <h1>SANFUN ARCADE</h1>
            </div>

            <!-- Party Couch Co-op Gateway Banner -->
            <div class="party-hero-banner">
                <div class="party-hero-header">
                    <span class="party-badge">COUCH CO-OP • NEW</span>
                    <h2>SANFUN PARTY LOUNGE</h2>
                </div>
                <p>Play <strong>Mafia</strong>, <strong>Find the Imposter</strong>, <strong>WitClash</strong>, <strong>Trivia Blitz</strong> & <strong>DoodleDash</strong> on the TV with your friends using their phones as controllers!</p>
                <div class="party-hero-buttons">
                    <button class="btn-party-hero host" id="btn-host-party">
                        🖥️ HOST PARTY (BIG SCREEN)
                    </button>
                    <button class="btn-party-hero join" id="btn-join-party">
                        📱 JOIN ON PHONE
                    </button>
                </div>
            </div>
            
            <div class="collection-divider">
                <span>SINGLE & LOCAL 2P ARCADE CLASSICS</span>
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
    `;

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const engine = new ArcadeEngine(canvas);
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
    };

    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLDivElement).dataset.game;
            if (id) loadGame(id);
        });
    });

    const hostBtn = document.getElementById('btn-host-party');
    if (hostBtn) {
        hostBtn.addEventListener('click', () => {
            window.location.href = `${window.location.pathname}?party=host`;
        });
    }

    const joinBtn = document.getElementById('btn-join-party');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            window.location.href = `${window.location.pathname}?party=player`;
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            engine.stop();
            cabinet.style.display = 'none';
            overlay.style.display = 'flex';
            setTimeout(() => overlay.style.opacity = '1', 10);
        }
    });
}


