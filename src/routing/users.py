"""User HTTP endpoints.

HTTP-эндпоинты пользователей.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import current_active_user
from src.repositories.db_helper import db_helper
from src.repositories.models import User
from src.repositories.models.enums import UserRole
from src.routing.deps import require_roles
from src.schemas.user import UserAdminUpdate, UserRead, UserUpdate
from src.services import user as user_service

users_router = APIRouter(prefix="/users", tags=["Users"])


@users_router.get(
    "/me",
    response_model=UserRead,
    summary="Get current profile",
    description="Return the authenticated user's profile.",
)
async def read_me(user: User = Depends(current_active_user)) -> User:
    """Return the authenticated user's profile.

    Возвращает профиль текущего пользователя.
    """
    return user


@users_router.patch(
    "/me",
    response_model=UserRead,
    summary="Update current profile",
    description="Update the authenticated user's email or password.",
    responses={409: {"description": "Email already registered"}},
)
async def update_me(
    payload: UserUpdate,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> User:
    """Update the current user's email or password.

    Обновляет email или пароль текущего пользователя.
    """
    return await user_service.update_own_profile(session, user, payload)


@users_router.get(
    "",
    response_model=list[UserRead],
    summary="List users",
    description="Administrators see every user. Managers see themselves, unassigned employees, and their team.",
)
async def list_users(
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
) -> list[User]:
    """List users visible to an admin or manager.

    Возвращает пользователей, видимых администратору или менеджеру.
    """
    return await user_service.list_managed_users(session, user)


@users_router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Get user by id",
    responses={404: {"description": "User not found"}, 403: {"description": "Forbidden"}},
)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> User:
    """Get a user by id if the caller may see them.

    Возвращает пользователя по id, если вызывающему можно его видеть.
    """
    return await user_service.get_visible_user(session, user, user_id)


@users_router.patch(
    "/{user_id}",
    response_model=UserRead,
    summary="Update user role or assignment",
    description="Administrators can change a user's role, active flag, and manager assignment.",
)
async def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> User:
    """Update a user's role, manager, or active flag.

    Обновляет роль, менеджера или флаг активности пользователя.
    """
    return await user_service.admin_update_user(session, user, user_id, payload)


@users_router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Administrators can delete a user who does not own tasks.",
    responses={
        204: {"description": "User deleted"},
        409: {"description": "User still owns tasks"},
        404: {"description": "User not found"},
    },
)
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    """Delete a user who does not own tasks.

    Удаляет пользователя, у которого нет созданных задач.
    """
    await user_service.admin_delete_user(session, user, user_id)
