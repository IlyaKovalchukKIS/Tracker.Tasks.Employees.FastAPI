"""Employee response schemas.

Схемы ответов для сотрудников.
"""

from pydantic import BaseModel, ConfigDict, EmailStr

from src.repositories.models.enums import UserRole
from src.schemas.task import TaskRead


class EmployeeRead(BaseModel):
    """Employee directory item.

    Элемент справочника сотрудников.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    manager_id: int | None
    is_active: bool


class EmployeeDetail(EmployeeRead):
    """Employee profile including assigned tasks.

    Профиль сотрудника с назначенными задачами.
    """
    executed_tasks: list[TaskRead] = []
