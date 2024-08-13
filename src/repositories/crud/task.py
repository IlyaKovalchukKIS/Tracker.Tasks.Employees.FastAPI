from sqlalchemy import select, Result
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.repositories.models.task import Task
from src.repositories.models.user import User
from src.schemas.task import TaskCreateSchemas


async def get_all_tasks(session: AsyncSession) -> list[Task]:
    """Получение всех задач"""
    stmt = select(Task).order_by(Task.id)
    result: Result = await session.execute(stmt)
    tasks = result.scalars().all()
    return list(tasks)


async def get_task(session: AsyncSession, task_id: int) -> Task | None:
    """Получение задачи по id"""
    return await session.get(Task, task_id)


async def get_free_tasks(session: AsyncSession) -> list[Task] | None:
    """Получене списка свободных задач"""
    stmt = select(Task).filter(Task.is_active == False).order_by(Task.deadline)
    result: Result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_task(session: AsyncSession, task_in: TaskCreateSchemas, owner_id: int) -> Task:
    """Создание задачи"""
    task = task_in.model_dump()
    task["owner_id"] = owner_id
    if task["parent_id"] == 0:
        task.pop("parent_id")
    if task["executor_id"] != 0 and task["executor_id"] is not None:
        task["is_active"] = True

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
    """Изменение задачи"""
    for name, value in task_update.model_dump().items():
        setattr(task, name, value)
    await session.commit()
    return task


async def delete_task(
    session: AsyncSession, task_id: int, owner_id: int
) -> dict | None:
    """Удаление задачи по id"""
    result = await session.get(Task, task_id)
    if result is not None:
        if result.owner_id == owner_id:
            await session.delete(result)
            await session.commit()
            return {"detail": "Success delete task"}
        return {"detail": "User is not owner to task"}
    return {"detail": f"There is no task with this number {task_id} in the table"}


async def get_users_tasks(session: AsyncSession):
    """Функция получения списка пользователей со списком задач которые они создали"""
    stmt = select(User).options(selectinload(User.tasks)).order_by(User.id)
    users = await session.scalars(stmt)
    return list(users.unique())


async def get_users_tasks_executor(session: AsyncSession):
    """Функция получение списка пользователей со списком назначеннх им задач"""
    stmt = select(User).options(selectinload(User.executed_tasks)).order_by(User.id)
    users = await session.scalars(stmt)
    return list(users.unique())
