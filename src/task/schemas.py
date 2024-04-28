from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from src.auth.schemas import UserRead


class TaskBaseSchemas(BaseModel):
    """Базовая схема задач"""

    title: str
    description: str
    deadline: Optional[datetime]
    parent_id: int | None = None
    owner_id: int
    executor_id: int | None = None


class TaskCreateSchemas(TaskBaseSchemas):
    """Схема создания задачи"""

    pass


class TaskReadSchemas(TaskBaseSchemas):
    """Схема чтения задачи"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    date_at: Optional[datetime]
    is_active: bool


class TaskUpdateSchemas(TaskBaseSchemas):
    """Схема изменения задачи"""

    is_active: bool


class UserTaskOwnerSchemas(UserRead):
    """Схема списка пользователей с созданными ими задачами"""

    tasks: list[TaskReadSchemas]


class UserTaskExecutorSchemas(UserRead):
    """Схема списка пользователей с назначенными им задачами"""

    executed_tasks: list[TaskReadSchemas]
