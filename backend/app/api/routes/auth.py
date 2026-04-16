import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import UserCreate, TokenResponse, UserResponse
from app.db.repos.auth import AuthRepository
from app.api.deps import get_auth_repo, get_current_user
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.db.models.auth import User

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, repo: AuthRepository = Depends(get_auth_repo)):
    existing = await repo.get_user_by_username(user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    user = await repo.create_user(user_in.username, user_in.password)
    return user

@router.post("/login", response_model=TokenResponse)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    repo: AuthRepository = Depends(get_auth_repo)
):
    user = await repo.get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Generate Refresh Token
    refresh_plain = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await repo.store_refresh_token(user.id, refresh_plain, expires_at)

    # Set HttpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_plain,
        httponly=True,
        secure=False, # Use False for local dev without HTTPS
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    repo: AuthRepository = Depends(get_auth_repo)
):
    old_refresh = request.cookies.get("refresh_token")
    if not old_refresh:
        raise HTTPException(status_code=401, detail="No refresh token found")

    token_record = await repo.get_valid_refresh_token(old_refresh)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Rotate refresh token (revoke old)
    await repo.revoke_refresh_token(old_refresh)

    # Issue new
    user = await repo.get_user_by_id(token_record.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    access_token = create_access_token(data={"sub": str(user.id)})
    
    new_refresh_plain = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    await repo.store_refresh_token(user.id, new_refresh_plain, expires_at)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_plain,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
