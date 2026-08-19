"""JWT authentication wiring on top of fastapi-users.

Обвязка JWT-аутентификации поверх fastapi-users.
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers, IntegerIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.repositories.db_helper import db_helper
from src.repositories.models import User


class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    """fastapi-users manager for integer-id users.

    Менеджер fastapi-users для пользователей с целочисленным id.
    """

    reset_password_token_secret = settings.jwt_secret
    verification_token_secret = settings.jwt_secret


async def get_user_db(
    session: AsyncSession = Depends(db_helper.session_dependency),
) -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    """Yield the SQLAlchemy user database adapter.

    Отдаёт адаптер базы пользователей SQLAlchemy.
    """
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    """Yield a UserManager bound to the current session.

    Отдаёт UserManager, привязанный к текущей сессии.
    """
    yield UserManager(user_db)


def get_jwt_strategy() -> JWTStrategy:
    """Build the JWT access-token strategy from settings.

    Собирает JWT-стратегию access-токена из настроек.
    """
    return JWTStrategy(
        secret=settings.jwt_secret,
        lifetime_seconds=settings.access_token_expire_minutes * 60,
        algorithm=settings.jwt_algorithm,
    )


bearer_transport = BearerTransport(tokenUrl="auth/login")

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, int](get_user_manager, [auth_backend])
current_active_user = fastapi_users.current_user(active=True)
