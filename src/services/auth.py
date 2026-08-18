import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from fastapi_users.password import PasswordHelper
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.exceptions import ConflictError, UnauthorizedError
from src.repositories.crud.refresh_token import create_refresh_token, get_refresh_token_by_hash
from src.repositories.crud.user import count_users, get_user_by_email, get_user_by_id
from src.repositories.models import User
from src.repositories.models.enums import UserRole
from src.schemas.user import TokenPair, UserCreate, UserLogin

password_helper = PasswordHelper()


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


async def _issue_token_pair(session: AsyncSession, user: User) -> TokenPair:
    from src.auth import get_jwt_strategy

    access_token = await get_jwt_strategy().write_token(user)
    refresh_token = generate_refresh_token()
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    await create_refresh_token(
        session,
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=expires_at,
    )
    await session.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


async def register_user(session: AsyncSession, payload: UserCreate) -> User:
    existing = await get_user_by_email(session, payload.email)
    if existing is not None:
        raise ConflictError("Email is already registered")

    is_first_user = await count_users(session) == 0
    role = UserRole.ADMIN if is_first_user else UserRole.EMPLOYEE
    user = User(
        email=payload.email,
        hashed_password=password_helper.hash(payload.password),
        is_active=True,
        is_superuser=is_first_user,
        is_verified=True,
        role=role,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def login_user(session: AsyncSession, payload: UserLogin) -> TokenPair:
    user = await get_user_by_email(session, payload.email)
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid email or password")

    verified, updated_hash = password_helper.verify_and_update(
        payload.password,
        user.hashed_password,
    )
    if not verified:
        raise UnauthorizedError("Invalid email or password")
    if updated_hash is not None:
        user.hashed_password = updated_hash
        await session.commit()

    return await _issue_token_pair(session, user)


async def refresh_tokens(session: AsyncSession, refresh_token: str) -> TokenPair:
    record = await get_refresh_token_by_hash(session, hash_refresh_token(refresh_token))
    now = datetime.now(UTC)
    if (
        record is None
        or record.revoked
        or record.expires_at.replace(tzinfo=record.expires_at.tzinfo or UTC) < now
    ):
        raise UnauthorizedError("Invalid or expired refresh token")

    user = await get_user_by_id(session, record.user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Invalid or expired refresh token")

    record.revoked = True
    await session.flush()
    return await _issue_token_pair(session, user)


async def logout_user(session: AsyncSession, refresh_token: str) -> None:
    record = await get_refresh_token_by_hash(session, hash_refresh_token(refresh_token))
    if record is None or record.revoked:
        return
    record.revoked = True
    await session.commit()
