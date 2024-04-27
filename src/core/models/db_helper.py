from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    async_scoped_session,
    AsyncSession,
)
from asyncio import current_task
from src.core.config import *


class DatabaseHelper:
    def __init__(self, url: str, echo: bool = False):
        """
        Класс помощник для работы с подключением к базе данных

        :param url: url базы данных указанный в конфиге проекта
        :param echo: вывод в консоль запросов к базе данных
        """
        # Создание движка
        self.engine = create_async_engine(url=url, echo=echo)

        # Создание асинхронных сессии
        self.session_factory = async_sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
            autoflush=False,
        )

    def get_scoped_session(self):
        session = async_scoped_session(
            session_factory=self.session_factory,
            scopefunc=current_task,
        )
        return session

    async def session_dependency(self) -> AsyncSession:
        """
        Метод для открытия асинхронной сессии
        :return: AsyncSession
        """
        async with self.session_factory() as session:
            yield session
            await session.close()


db_helper = DatabaseHelper(
    url=DB_URL,
    echo=DB_ECHO,
)
