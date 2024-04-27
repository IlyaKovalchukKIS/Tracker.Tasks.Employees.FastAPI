from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from src.auth.schemas import UserRead


class TaskBaseSchemas(BaseModel):
    title: str
    description: str
    deadline: Optional[datetime]
    parent_id: int | None = None
    owner_id: int
    executor_id: int | None = None


class TaskCreateSchemas(TaskBaseSchemas):
    pass


class TaskReadSchemas(TaskBaseSchemas):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date_at: Optional[datetime]


class TaskUpdateSchemas(TaskBaseSchemas):
    pass


class UserTaskSchemas(UserRead):
    tasks: list[TaskReadSchemas]


class UserTaskExecutorSchemas(UserRead):
    executed_tasks: list[TaskReadSchemas]
