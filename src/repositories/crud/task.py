"""Task query helpers: filters, sorting, pagination.

Хелперы запросов задач: фильтры, сортировка, пагинация.
"""

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from src.repositories.models import Task, User
from src.repositories.models.enums import TaskPriority, TaskStatus, UserRole

ALLOWED_SORT_FIELDS = {
    "id",
    "title",
    "status",
    "priority",
    "deadline",
    "created_at",
    "updated_at",
}

PRIORITY_ORDER = case(
    (Task.priority == TaskPriority.LOW, 1),
    (Task.priority == TaskPriority.MEDIUM, 2),
    (Task.priority == TaskPriority.HIGH, 3),
    (Task.priority == TaskPriority.CRITICAL, 4),
    else_=0,
)

STATUS_ORDER = case(
    (Task.status == TaskStatus.TODO, 1),
    (Task.status == TaskStatus.IN_PROGRESS, 2),
    (Task.status == TaskStatus.DONE, 3),
    (Task.status == TaskStatus.CANCELLED, 4),
    else_=0,
)


def apply_task_filters(
    stmt: Select,
    *,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    employee_id: int | None = None,
    owner_id: int | None = None,
    unassigned: bool | None = None,
    search: str | None = None,
) -> Select:
    """Apply optional status, priority, assignee, and search filters.

    Применяет необязательные фильтры статуса, приоритета, исполнителя и поиска.
    """
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority)
    if employee_id is not None:
        stmt = stmt.where(Task.executor_id == employee_id)
    if owner_id is not None:
        stmt = stmt.where(Task.owner_id == owner_id)
    if unassigned is True:
        stmt = stmt.where(Task.executor_id.is_(None))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Task.title.ilike(pattern), Task.description.ilike(pattern))
        )
    return stmt


def apply_task_visibility(stmt: Select, user: User) -> Select:
    """Restrict employees to tasks assigned to them.

    Ограничивает сотрудников задачами, назначенными на них.
    """
    if user.role == UserRole.EMPLOYEE:
        return stmt.where(Task.executor_id == user.id)
    return stmt


def apply_sorting(stmt: Select, sort: str | None) -> Select:
    """Sort by an allow-listed field. Prefix '-' for descending order.

    Сортирует по разрешённому полю. Префикс '-' означает убывание.
    """
    raw = (sort or "-created_at").strip()
    descending = raw.startswith("-")
    field_name = raw.lstrip("+-") or "created_at"
    if field_name not in ALLOWED_SORT_FIELDS:
        field_name = "created_at"
        descending = True
    if field_name == "priority":
        column = PRIORITY_ORDER
    elif field_name == "status":
        column = STATUS_ORDER
    else:
        column = getattr(Task, field_name)
    return stmt.order_by(column.desc() if descending else column.asc())


async def get_task_by_id(session: AsyncSession, task_id: int) -> Task | None:
    """Load a task by primary key.

    Загружает задачу по первичному ключу.
    """
    return await session.get(Task, task_id)


async def list_tasks(
    session: AsyncSession,
    *,
    user: User,
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
    """Return a page of visible tasks and the total matching count.

    Возвращает страницу видимых задач и общее число совпадений.
    """
    stmt = select(Task)
    stmt = apply_task_visibility(stmt, user)
    stmt = apply_task_filters(
        stmt,
        status=status,
        priority=priority,
        employee_id=employee_id,
        owner_id=owner_id,
        unassigned=unassigned,
        search=search,
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await session.execute(count_stmt)).scalar_one())

    stmt = apply_sorting(stmt, sort)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all()), total
