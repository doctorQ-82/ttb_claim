"""OAuth2 password flow + JWT authentication utilities."""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings
from .schemas import TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl is the relative path clients POST credentials to.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


# --- Demo user store ---------------------------------------------------------
# In production this would be backed by a real identity provider / database.
# Default password for both demo users is "secret".
_DEMO_HASH = pwd_context.hash("secret")
FAKE_USERS_DB: dict[str, dict] = {
    "agent01": {"username": "agent01", "hashed_password": _DEMO_HASH, "scopes": ["policy:book"]},
    "branch01": {"username": "branch01", "hashed_password": _DEMO_HASH, "scopes": ["policy:book"]},
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def authenticate_user(username: str, password: str) -> dict | None:
    """Validate credentials and return the user record, or None on failure."""
    user = FAKE_USERS_DB.get(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Encode a signed JWT access token."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    """Decode and validate the bearer token, returning the authenticated user."""
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
        return TokenData(username=username, scopes=payload.get("scopes", []))
    except JWTError as exc:
        raise credentials_exception from exc


def require_scope(scope: str):
    """Dependency factory enforcing that the token carries a given scope."""

    async def checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if scope not in current_user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scope: {scope}",
            )
        return current_user

    return checker
