"""User query helpers.

Хелперы запросов пользователей.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.repositories.models import User
from src.repositories.models.enums import UserRole


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    """Load a user by primary key.

    Загружает пользователя по первичному ключу.
    """
    return await session.get(User, user_id)


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    """Load a user by unique email.

    Загружает пользователя по уникальному email.
    """
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def count_users(session: AsyncSession) -> int:
    """Return the total number of users.

    Возвращает общее число пользователей.
    """
    result = await session.execute(select(func.count(User.id)))
    return int(result.scalar_one())


async def list_users(
    session: AsyncSession,
    *,
    role: UserRole | None = None,
    manager_id: int | None = None,
) -> list[User]:
    """List users, optionally filtered by role or manager.

    Возвращает пользователей, опционально фильтруя по роли или менеджеру.
    """
    stmt = select(User).order_by(User.id)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if manager_id is not None:
        stmt = stmt.where(User.manager_id == manager_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_employee_with_tasks(session: AsyncSession, user_id: int) -> User | None:
    """Load a user together with assigned tasks.

    Загружает пользователя вместе с назначенными задачами.
    """
    stmt = (
        select(User)
        .options(selectinload(User.executed_tasks))
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
