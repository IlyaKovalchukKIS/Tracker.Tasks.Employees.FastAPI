from sqlalchemy import select, Result
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.models.task_model import Task
from src.task.schemas import TaskCreateSchemas


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
