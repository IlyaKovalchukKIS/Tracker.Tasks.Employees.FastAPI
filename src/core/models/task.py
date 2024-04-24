from datetime import datetime, UTC

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Task(Base):
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str]
    # owner_id: Mapped[int] = mapped_column(ForeignKey("user.c.id"))
    deadline: Mapped[datetime]
    date_at: Mapped[datetime] = mapped_column(default=datetime.now(UTC))
    parent_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=True)
    # executor: Mapped[int] = mapped_column(ForeignKey(user.c.id), nullable=True)
