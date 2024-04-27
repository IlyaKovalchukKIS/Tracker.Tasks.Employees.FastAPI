from typing import Annotated, List

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import (
    TaskCreateSchemas,
    TaskReadSchemas,
    UserTaskSchemas,
    UserTaskExecutorSchemas,
)
from . import crud
from src.core.models.db_helper import db_helper

task_router = APIRouter(prefix="/task", tags=["Task"])


@task_router.get("/", response_model=list[TaskReadSchemas])
async def get_all_tasks_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    return await crud.get_all_tasks(session=session)


@task_router.get("/{task_id}/", response_model=TaskReadSchemas)
async def get_task_router(
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    task = await crud.get_task(task_id=task_id, session=session)
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
    return await crud.create_task(task_in=task_in, session=session)


@task_router.put("/update/{task_id}/")
async def update_task_router(
    task_update: Annotated[TaskCreateSchemas, Depends()],
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    task = await crud.get_task(task_id=task_id, session=session)
    result = await crud.update_task(task=task, session=session, task_update=task_update)
    return result


@task_router.delete("/delete/")
async def delete_task_router(
    owner_id: int,
    task_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    return await crud.delete_task(owner_id=owner_id, task_id=task_id, session=session)


@task_router.get("/tasks/owner/", response_model=List[UserTaskSchemas])
async def get_users_tasks_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    return await crud.get_users_tasks(session=session)


@task_router.get("/tasks/executor/", response_model=List[UserTaskExecutorSchemas])
async def get_users_tasks_executor_router(
    session: AsyncSession = Depends(db_helper.session_dependency),
):
    return await crud.get_users_tasks_executor(session=session)
