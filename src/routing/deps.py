"""Authentication and authorization FastAPI dependencies.

Зависимости FastAPI для аутентификации и авторизации.
"""

from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Depends

from src.auth import current_active_user
from src.exceptions import ForbiddenError
from src.repositories.models import User
from src.repositories.models.enums import UserRole


def require_roles(
    *roles: UserRole,
) -> Callable[..., Coroutine[Any, Any, User]]:
    """Return a dependency that allows only the given roles.

    Возвращает зависимость, которая пропускает только указанные роли.
    """

    async def checker(user: User = Depends(current_active_user)) -> User:
        """Reject the request when the user's role is not allowed.

        Отклоняет запрос, если роль пользователя не входит в список.
        """
        if user.role not in roles:
            raise ForbiddenError("Insufficient permissions")
        return user

    return checker
