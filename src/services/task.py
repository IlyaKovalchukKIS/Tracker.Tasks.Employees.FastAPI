"""Task authorization and workflow rules.

Правила авторизации и жизненного цикла задач.
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.exceptions import ForbiddenError, NotFoundError
from src.repositories.crud.task import get_task_by_id, list_tasks
from src.repositories.crud.user import get_user_by_id
from src.repositories.models import Task, User
from src.repositories.models.enums import TaskPriority, TaskStatus, UserRole
from src.schemas.task import TaskCreate, TaskUpdate


def can_view_task(user: User, task: Task) -> bool:
    """Return whether the user may read the task.

    Проверяет, может ли пользователь читать задачу.
    """
    if user.role in {UserRole.ADMIN, UserRole.MANAGER}:
        return True
    return task.executor_id == user.id


def can_manage_task(user: User, task: Task) -> bool:
    """Return whether the user may update task fields.

    Проверяет, может ли пользователь менять поля задачи.
    """
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.MANAGER:
        return True
    return False


def can_delete_task(user: User, task: Task) -> bool:
    """Return whether the user may delete the task.

    Проверяет, может ли пользователь удалить задачу.
    """
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.MANAGER:
        return task.owner_id == user.id
    return False


async def _validate_executor(session: AsyncSession, executor_id: int | None) -> None:
    """Ensure the assignee exists and is active.

    Проверяет, что исполнитель существует и активен.
    """
    if executor_id is None:
        return
    executor = await get_user_by_id(session, executor_id)
    if executor is None:
        raise NotFoundError("Assignee not found")
    if not executor.is_active:
        raise ForbiddenError("Cannot assign a task to an inactive user")


async def _validate_parent(session: AsyncSession, parent_id: int | None) -> None:
    """Ensure the parent task exists when a subtask is created.

    Проверяет, что родительская задача существует при создании подзадачи.
    """
    if parent_id is None:
        return
    parent = await get_task_by_id(session, parent_id)
    if parent is None:
        raise NotFoundError("Parent task not found")


async def create_task(session: AsyncSession, current_user: User, payload: TaskCreate) -> Task:
    """Create a task owned by the current manager or admin.

    Создаёт задачу от имени текущего менеджера или администратора.
    """
    if current_user.role not in {UserRole.ADMIN, UserRole.MANAGER}:
        raise ForbiddenError("Only managers and administrators can create tasks")

    await _validate_executor(session, payload.executor_id)
    await _validate_parent(session, payload.parent_id)

    task = Task(
        **payload.model_dump(),
        owner_id=current_user.id,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def get_task(session: AsyncSession, current_user: User, task_id: int) -> Task:
    """Load one task if the caller is allowed to see it.

    Загружает одну задачу, если вызывающему разрешено её видеть.
    """
    task = await get_task_by_id(session, task_id)
    if task is None:
        raise NotFoundError("Task not found")
    if not can_view_task(current_user, task):
        raise ForbiddenError("Insufficient permissions")
    return task


async def get_tasks(
    session: AsyncSession,
    current_user: User,
    *,
    page: int,
    limit: int,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    employee_id: int | None = None,
    owner_id: int | None = None,
    unassigned: bool | None = None,
    search: str | None = None,
    sort: str | None = None,
) -> tuple[list[Task], int]:
    """Return a paginated, filtered task list for the current user.

    Возвращает пагинированный и отфильтрованный список задач для текущего пользователя.
    """
    return await list_tasks(
        session,
        user=current_user,
        page=page,
        limit=limit,
        status=status,
        priority=priority,
        employee_id=employee_id,
        owner_id=owner_id,
        unassigned=unassigned,
        search=search,
        sort=sort,
    )


async def update_task(
    session: AsyncSession,
    current_user: User,
    task_id: int,
    payload: TaskUpdate,
) -> Task:
    """Update a task according to the caller's role.

    Обновляет задачу в соответствии с ролью вызывающего.
    """
    task = await get_task(session, current_user, task_id)
    data = payload.model_dump(exclude_unset=True)

    if current_user.role == UserRole.EMPLOYEE:
        if task.executor_id != current_user.id:
            raise ForbiddenError("Insufficient permissions")
        if set(data.keys()) - {"status"}:
            raise ForbiddenError("Employees can only update the status of assigned tasks")
        task.status = data["status"]
        await session.commit()
        await session.refresh(task)
        return task

    if not can_manage_task(current_user, task):
        raise ForbiddenError("Insufficient permissions")

    if "executor_id" in data:
        await _validate_executor(session, data["executor_id"])
    if "parent_id" in data:
        if data["parent_id"] == task.id:
            raise ForbiddenError("A task cannot be its own parent")
        await _validate_parent(session, data["parent_id"])

    for field, value in data.items():
        setattr(task, field, value)

    await session.commit()
    await session.refresh(task)
    return task


async def delete_task(session: AsyncSession, current_user: User, task_id: int) -> None:
    """Delete a task if the caller is allowed to.

    Удаляет задачу, если вызывающему это разрешено.
    """
    task = await get_task(session, current_user, task_id)
    if not can_delete_task(current_user, task):
        raise ForbiddenError("Insufficient permissions")
    try:
        await session.delete(task)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ForbiddenError("Task cannot be deleted because related records exist") from exc
