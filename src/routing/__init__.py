"""HTTP routers.

HTTP-роутеры.
"""

from src.routing.auth import auth_router
from src.routing.employees import employees_router
from src.routing.task import task_router
from src.routing.users import users_router

__all__ = (
    "auth_router",
    "employees_router",
    "task_router",
    "users_router",
)
