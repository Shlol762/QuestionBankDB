from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TESTING: bool = False
    FORCE_HTTPS: bool = False
    TRUST_PROXY_HEADERS: bool = False
    CORS_ALLOW_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

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