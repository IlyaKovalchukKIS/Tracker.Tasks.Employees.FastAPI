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
from src.schemas.task import (
    TaskCreateSchemas,
    TaskReadSchemas,
    UserTaskOwnerSchemas,
    UserTaskExecutorSchemas,
)
from src.repositories import db_helper

task_router = APIRouter(prefix="/task", tags=["Task"])


@task_router.get("/", response_model=List[TaskReadSchemas])
async def get_all_tasks_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт получения всех задач
    :param session: Асинхронная сессия
    :return:
    """
    return await get_all_tasks(session=session)


@task_router.get("/free/", response_model=List[TaskReadSchemas])
async def get_free_tasks_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт получения списка свободных задач
    :param session: Асинхронная сессия
    :return: Список свободных задач
    """
    return await get_free_tasks(session=session)


@task_router.get("/{task_id}/", response_model=TaskReadSchemas)
async def get_task_router(
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт получения задач по id
    :param task_id: id задачи
    :param session: Асинхронная сессия
    :return: Задача
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
):
    """
    Эндпоинт создания задачи
    :param task_in: Словарь с данными для создания
    :param session: Асинхронная сессия
    :return: Созданная задача
    """
    return await create_task(task_in=task_in, session=session)


@task_router.put("/update/{task_id}/")
async def update_task_router(
    task_update: Annotated[TaskCreateSchemas, Depends()],
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт изменения задачи
    :param task_update: изменяемые поля
    :param task_id: id изменяемой задачи
    :param session: Асинхронная сессия
    :return: Измененная задача
    """
    task = await get_task(task_id=task_id, session=session)
    result = await update_task(task=task, session=session, task_update=task_update)
    return result


@task_router.delete("/delete/")
async def delete_task_router(
    owner_id: int,
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт удаления задачи
    :param owner_id: id владельца задачи
    :param task_id: id задачи
    :param session: Асинхронная сессия
    :return: Словарь со статусом удаления задачи
    """
    return await delete_task(owner_id=owner_id, task_id=task_id, session=session)


@task_router.get("/tasks/owner/", response_model=List[UserTaskOwnerSchemas])
async def get_users_tasks_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт получения списка пользователей с созданными ими задачами
    :param session: Асинхронная сессия
    :return: Список пользователей с созданными ими задачами
    """
    return await get_users_tasks(session=session)


@task_router.get("/tasks/executor/", response_model=List[UserTaskExecutorSchemas])
async def get_users_tasks_executor_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    """
    Эндпоинт получения списка пользователей с назначенными им задачами
    :param session: Асинхронная сессия
    :return: Список пользователей с назначенными им задачами
    """
    return await get_users_tasks_executor(session=session)
