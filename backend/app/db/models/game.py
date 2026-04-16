import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from app.db.session import Base

def gen_uuid():
    return str(uuid.uuid4())

def get_utc_now():
    return datetime.now(timezone.utc)

class Game(Base):
    __tablename__ = "games"
    
    id = Column(String, primary_key=True, default=gen_uuid)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    version = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

class GameSession(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), default=get_utc_now)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_s = Column(Integer, nullable=True)

class Score(Base):
    __tablename__ = "scores"
    
    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    game_id = Column(String, ForeignKey("games.id"), nullable=False)
    value = Column(Integer, nullable=False)
    submitted_at = Column(DateTime(timezone=True), default=get_utc_now)
    is_valid = Column(Boolean, default=True)
