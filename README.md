# Sanfun

Sanfun is a fast, handcrafted web arcade engine built with a strict separation of concerns, providing a highly-performant TypeScript frontend engine and a robust FastAPI backend.

## Structure

- `/backend`: A FastAPI REST and WebSocket API. Uses SQLAlchemy (async) against SQLite (soon Postgres) for state, and JWT with HttpOnly refresh cookies for Auth. Redis is mock-simulated for presence and rate-limiting during development.
- `/frontend`: A Vite-powered TypeScript Canvas implementation. Features a strict `ArcadeEngine` loop and deterministic `BaseGame` interface.

## Prerequisites
- Node.js (v18+)
- Python 3.10+
- poetry or pipenv for python environment

See `ARCHITECTURE.md` for design philosophy and details.
