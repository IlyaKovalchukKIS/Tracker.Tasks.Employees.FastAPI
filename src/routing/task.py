from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import current_active_user
from src.repositories.db_helper import db_helper
from src.repositories.models import Task, User
from src.repositories.models.enums import TaskPriority, TaskStatus, UserRole
from src.routing.deps import require_roles
from src.schemas.task import TaskCreate, TaskListResponse, TaskRead, TaskUpdate
from src.services import task as task_service

task_router = APIRouter(prefix="/tasks", tags=["Tasks"])


@task_router.get(
    "",
    response_model=TaskListResponse,
    summary="List tasks",
    description=(
        "List tasks visible to the current user. Employees only see assigned tasks. "
        "Supports pagination, filtering, sorting, and full-text search on title and description."
    ),
)
async def list_tasks(
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
    page: int = Query(1, ge=1, description="Page number, starting from 1"),
    limit: int = Query(20, ge=1, le=100, description="Page size"),
    status_filter: TaskStatus | None = Query(None, alias="status"),
    priority: TaskPriority | None = None,
    employee_id: int | None = Query(None, description="Filter by assignee"),
    owner_id: int | None = Query(None, description="Filter by creator"),
    unassigned: bool | None = Query(None, description="If true, only tasks without an assignee"),
    search: str | None = Query(None, min_length=1, max_length=100),
    sort: str = Query("-created_at", description="Sort field. Prefix with '-' for descending order."),
) -> TaskListResponse:
    items, total = await task_service.get_tasks(
        session,
        user,
        page=page,
        limit=limit,
        status=status_filter,
        priority=priority,
        employee_id=employee_id,
        owner_id=owner_id,
        unassigned=unassigned,
        search=search,
        sort=sort,
    )
    return TaskListResponse(items=items, page=page, limit=limit, total=total)


@task_router.get(
    "/{task_id}",
    response_model=TaskRead,
    summary="Get task",
    responses={404: {"description": "Task not found"}},
)
async def get_task(
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> Task:
    return await task_service.get_task(session, user, task_id)


@task_router.post(
    "",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create task",
    description="Managers and administrators can create tasks and optionally assign them.",
    responses={403: {"description": "Forbidden"}, 404: {"description": "Assignee not found"}},
)
async def create_task(
    payload: TaskCreate,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
) -> Task:
    return await task_service.create_task(session, user, payload)


@task_router.patch(
    "/{task_id}",
    response_model=TaskRead,
    summary="Update task",
    description=(
        "Administrators and managers can update task fields. "
        "Employees may only change the status of tasks assigned to them."
    ),
)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> Task:
    return await task_service.update_task(session, user, task_id, payload)


@task_router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete task",
    description="Administrators can delete any task. Managers can delete tasks they created.",
)
async def delete_task(
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> None:
    await task_service.delete_task(session, user, task_id)
