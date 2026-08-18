from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from src.repositories.crud.user import (
    get_employee_with_tasks,
    get_user_by_email,
    get_user_by_id,
    list_users,
)
from src.repositories.models import Task, User
from src.repositories.models.enums import UserRole
from src.schemas.user import UserAdminUpdate, UserUpdate
from src.services.auth import password_helper


def _is_in_manager_scope(manager: User, employee: User) -> bool:
    if employee.role == UserRole.ADMIN:
        return False
    return employee.manager_id == manager.id or employee.id == manager.id


async def get_profile(session: AsyncSession, user_id: int) -> User:
    user = await get_user_by_id(session, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user


async def update_own_profile(
    session: AsyncSession,
    current_user: User,
    payload: UserUpdate,
) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != current_user.email:
        existing = await get_user_by_email(session, data["email"])
        if existing is not None:
            raise ConflictError("Email is already registered")
        current_user.email = data["email"]
    if data.get("password"):
        current_user.hashed_password = password_helper.hash(data["password"])
    await session.commit()
    await session.refresh(current_user)
    return current_user


async def list_managed_users(session: AsyncSession, current_user: User) -> list[User]:
    if current_user.role == UserRole.ADMIN:
        return await list_users(session)
    if current_user.role == UserRole.MANAGER:
        scoped = await list_users(session, manager_id=current_user.id)
        employees = await list_users(session, role=UserRole.EMPLOYEE)
        unassigned = [user for user in employees if user.manager_id is None]
        merged = {user.id: user for user in [*scoped, *unassigned, current_user]}
        return sorted(merged.values(), key=lambda user: user.id)
    raise ForbiddenError("Insufficient permissions")


async def get_visible_user(
    session: AsyncSession,
    current_user: User,
    user_id: int,
) -> User:
    user = await get_user_by_id(session, user_id)
    if user is None:
        raise NotFoundError("User not found")
    if current_user.role == UserRole.ADMIN:
        return user
    if current_user.role == UserRole.MANAGER and _is_in_manager_scope(current_user, user):
        return user
    if current_user.id == user_id:
        return user
    raise ForbiddenError("Insufficient permissions")


async def admin_update_user(
    session: AsyncSession,
    current_user: User,
    user_id: int,
    payload: UserAdminUpdate,
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Only administrators can manage roles")

    user = await get_user_by_id(session, user_id)
    if user is None:
        raise NotFoundError("User not found")

    data = payload.model_dump(exclude_unset=True)
    if "manager_id" in data and data["manager_id"] is not None:
        manager = await get_user_by_id(session, data["manager_id"])
        if manager is None:
            raise NotFoundError("Manager not found")
        if manager.role != UserRole.MANAGER:
            raise BadRequestError("manager_id must refer to a user with the MANAGER role")
        if data["manager_id"] == user.id:
            raise BadRequestError("A user cannot be their own manager")
        user.manager_id = data["manager_id"]
    elif "manager_id" in data:
        user.manager_id = None

    if "role" in data and data["role"] is not None:
        user.role = data["role"]
        user.is_superuser = data["role"] == UserRole.ADMIN
        if data["role"] != UserRole.EMPLOYEE:
            user.manager_id = None

    if "is_active" in data and data["is_active"] is not None:
        if user.id == current_user.id and data["is_active"] is False:
            raise BadRequestError("You cannot deactivate your own account")
        user.is_active = data["is_active"]

    await session.commit()
    await session.refresh(user)
    return user


async def admin_delete_user(
    session: AsyncSession,
    current_user: User,
    user_id: int,
) -> None:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenError("Only administrators can delete users")
    if current_user.id == user_id:
        raise BadRequestError("You cannot delete your own account")

    user = await get_user_by_id(session, user_id)
    if user is None:
        raise NotFoundError("User not found")

    owned_tasks = await session.execute(
        select(func.count()).select_from(Task).where(Task.owner_id == user_id)
    )
    if int(owned_tasks.scalar_one()) > 0:
        raise ConflictError("Cannot delete a user who still owns tasks")

    await session.delete(user)
    await session.commit()


async def list_employees(session: AsyncSession, current_user: User) -> list[User]:
    users = await list_managed_users(session, current_user)
    return [user for user in users if user.role != UserRole.ADMIN]


async def get_employee_detail(
    session: AsyncSession,
    current_user: User,
    employee_id: int,
) -> User:
    employee = await get_employee_with_tasks(session, employee_id)
    if employee is None:
        raise NotFoundError("Employee not found")
    if current_user.role == UserRole.ADMIN:
        return employee
    if current_user.role == UserRole.MANAGER and _is_in_manager_scope(current_user, employee):
        return employee
    if current_user.id == employee_id:
        return employee
    raise ForbiddenError("Insufficient permissions")
