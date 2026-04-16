from app.db.session import Base
from app.db.models.auth import User, RefreshToken
from app.db.models.game import Game, GameSession, Score

# All models must be imported here for Alembic to detect them automatically.
__all__ = ["Base", "User", "RefreshToken", "Game", "GameSession", "Score"]
