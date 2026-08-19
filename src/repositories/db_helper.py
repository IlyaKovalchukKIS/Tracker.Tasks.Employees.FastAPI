"""Database engine and session helper.

Хелпер движка базы данных и сессии.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings


class DatabaseHelper:
    """Create the async engine and provide request-scoped sessions.

    Создаёт асинхронный engine и отдаёт сессии на время запроса.
    """

    def __init__(self, url: str, echo: bool = False) -> None:
        """Configure the engine and session factory.

        Настраивает engine и фабрику сессий.
        """
        self.engine = create_async_engine(url=url, echo=echo, pool_pre_ping=True)
        self.session_factory = async_sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
            autoflush=False,
        )

    async def session_dependency(self) -> AsyncGenerator[AsyncSession, None]:
        """FastAPI dependency that yields an AsyncSession.

        Зависимость FastAPI, которая отдаёт AsyncSession.
        """
        async with self.session_factory() as session:
            yield session

    async def dispose(self) -> None:
        """Dispose the connection pool.

        Закрывает пул соединений.
        """
        await self.engine.dispose()


db_helper = DatabaseHelper(url=settings.database_url, echo=settings.db_echo)
