"""Authentication tests.

Тесты аутентификации.
"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import AsyncClient
from src.config import settings
from tests.conftest import TEST_PASSWORD, login_user, register_user, unique_email


@pytest.mark.asyncio
async def test_register_first_user_becomes_admin(client: AsyncClient) -> None:
    """The first registered user receives the ADMIN role.

    Первый зарегистрированный пользователь получает роль ADMIN.
    """
    user = await register_user(client)
    assert user["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_register_second_user_is_employee(client: AsyncClient) -> None:
    """Subsequent users are created as EMPLOYEE.

    Последующие пользователи создаются с ролью EMPLOYEE.
    """
    await register_user(client)
    user = await register_user(client)
    assert user["role"] == "EMPLOYEE"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    """Duplicate email registration is rejected with 409.

    Повторная регистрация того же email отклоняется с 409.
    """
    user = await register_user(client)
    response = await client.post(
        "/auth/register",
        json={"email": user["email"], "password": TEST_PASSWORD},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_rejects_short_password(client: AsyncClient) -> None:
    """Passwords shorter than 8 characters fail validation.

    Пароли короче 8 символов не проходят валидацию.
    """
    response = await client.post(
        "/auth/register",
        json={"email": unique_email(), "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success_returns_token_pair(client: AsyncClient) -> None:
    """Successful login returns access and refresh tokens.

    Успешный вход возвращает access- и refresh-токены.
    """
    user = await register_user(client)
    tokens = await login_user(client, user["email"])
    assert tokens["access_token"]
    assert tokens["refresh_token"]


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient) -> None:
    """Wrong password returns 401 without leaking the real password.

    Неверный пароль даёт 401 и не раскрывает настоящий пароль.
    """
    user = await register_user(client)
    response = await client.post(
        "/auth/login",
        json={"email": user["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "password" not in response.text.lower() or "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient) -> None:
    """Unknown email is treated as invalid credentials.

    Неизвестный email обрабатывается как неверные учётные данные.
    """
    response = await client.post(
        "/auth/login",
        json={"email": unique_email("missing"), "password": TEST_PASSWORD},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_requires_auth(client: AsyncClient) -> None:
    """Protected routes reject requests without a token.

    Защищённые маршруты отклоняют запросы без токена.
    """
    response = await client.get("/users/me")
    assert response.status_code in {401, 403}


@pytest.mark.asyncio
async def test_access_profile_with_token(client: AsyncClient) -> None:
    """A valid access token can read the current profile.

    Действующий access-токен позволяет прочитать текущий профиль.
    """
    user = await register_user(client)
    tokens = await login_user(client, user["email"])
    response = await client.get("/users/me", headers=tokens["headers"])
    assert response.status_code == 200
    assert response.json()["email"] == user["email"]


@pytest.mark.asyncio
async def test_expired_access_token_is_rejected(client: AsyncClient) -> None:
    """An expired JWT is rejected with 401.

    Истёкший JWT отклоняется с 401.
    """
    user = await register_user(client)
    expired = jwt.encode(
        {
            "sub": str(user["id"]),
            "aud": ["fastapi-users:auth"],
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    response = await client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_tokens(client: AsyncClient) -> None:
    """Refresh rotates tokens and invalidates the previous refresh token.

    Refresh ротирует токены и инвалидирует предыдущий refresh-токен.
    """
    user = await register_user(client)
    tokens = await login_user(client, user["email"])
    response = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"] != tokens["refresh_token"]

    reused = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert reused.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client: AsyncClient) -> None:
    """Logout revokes the refresh token.

    Logout отзывает refresh-токен.
    """
    user = await register_user(client)
    tokens = await login_user(client, user["email"])
    response = await client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert response.status_code == 204
    refreshed = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 401
