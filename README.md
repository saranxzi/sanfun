# Sanfun Arcade & Couch Co-Op Party Games

Sanfun is a high-performance web arcade and couch party game platform. It allows you to host multiplayer party games on your PC or TV (Jackbox-style) while your friends join using their smartphones as controllers—requiring zero installation.

---

## 🎮 Party Games Included

1. **🕵️ Mafia (Social Deduction)**
   - Roles: Mafia, Doctor, Detective, Villagers.
   - Synchronized secret night actions, Doctor heals, Detective private investigations, and public day trials with voting.
2. **🦎 Find the Imposter (Chameleon/Spyfall)**
   - Everyone gets the category and secret word, except the Imposter!
   - Give clues, catch the bluffer, and watch out for the Imposter's clutch 15-second guess for a steal win!
3. **🎭 WitClash (Quiplash-style Comedy Battle)**
   - Head-to-head comedic prompt showdowns.
   - Anonymous prompt displays on the big screen with group voting and Double WitClash sweep bonuses!
4. **⚡ Trivia Blitz**
   - High-energy rapid trivia across Gaming, Pop Culture, History, and Science.
   - 4-shape colorful smartphone buzzers with speed bonuses and streak multipliers.
5. **🎨 DoodleDash (Draw & Guess)**
   - Real-time touch drawing canvas synchronized to the big screen with instant fuzzy-match guessing.

---

## 🚀 Quick Start (Local Couch Co-Op)

### Option A: 1-Click Launch (Windows)
Double-click `start_party.bat` (or run `./start_party.ps1`).
1. Compiles the frontend.
2. Launches the unified FastAPI server on port `8000`.
3. Opens the Big Screen Host display automatically.
4. Auto-detects your local LAN IP (e.g. `192.168.1.45`) and displays a QR code on the TV for friends to scan on their phones!

### Option B: Docker Container
```bash
docker compose up --build
```
Open `http://localhost:8000?party=host` in your browser.

### Option C: Remote Friends Across the Internet (Zero Port Forwarding)
To play with remote friends without configuring your home router:
```bash
docker compose --profile tunnel up
```
This spins up a secure, encrypted Cloudflare Tunnel with an instant public `https://...trycloudflare.com` URL that displays on your Host screen QR code!

---

## 🧪 Running Tests

```bash
cd backend
.\venv\Scripts\python -m pytest tests/test_party.py -v
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for design philosophy and WebSocket security invariants.

