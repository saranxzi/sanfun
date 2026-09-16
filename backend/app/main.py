import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.api.routes import party
from app.party.manager import room_manager

limiter = Limiter(key_func=get_remote_address, storage_uri="memory://", default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background tick loop for party game phase timers
    tick_task = asyncio.create_task(room_manager.run_tick_loop())
    yield
    tick_task.cancel()


app = FastAPI(title="Sanfun Arcade Engine", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

app.include_router(party.router, prefix="/api/party", tags=["party"])


@app.get("/health")
@limiter.limit("20/minute")
async def health_check(request: Request):
    return {"status": "ok"}


# Serve static frontend dist if built
candidate_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/dist")),
    os.path.abspath(os.path.join(os.getcwd(), "../frontend/dist")),
    os.path.abspath(os.path.join(os.getcwd(), "frontend/dist")),
]
dist_path = next((p for p in candidate_paths if os.path.isdir(p)), None)

if dist_path:
    assets_dir = os.path.join(dist_path, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(dist_path, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))


