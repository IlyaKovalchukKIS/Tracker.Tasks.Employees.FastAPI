from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    String,
    ForeignKey,
    Integer,
    DateTime,
    ForeignKeyConstraint,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from src.core.models.user_model import User


class Task(Base):
    """Модель задач"""

    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str]
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    deadline: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    date_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    parent_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=True)
    executor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), nullable=True
    )

    # owner = relationship("User", back_populates="tasks")
    # executor = relationship("User", back_populates="executed_tasks")


# from sqlalchemy import ForeignKey
# from sqlalchemy.orm import relationship
#
# class User(Base):
#     # ... (other column definitions)
#
#     tasks = relationship("Task", back_populates="owner")
#     executed_tasks = relationship("Task", back_populates="executor")
#
# class Task(Base):
#     # ... (other column definitions)
#
#     owner = relationship("User", back_populates="tasks")
#     executor = relationship("User", back_populates="executed_tasks")
