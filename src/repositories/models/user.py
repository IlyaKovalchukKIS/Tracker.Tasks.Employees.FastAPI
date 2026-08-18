from datetime import datetime
from typing import TYPE_CHECKING

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import UserRole

if TYPE_CHECKING:
    from .refresh_token import RefreshToken
    from .task import Task


class User(SQLAlchemyBaseUserTable[int], Base):
    """Application user. Also represents an employee in this domain."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=20),
        default=UserRole.EMPLOYEE,
        nullable=False,
        index=True,
    )
    manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    manager: Mapped["User | None"] = relationship(
        remote_side="User.id",
        foreign_keys=[manager_id],
        back_populates="employees",
    )
    employees: Mapped[list["User"]] = relationship(
        foreign_keys=[manager_id],
        back_populates="manager",
    )
    tasks: Mapped[list["Task"]] = relationship(
        foreign_keys="Task.owner_id",
        back_populates="owner",
    )
    executed_tasks: Mapped[list["Task"]] = relationship(
        foreign_keys="Task.executor_id",
        back_populates="executor",
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
