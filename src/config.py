from typing import Any, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_URL: Optional[str] = None
    
    # DB connection parameters (used if POSTGRES_URL is not set)
    POSTGRES_USER: str = "questionbank"
    POSTGRES_PASSWORD: str = "replace_me_with_strong_password"
    POSTGRES_DB: str = "questionbank"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TESTING: bool = False
    FORCE_HTTPS: bool = False
    TRUST_PROXY_HEADERS: bool = False
    CORS_ALLOW_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @model_validator(mode="before")
    @classmethod
    def assemble_postgres_url(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("POSTGRES_URL"):
                user = values.get("POSTGRES_USER", "questionbank")
                password = values.get("POSTGRES_PASSWORD", "replace_me_with_strong_password")
                host = values.get("POSTGRES_HOST", "localhost")
                port = values.get("POSTGRES_PORT", 5432)
                db = values.get("POSTGRES_DB", "questionbank")
                values["POSTGRES_URL"] = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"
        return values

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]
        if not origins:
            raise ValueError("CORS_ALLOW_ORIGINS must include at least one origin")
        if "*" in origins:
            raise ValueError("CORS wildcard is not allowed in this deployment profile")
        if self.FORCE_HTTPS:
            for origin in origins:
                if origin.startswith("http://") and "localhost" not in origin and "127.0.0.1" not in origin:
                    raise ValueError("Non-localhost CORS origins must use https when FORCE_HTTPS is enabled")
        return origins


settings = Settings()