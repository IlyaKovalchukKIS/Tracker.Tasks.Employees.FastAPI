from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str = "postgresql+asyncpg://postgres:537865@localhost:5432/tracker_task.v.2"
    db_echo: bool = True


settings = Settings()
