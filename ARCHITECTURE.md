# System Architecture

## Security and Authentication
1. **JWT**: Implementation via `python-jose`. Uses 15-minute access tokens and rotating refresh tokens via `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
2. **Rate Limiting**: Used `slowapi` backed by pseudo-Redis for endpoints.
3. **Score Anti-cheat**: Session duration is explicitly stored on the server. Validations check whether the submitted score is theoretically possible based on runtime and maximum bounds per game.

## Backend Layout
Strictly segmented:
- `/api/`: Endpoint definitions (auth, games, presence WS).
- `/core/`: Settings (Pydantic BaseSettings) and utility config.
- `/db/`: Models, Repositories (data-access layer), and Connection Setup (Alembic).
- `/schemas/`: Strict Pydantic models carrying business logic validators.
- `/services/`: Business rules that consume repositories.

## Frontend Canvas Engine
1. **ArcadeEngine Loop**: A single `requestAnimationFrame` loop.
2. **InputSnapshot**: Collects keyboard state, passes delta time and immutable input state to games for deterministic updates.
3. **BaseGame Interface**: Every game implements `mount()`, `destroy()`, `update()`, `draw()`. Games do not access DOM events themselves.

## Roadmap to WASM and Redis
A real Redis instance will be substituted in the future for cache and WebSocket presence queues, and WASM will be integrated when rendering or pathfinding math becomes a proven bottleneck.
