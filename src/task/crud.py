from typing import Optional

from sqlalchemy import select, Result
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload, relationship

from src.core.models.task_model import Task
from src.core.models.user_model import User
from src.task.schemas import TaskCreateSchemas, TaskReadSchemas, UserTaskSchemas
from fastapi import HTTPException, status


async def get_all_tasks(session: AsyncSession) -> list[Task]:
    stmt = select(Task).order_by(Task.id)
    result: Result = await session.execute(stmt)
    tasks = result.scalars().all()
    return list(tasks)


async def get_task(session: AsyncSession, task_id: int) -> Task | None:
    return await session.get(Task, task_id)


async def create_task(session: AsyncSession, task_in: TaskCreateSchemas) -> Task:
    task = task_in.model_dump()
    if task["parent_id"] == 0:
        task.pop("parent_id")

    if task["executor_id"] == 0:
        task.pop("executor_id")

    task = Task(**task)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def update_task(
    session: AsyncSession, task: Task, task_update: TaskCreateSchemas
) -> Task:
    for name, value in task_update.model_dump().items():
        setattr(task, name, value)
    await session.commit()
    return task


async def delete_task(
    session: AsyncSession, task_id: int, owner_id: int
) -> dict | None:
    result = await session.get(Task, task_id)
    if result is not None:
        if result.owner_id == owner_id:
            await session.delete(result)
            await session.commit()
            return {"detail": "Success delete task"}
        return {"detail": "User is not owner to task"}
    return {"detail": f"There is no task with this number {task_id} in the table"}


async def get_users_tasks(session: AsyncSession):
    stmt = select(User).options(selectinload(User.tasks)).order_by(User.id)
    users = await session.scalars(stmt)
    print(users)
    return list(users.unique())


async def get_users_tasks_executor(session: AsyncSession):
    stmt = select(User).options(selectinload(User.executed_tasks)).order_by(User.id)
    users = await session.scalars(stmt)
    print(users)
    return list(users.unique())
