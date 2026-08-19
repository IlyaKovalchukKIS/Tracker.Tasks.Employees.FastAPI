"""User and authentication schemas.

Схемы пользователей и аутентификации.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.repositories.models.enums import UserRole


class UserCreate(BaseModel):
    """Payload for user registration.

    Тело запроса регистрации пользователя.
    """
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Payload for email/password login.

    Тело запроса входа по email и паролю.
    """
    email: EmailStr
    password: str


class UserRead(BaseModel):
    """Public user profile returned by the API.

    Публичный профиль пользователя, который отдаёт API.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    manager_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """Partial update of the current user's profile.

    Частичное обновление профиля текущего пользователя.
    """
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminUpdate(BaseModel):
    """Admin-only update of role, manager, or active flag.

    Обновление роли, менеджера или флага активности, доступное только администратору.
    """
    role: UserRole | None = None
    manager_id: int | None = None
    is_active: bool | None = None


class TokenPair(BaseModel):
    """Access token plus refresh token returned after login.

    Access-токен и refresh-токен, возвращаемые после входа.
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Payload for rotating tokens.

    Тело запроса на ротацию токенов.
    """
    refresh_token: str


class LogoutRequest(BaseModel):
    """Payload for revoking a refresh token.

    Тело запроса на отзыв refresh-токена.
    """
    refresh_token: str
