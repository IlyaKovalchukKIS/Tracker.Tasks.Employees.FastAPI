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
    async def checker(user: User = Depends(current_active_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError("Insufficient permissions")
        return user

    return checker
