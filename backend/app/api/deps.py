from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from app.core.config import settings
from app.db.session import get_db
from app.db.repos.auth import AuthRepository
from app.db.models.auth import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_auth_repo(db: AsyncSession = Depends(get_db)) -> AuthRepository:
    return AuthRepository(db)

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    repo: Annotated[AuthRepository, Depends(get_auth_repo)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await repo.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user
