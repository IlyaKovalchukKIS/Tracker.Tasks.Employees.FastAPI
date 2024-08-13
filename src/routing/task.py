from typing import Annotated, List

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.crud import (
    get_free_tasks,
    get_all_tasks,
    get_task,
    create_task,
    update_task,
    delete_task,
    get_users_tasks,
    get_users_tasks_executor,
)
from src.repositories.crud.user import fastapi_users
from src.repositories.models import User
from src.schemas.task import (
    TaskCreateSchemas,
    TaskReadSchemas,
    UserTaskOwnerSchemas,
    UserTaskExecutorSchemas,
)
from src.repositories import db_helper

task_router = APIRouter(prefix="/task", tags=["Task"])

current_user = fastapi_users.current_user()


@task_router.get("/", response_model=List[TaskReadSchemas])
async def get_all_tasks_router(
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт получения всех задач
    """
    return await get_all_tasks(session=session)


@task_router.get("/free/", response_model=List[TaskReadSchemas])
async def get_free_tasks_router(
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт получения списка свободных задач
    """
    return await get_free_tasks(session=session)


@task_router.get("/{task_id}/", response_model=TaskReadSchemas)
async def get_task_router(
        task_id: int,
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт получения задач по id
    """
    task = await get_task(task_id=task_id, session=session)
    if task is not None:
        return task
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Task {task_id} not found",
    )


@task_router.post("/", response_model=TaskReadSchemas)
async def create_task_router(
        task_in: Annotated[TaskCreateSchemas, Depends()],
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт создания задачи
    """
    return await create_task(task_in=task_in, session=session, owner_id=user.id)


@task_router.put("/update/{task_id}/")
async def update_task_router(
        task_update: Annotated[TaskCreateSchemas, Depends()],
        task_id: int,
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт изменения задачи

    """
    task = await get_task(task_id=task_id, session=session)
    result = await update_task(task=task, session=session, task_update=task_update)
    return result


@task_router.delete("/delete/")
async def delete_task_router(
        task_id: int,
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт удаления задачи
    """
    return await delete_task(owner_id=user.id, task_id=task_id, session=session)


@task_router.get("/tasks/owner/", response_model=List[UserTaskOwnerSchemas])
async def get_users_tasks_router(
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт получения списка пользователей с созданными ими задачами
    """
    return await get_users_tasks(session=session)


@task_router.get("/tasks/executor/", response_model=List[UserTaskExecutorSchemas])
async def get_users_tasks_executor_router(
        session: AsyncSession = Depends(db_helper.session_dependency),
        user: User = Depends(current_user),
):
    """
    Эндпоинт получения списка пользователей с назначенными им задачами
    """
    return await get_users_tasks_executor(session=session)
