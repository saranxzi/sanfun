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
from pathlib import Path
from fastapi import HTTPException
from app.api.routes import party
from app.party.manager import room_manager


def get_real_client_ip(request: Request) -> str:
    client_host = request.client.host if request.client else "127.0.0.1"
    if client_host == "127.0.0.1":
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip
    return client_host


limiter = Limiter(key_func=get_real_client_ip, storage_uri="memory://", default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background tick loop for party game phase timers
    tick_task = asyncio.create_task(room_manager.run_tick_loop())
    # Start Cloudflare edge tunnel in background (guarantees single instance & auto-reconnect)
    from app.party.network import tunnel_manager
    loop = asyncio.get_running_loop()
    tunnel_manager.start(loop=loop)
    yield
    tick_task.cancel()
    tunnel_manager.stop()


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
dist_path = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist")))

if dist_path.is_dir():
    assets_dir = dist_path / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(dist_path / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        candidate = (dist_path / full_path).resolve()
        if candidate.is_file() and candidate.is_relative_to(dist_path):
            return FileResponse(candidate)
        return FileResponse(dist_path / "index.html")



