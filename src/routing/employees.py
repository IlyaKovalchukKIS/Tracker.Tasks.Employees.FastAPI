"""Employee HTTP endpoints.

HTTP-эндпоинты сотрудников.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import current_active_user
from src.repositories.db_helper import db_helper
from src.repositories.models import User
from src.repositories.models.enums import UserRole
from src.routing.deps import require_roles
from src.schemas.employee import EmployeeDetail, EmployeeRead
from src.services import user as user_service

employees_router = APIRouter(prefix="/employees", tags=["Employees"])


@employees_router.get(
    "",
    response_model=list[EmployeeRead],
    summary="List employees",
    description="Managers see their team and unassigned employees. Administrators see all non-admin users.",
)
async def list_employees(
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
) -> list[User]:
    """List employees in the caller's management scope.

    Возвращает сотрудников в зоне ответственности вызывающего.
    """
    return await user_service.list_employees(session, user)


@employees_router.get(
    "/{employee_id}",
    response_model=EmployeeDetail,
    summary="Get employee with assigned tasks",
    description="Return an employee profile and the tasks currently assigned to them.",
    responses={404: {"description": "Employee not found"}},
)
async def get_employee(
    employee_id: int,
    session: AsyncSession = Depends(db_helper.session_dependency),
    user: User = Depends(current_active_user),
) -> User:
    """Return an employee and their assigned tasks.

    Возвращает сотрудника и назначенные ему задачи.
    """
    return await user_service.get_employee_detail(session, user, employee_id)
