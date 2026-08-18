from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.repositories.models.enums import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    manager_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminUpdate(BaseModel):
    role: UserRole | None = None
    manager_id: int | None = None
    is_active: bool | None = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str
