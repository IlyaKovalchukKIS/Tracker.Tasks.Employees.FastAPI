"""Pydantic settings loaded from environment variables.

Настройки Pydantic, загружаемые из переменных окружения.
"""

from functools import lru_cache

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the API and database.

    Рабочая конфигурация API и базы данных.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Employee Task Management API"
    app_version: str = "1.0.0"
    debug: bool = False

    db_user: str = "postgres"
    db_password: str = "postgres"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "tracker_task"
    db_echo: bool = False

    jwt_secret: str = Field(
        default="",
        validation_alias=AliasChoices("JWT_SECRET", "SECRET_KEY_AUTH"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    cors_origins: str = ""

    @field_validator("db_echo", mode="before")
    @classmethod
    def parse_bool(cls, value: object) -> bool:
        """Parse truthy env strings such as 'true' / '1'.

        Разбирает строковые значения окружения вроде 'true' / '1'.
        """
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL for PostgreSQL.

        Асинхронный URL SQLAlchemy для PostgreSQL.
        """
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def alembic_database_url(self) -> str:
        """Sync-compatible database URL for Alembic.

        URL базы для Alembic с поддержкой синхронного драйвера.
        """
        return f"{self.database_url}?async_fallback=true"

    @property
    def cors_origin_list(self) -> list[str]:
        """CORS origins parsed from a comma-separated string.

        Список CORS origin'ов из строки через запятую.
        """
        if not self.cors_origins.strip():
            return []
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Возвращает кешированный экземпляр Settings.
    """
    return Settings()


settings = get_settings()
