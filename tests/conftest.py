"""Pytest fixtures and helpers.

Фикстуры и хелперы Pytest.
"""

import os
from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-pytest-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "test")

from src.app import app  # noqa: E402
from src.repositories.db_helper import db_helper  # noqa: E402
from src.repositories.models import Base  # noqa: E402

TEST_PASSWORD = "password123"


def unique_email(prefix: str = "user") -> str:
    """Build a unique test email address.

    Собирает уникальный тестовый email.
    """
    return f"{prefix}-{uuid4().hex[:10]}@example.com"


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an isolated in-memory SQLite session.

    Отдаёт изолированную in-memory сессию SQLite.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    async with factory() as db_session:
        yield db_session

    await engine.dispose()


@pytest.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client bound to the test database session.

    HTTP-клиент, привязанный к тестовой сессии БД.
    """
    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        """Yield the shared test session to FastAPI.

        Отдаёт общую тестовую сессию в FastAPI.
        """
        yield session

    app.dependency_overrides[db_helper.session_dependency] = override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()


async def register_user(client: AsyncClient, email: str | None = None) -> dict:
    """Register a user and return id, email, password, and role.

    Регистрирует пользователя и возвращает id, email, пароль и роль.
    """
    payload = {"email": email or unique_email(), "password": TEST_PASSWORD}
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    return {"email": payload["email"], "password": TEST_PASSWORD, "id": body["id"], "role": body["role"]}


async def login_user(client: AsyncClient, email: str, password: str = TEST_PASSWORD) -> dict:
    """Log in and return tokens plus an Authorization header.

    Выполняет вход и возвращает токены плюс заголовок Authorization.
    """
    response = await client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    tokens = response.json()
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"},
    }


@pytest.fixture
async def admin(client: AsyncClient) -> dict:
    """First registered user, which becomes ADMIN.

    Первый зарегистрированный пользователь, который становится ADMIN.
    """
    user = await register_user(client, unique_email("admin"))
    tokens = await login_user(client, user["email"])
    return {**user, **tokens}


@pytest.fixture
async def manager(client: AsyncClient, admin: dict) -> dict:
    """Registered user promoted to MANAGER by the admin.

    Зарегистрированный пользователь, которого админ повысил до MANAGER.
    """
    user = await register_user(client, unique_email("manager"))
    response = await client.patch(
        f"/users/{user['id']}",
        json={"role": "MANAGER"},
        headers=admin["headers"],
    )
    assert response.status_code == 200, response.text
    tokens = await login_user(client, user["email"])
    return {**user, **tokens, "role": "MANAGER"}


@pytest.fixture
async def employee(client: AsyncClient, admin: dict) -> dict:
    """Registered user who remains EMPLOYEE.

    Зарегистрированный пользователь с ролью EMPLOYEE.
    """
    user = await register_user(client, unique_email("employee"))
    tokens = await login_user(client, user["email"])
    return {**user, **tokens}
