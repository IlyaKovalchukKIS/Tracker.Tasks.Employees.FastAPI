from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.db_helper import db_helper
from src.repositories.models import User
from src.schemas.user import (
    LogoutRequest,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserLogin,
    UserRead,
)
from src.services import auth as auth_service

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description=(
        "Create an account. The first registered user becomes an administrator. "
        "Every subsequent account is created with the EMPLOYEE role."
    ),
    responses={
        201: {"description": "User registered"},
        409: {"description": "Email already registered"},
        422: {"description": "Validation error"},
    },
)
async def register(
    payload: UserCreate,
    session: AsyncSession = Depends(db_helper.session_dependency),
) -> User:
    return await auth_service.register_user(session, payload)


@auth_router.post(
    "/login",
    response_model=TokenPair,
    summary="Login",
    description="Authenticate with email and password and receive an access token plus a refresh token.",
    responses={
        200: {"description": "Authenticated"},
        401: {"description": "Invalid credentials"},
    },
)
async def login(
    payload: UserLogin,
    session: AsyncSession = Depends(db_helper.session_dependency),
) -> TokenPair:
    return await auth_service.login_user(session, payload)


@auth_router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Refresh tokens",
    description="Exchange a valid refresh token for a new access token and a rotated refresh token.",
    responses={
        200: {"description": "Tokens rotated"},
        401: {"description": "Invalid or expired refresh token"},
    },
)
async def refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(db_helper.session_dependency),
) -> TokenPair:
    return await auth_service.refresh_tokens(session, payload.refresh_token)


@auth_router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Logout",
    description="Revoke the provided refresh token. The current access token remains valid until it expires.",
)
async def logout(
    payload: LogoutRequest,
    session: AsyncSession = Depends(db_helper.session_dependency),
) -> None:
    await auth_service.logout_user(session, payload.refresh_token)
