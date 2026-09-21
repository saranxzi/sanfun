# Sanfun

Self-hosted couch co-op party game platform hosted on your PC with smartphones as controllers.

## Running

### Windows
Run `start_party.bat` or `./start_party.ps1`.

### Docker
```bash
docker compose up --build
```

The host screen runs at `http://localhost:8000?party=host`. Players join by scanning the on-screen QR code or opening the room link on their phone.

## Games
- Mafia (social deduction)
- Find the Imposter (word deduction)
- WitClash (comedy prompt battle)
- Trivia Blitz (speed quiz)
- DoodleDash (draw and guess)
- Most Likely To (friend superlatives)
- Word Bomb (rapid-fire word chain)

## Tests
```bash
cd backend
pytest
```

