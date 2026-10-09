# Sanfun Arcade

Self-hosted couch co-op party game arcade hosted on your PC with smartphones as physical controllers.

## Architecture

- **Backend (`backend-spring/`):** Java 21 + Spring Boot 3.x, low-latency WebSockets, thread-safe session & party room management, 2Hz phase scheduler, Cloudflare edge tunnel supervisor, and LAN IP discovery.
- **Frontend (`frontend-react/`):** React 18+ / TypeScript / Vite, unified single-screen hub, Three Fiber 3D interactive totem, Framer Motion kinetic mechanics, Web Audio synthesizer, and tactile retro indie design system.

## Quick Start

### Windows (Spring Boot + React Engine)
Run `start_party_spring.bat` or `./start_party_spring.ps1`.

### Development Mode
```bash
# Terminal 1: React dev server
npm run dev:react

# Terminal 2: Spring Boot backend
npm run dev:spring
```

### Verification & Tests
```bash
# Backend unit & integration tests
npm run test:spring

# Frontend production build
npm run build:react
```

## Games (8 Party Games)
1. **Mafia** — Social deduction syndicate battle with strict role-masking (Mafia, Doctor, Detective, Villagers).
2. **Find the Imposter** — Chameleon word deduction with speaking clue order and clutch guessing.
3. **Dialed** — Color hue memory recall (HSV 3D cone distance) and concert audio pitch tuning.
4. **Fermi Estimator** — Cosmic order-of-magnitude physics and world trivia puzzles.
5. **The Auction House** — Secret valuation bidding on fine art and historical oddities with swinging kinetic gavel.
6. **Draw a Perfect Circle** — Touchscreen freehand circle drawing with Pratt circularity evaluation and angular coverage validation.
7. **Absurd Dilemmas** — Moral trolley paradoxes with kinetic track switching and room consensus betting.
8. **Higher or Lower** — Global monthly search volume battles with streak multipliers.
