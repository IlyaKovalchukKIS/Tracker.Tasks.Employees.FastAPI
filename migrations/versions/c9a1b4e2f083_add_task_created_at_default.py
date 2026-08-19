"""Add a database default for task.created_at.

Добавляет значение по умолчанию для task.created_at.

Revision ID: c9a1b4e2f083
Revises: 7b2e9c4a1f10
Create Date: 2026-08-18 23:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9a1b4e2f083"
down_revision: Union[str, None] = "7b2e9c4a1f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ensure new tasks get created_at from the database clock.

    Гарантирует, что у новых задач created_at заполняется часами базы.
    """
    op.alter_column(
        "task",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )


def downgrade() -> None:
    """Remove the created_at server default.

    Убирает значение по умолчанию у created_at.
    """
    op.alter_column(
        "task",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=None,
    )
