"""Refresh token query helpers.

Хелперы запросов refresh-токенов.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.models import RefreshToken


async def get_refresh_token_by_hash(
    session: AsyncSession,
    token_hash: str,
) -> RefreshToken | None:
    """Find a refresh token by its SHA-256 hash.

    Находит refresh-токен по SHA-256 хешу.
    """
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_refresh_token(
    session: AsyncSession,
    *,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
) -> RefreshToken:
    """Persist a new hashed refresh token.

    Сохраняет новый хешированный refresh-токен.
    """
    record = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked=False,
    )
    session.add(record)
    await session.flush()
    return record
