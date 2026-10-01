import logging
import secrets
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings, read from environment variables or a `.env` file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Internal database: users, API keys, data sources, API definitions, call logs
    database_url: str = "sqlite:///./data/app.db"

    # Used to sign JWTs. When unset a random key is generated, which logs everyone out on restart.
    secret_key: str = ""
    access_token_expire_minutes: int = 60 * 12

    # Created on first start when the users table is empty.
    admin_username: str = "admin"
    admin_password: str = ""

    allow_registration: bool = False
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # Directory of the built React app; served at / when it exists.
    frontend_dist: str = "../frontend/dist"

    def model_post_init(self, __context) -> None:
        if not self.secret_key:
            logger.warning("SECRET_KEY is not set; generated a temporary one for this process")
            self.secret_key = secrets.token_urlsafe(48)


@lru_cache
def get_settings() -> Settings:
    return Settings()
