from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    String,
    ForeignKey,
    Integer,
    DateTime,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

if TYPE_CHECKING:
    pass


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
