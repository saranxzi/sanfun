import './style.css'
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
    // Dedicated Sanfun Party Lounge Portal
    const partyGames = [
        { id: "mafia", icon: "🕵️", title: "MAFIA", tagline: "Trust No One. Deceive Everyone.", players: "4-16 Players" },
        { id: "imposter", icon: "🦎", title: "FIND THE IMPOSTER", tagline: "Blend In. Guess the Secret Word.", players: "3-16 Players" },
        { id: "witclash", icon: "💥", title: "WITCLASH", tagline: "Hilarious Head-to-Head Joke Showdowns.", players: "3-16 Players" },
        { id: "trivia", icon: "⚡", title: "TRIVIA BLITZ", tagline: "Lightning Trivia & Streak Multipliers.", players: "1-16 Players" },
        { id: "doodledash", icon: "🎨", title: "DOODLEDASH", tagline: "Real-Time Drawing & Speed Guessing.", players: "2-16 Players" },
        { id: "mostlikely", icon: "👑", title: "MOST LIKELY TO", tagline: "Vote, Roast & Crown Your Friends.", players: "3-16 Players" },
        { id: "wordbomb", icon: "💣", title: "WORD BOMB", tagline: "Ticking Bomb Hot Potato Word Race.", players: "2-16 Players" },
    ];

    appEl.innerHTML = `
      <div class="background-3d">
        <div class="grid-plane"></div>
        <div class="glow-horizon"></div>
      </div>
      
      <div class="party-portal-wrapper">
        <div class="portal-container">
          <div class="portal-header">
            <span class="portal-tag">COUCH CO-OP & PARTY GAMING PLATFORM</span>
            <h1 class="portal-title">SANFUN PARTY</h1>
            <p class="portal-desc">Play hilarious party games on your TV using your friends' smartphones as controllers!</p>
          </div>

          <div class="portal-actions-grid">
            <!-- Host Card -->
            <div class="portal-card host-portal-card">
              <div class="card-badge">FOR TV / BIG SCREEN</div>
              <div class="card-icon">🖥️</div>
              <h2>HOST A PARTY</h2>
              <p>Create a game room on the big screen. A room code and QR code will be generated for your friends to join.</p>
              <button class="btn-portal host" id="btn-host-lounge">
                START PARTY LOUNGE
              </button>
            </div>

            <!-- Join Card -->
            <div class="portal-card join-portal-card">
              <div class="card-badge">FOR SMARTPHONE / CONTROLLER</div>
              <div class="card-icon">📱</div>
              <h2>JOIN WITH CODE</h2>
              <div class="join-quick-form">
                <input type="text" id="quick-room-code" maxlength="4" placeholder="ROOM CODE (e.g. ABCD)" class="input-code" autocomplete="off" />
                <input type="text" id="quick-nickname" maxlength="16" placeholder="YOUR NICKNAME" class="input-nick" autocomplete="off" />
                <button class="btn-portal join" id="btn-quick-join">
                  ENTER PARTY
                </button>
              </div>
            </div>
          </div>

          <!-- Featured Games Showcase -->
          <div class="collection-divider">
            <span>7 COUCH CO-OP PARTY GAMES INCLUDED</span>
          </div>

          <div class="portal-games-grid">
            ${partyGames.map(g => `
              <div class="portal-game-card">
                <div class="portal-game-icon">${g.icon}</div>
                <h3>${g.title}</h3>
                <p class="portal-game-tagline">"${g.tagline}"</p>
                <span class="portal-game-players">${g.players}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-host-lounge')?.addEventListener('click', () => {
        window.location.href = `${window.location.pathname}?party=host`;
    });

    const handleJoin = () => {
        const code = (document.getElementById('quick-room-code') as HTMLInputElement)?.value.trim().toUpperCase();
        const nick = (document.getElementById('quick-nickname') as HTMLInputElement)?.value.trim();
        if (code.length === 4 && nick) {
            localStorage.setItem("sanfun_player_nick", nick);
            window.location.href = `${window.location.pathname}?join=${code}`;
        } else {
            alert("Please enter a 4-letter room code and your nickname.");
        }
    };

    document.getElementById('btn-quick-join')?.addEventListener('click', handleJoin);
    document.getElementById('quick-nickname')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleJoin();
    });
}
