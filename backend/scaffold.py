import os

dirs = [
    "app/api/routes",
    "app/core",
    "app/db/models",
    "app/db/repos",
    "app/schemas",
    "app/services"
]

for d in dirs:
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "__init__.py"), "w") as f:
        pass

with open("app/__init__.py", "w") as f:
    pass
with open("app/main.py", "w") as f:
    f.write('''from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(title="Sanfun Arcade Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
''')

with open("app/api/routes/__init__.py", "w") as f:
    f.write('''from fastapi import APIRouter

router = APIRouter()
''')

with open("app/core/config.py", "w") as f:
    f.write('''from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "DEV_SECRET_KEY_PLEASE_CHANGE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite+aiosqlite:///./sanfun.db"

    class Config:
        env_file = ".env"

settings = Settings()
''')

with open("app/db/session.py", "w") as f:
    f.write('''from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
''')

print("Backend scaffolding generated.")
