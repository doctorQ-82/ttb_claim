"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings for the policy booking service.

    Values can be overridden via environment variables or a `.env` file.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TTB Policy Booking Service"
    app_version: str = "1.0.0"

    # OAuth2 / JWT settings
    secret_key: str = "CHANGE_ME_IN_PRODUCTION_super_secret_key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Prefix used when generating policy numbers
    policy_prefix: str = "TTB"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
