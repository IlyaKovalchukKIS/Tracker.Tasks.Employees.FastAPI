"""Domain enumerations for roles, task status, and priority.

Доменные перечисления ролей, статусов и приоритетов задач.
"""

from enum import Enum


class UserRole(str, Enum):
    """Application role used for authorization.

    Роль приложения, используемая для авторизации.
    """

    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"


class TaskStatus(str, Enum):
    """Lifecycle status of a task.

    Статус жизненного цикла задачи.
    """

    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class TaskPriority(str, Enum):
    """Business priority of a task.

    Бизнес-приоритет задачи.
    """

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
