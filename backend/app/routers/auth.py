"""OAuth2 token endpoint."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from ..config import get_settings
from ..schemas import Token
from ..security import authenticate_user, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """Exchange username/password credentials for a JWT access token.

    Demo credentials: `agent01` / `secret` or `branch01` / `secret`.
    """
    user = authenticate_user(form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["username"], "scopes": user["scopes"]},
        expires_delta=expires,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(expires.total_seconds()),
    )
