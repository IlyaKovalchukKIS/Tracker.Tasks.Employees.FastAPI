from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from src.core.config import settings


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


db_helper = DatabaseHelper(
    url=settings.db_url,
    echo=settings.db_echo,
)
