"""Declarative base and shared ORM mixins.

Декларативная база и общие миксины ORM.
"""

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all ORM models.

    Декларативная база для всех ORM-моделей.
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Use the lowercased class name as the table name.

        Использует имя класса в нижнем регистре как имя таблицы.
        """
        return cls.__name__.lower()


class TimestampMixin:
    """created_at / updated_at columns for models that need them.

    Поля created_at / updated_at для моделей, которым они нужны.
    """

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
