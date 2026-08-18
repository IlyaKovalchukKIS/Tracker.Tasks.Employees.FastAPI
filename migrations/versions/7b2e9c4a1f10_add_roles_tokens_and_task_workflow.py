"""Add roles, task workflow fields, refresh tokens, and indexes.

Revision ID: 7b2e9c4a1f10
Revises: 06c404d1de76
Create Date: 2026-08-18 21:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7b2e9c4a1f10"
down_revision: Union[str, None] = "06c404d1de76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("role", sa.String(length=20), nullable=False, server_default="EMPLOYEE"),
    )
    op.add_column("user", sa.Column("manager_id", sa.Integer(), nullable=True))
    op.add_column(
        "user",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "user",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_user_role", "user", ["role"])
    op.create_index("ix_user_manager_id", "user", ["manager_id"])
    op.create_foreign_key(
        "fk_user_manager_id",
        "user",
        "user",
        ["manager_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "task",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="TODO"),
    )
    op.add_column(
        "task",
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="MEDIUM"),
    )
    op.add_column("task", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "task",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.execute("UPDATE task SET created_at = date_at")
    op.execute("UPDATE task SET status = 'IN_PROGRESS' WHERE is_active IS TRUE")
    op.alter_column("task", "created_at", nullable=False)
    op.alter_column("task", "deadline", existing_type=sa.DateTime(), nullable=True)

    op.drop_constraint("task_owner_id_fkey", "task", type_="foreignkey")
    op.drop_constraint("task_executor_id_fkey", "task", type_="foreignkey")
    op.drop_constraint("task_parent_id_fkey", "task", type_="foreignkey")
    op.create_foreign_key(
        "fk_task_owner_id",
        "task",
        "user",
        ["owner_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_task_executor_id",
        "task",
        "user",
        ["executor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_task_parent_id",
        "task",
        "task",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index("ix_task_title", "task", ["title"])
    op.create_index("ix_task_status", "task", ["status"])
    op.create_index("ix_task_priority", "task", ["priority"])
    op.create_index("ix_task_owner_id", "task", ["owner_id"])
    op.create_index("ix_task_executor_id", "task", ["executor_id"])
    op.create_index("ix_task_parent_id", "task", ["parent_id"])

    op.drop_column("task", "date_at")
    op.drop_column("task", "is_active")

    op.create_table(
        "refresh_token",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_token_user_id", "refresh_token", ["user_id"])
    op.create_index("ix_refresh_token_token_hash", "refresh_token", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_refresh_token_token_hash", table_name="refresh_token")
    op.drop_index("ix_refresh_token_user_id", table_name="refresh_token")
    op.drop_table("refresh_token")

    op.add_column("task", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column(
        "task",
        sa.Column("date_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.execute("UPDATE task SET date_at = created_at")
    op.execute("UPDATE task SET is_active = TRUE WHERE status = 'IN_PROGRESS'")

    op.drop_index("ix_task_parent_id", table_name="task")
    op.drop_index("ix_task_executor_id", table_name="task")
    op.drop_index("ix_task_owner_id", table_name="task")
    op.drop_index("ix_task_priority", table_name="task")
    op.drop_index("ix_task_status", table_name="task")
    op.drop_index("ix_task_title", table_name="task")

    op.drop_constraint("fk_task_parent_id", "task", type_="foreignkey")
    op.drop_constraint("fk_task_executor_id", "task", type_="foreignkey")
    op.drop_constraint("fk_task_owner_id", "task", type_="foreignkey")
    op.create_foreign_key("task_parent_id_fkey", "task", "task", ["parent_id"], ["id"])
    op.create_foreign_key("task_executor_id_fkey", "task", "user", ["executor_id"], ["id"])
    op.create_foreign_key("task_owner_id_fkey", "task", "user", ["owner_id"], ["id"])

    op.drop_column("task", "updated_at")
    op.drop_column("task", "created_at")
    op.drop_column("task", "priority")
    op.drop_column("task", "status")

    op.drop_constraint("fk_user_manager_id", "user", type_="foreignkey")
    op.drop_index("ix_user_manager_id", table_name="user")
    op.drop_index("ix_user_role", table_name="user")
    op.drop_column("user", "updated_at")
    op.drop_column("user", "created_at")
    op.drop_column("user", "manager_id")
    op.drop_column("user", "role")
