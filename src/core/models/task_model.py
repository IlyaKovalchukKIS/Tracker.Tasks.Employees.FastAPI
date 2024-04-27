from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from src.core.models.user_model import User


class Task(Base):
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str]
    owner_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    deadline: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    date_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    parent_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=True)
    executor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), nullable=True
    )

    # owner = relationship("Task", back_populates="tasks", foreign_keys="User.id")
