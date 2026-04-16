from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from datetime import datetime, timezone

from app.db.models.auth import User, RefreshToken
from app.core.security import get_password_hash, hash_refresh_token

class AuthRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalars().first()
    
    async def get_user_by_id(self, user_id: str) -> User | None:
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_user(self, username: str, password: str) -> User:
        user = User(
            username=username,
            password_hash=get_password_hash(password)
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def store_refresh_token(self, user_id: str, plain_token: str, expires_at: datetime) -> RefreshToken:
        token_hash = hash_refresh_token(plain_token)
        new_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        self.session.add(new_token)
        await self.session.commit()
        return new_token

    async def get_valid_refresh_token(self, plain_token: str) -> RefreshToken | None:
        token_hash = hash_refresh_token(plain_token)
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def revoke_refresh_token(self, plain_token: str):
        token_hash = hash_refresh_token(plain_token)
        stmt = update(RefreshToken).where(RefreshToken.token_hash == token_hash).values(revoked=True)
        await self.session.execute(stmt)
        await self.session.commit()
