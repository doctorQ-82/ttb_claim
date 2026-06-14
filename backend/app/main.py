"""FastAPI application entry point for the TTB policy booking service."""
from fastapi import FastAPI

from .config import get_settings
from .routers import auth, policy

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "OAuth2-protected service that books (reserves) policy numbers. "
        "Authenticate at /auth/token, then POST a quoteId + channel to "
        "/policies/book to receive a policy."
    ),
)

app.include_router(auth.router)
app.include_router(policy.router)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}
