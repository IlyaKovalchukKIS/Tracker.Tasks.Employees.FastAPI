from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.models.base import Base

if TYPE_CHECKING:
    from src.core.models.task_model import Task


class User(Base):
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str]
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    tasks = relationship("Task", foreign_keys="Task.owner_id")
    executed_tasks = relationship("Task", foreign_keys="Task.executor_id")
