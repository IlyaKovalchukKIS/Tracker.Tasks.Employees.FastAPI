from sqlalchemy import String, ForeignKey, Integer, null
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Task(Base):
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str]
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))
    # deadline: Mapped[datetime]
    # date_at: Mapped[datetime] = mapped_column(default=datetime.now(UTC))
    parent_id: Mapped[int] = mapped_column(ForeignKey("task.id"), nullable=True)
    executor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id"), nullable=True
    )
