import pytest
from httpx import AsyncClient
from tests.conftest import login_user, unique_email


@pytest.mark.asyncio
async def test_employee_cannot_list_users(client: AsyncClient, employee: dict) -> None:
    response = await client.get("/users", headers=employee["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, admin: dict, employee: dict) -> None:
    response = await client.get("/users", headers=admin["headers"])
    assert response.status_code == 200
    emails = {item["email"] for item in response.json()}
    assert admin["email"] in emails
    assert employee["email"] in emails


@pytest.mark.asyncio
async def test_employee_can_read_own_profile(client: AsyncClient, employee: dict) -> None:
    response = await client.get("/users/me", headers=employee["headers"])
    assert response.status_code == 200
    assert response.json()["id"] == employee["id"]
    assert response.json()["role"] == "EMPLOYEE"


@pytest.mark.asyncio
async def test_employee_cannot_read_another_user(
    client: AsyncClient,
    admin: dict,
    employee: dict,
) -> None:
    response = await client.get(f"/users/{admin['id']}", headers=employee["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_employee_cannot_change_roles(
    client: AsyncClient,
    employee: dict,
    manager: dict,
) -> None:
    response = await client.patch(
        f"/users/{employee['id']}",
        json={"role": "ADMIN"},
        headers=employee["headers"],
    )
    assert response.status_code == 403

    still_employee = await client.get("/users/me", headers=employee["headers"])
    assert still_employee.json()["role"] == "EMPLOYEE"


@pytest.mark.asyncio
async def test_admin_can_assign_manager_and_role(
    client: AsyncClient,
    admin: dict,
    manager: dict,
    employee: dict,
) -> None:
    response = await client.patch(
        f"/users/{employee['id']}",
        json={"manager_id": manager["id"]},
        headers=admin["headers"],
    )
    assert response.status_code == 200
    assert response.json()["manager_id"] == manager["id"]


@pytest.mark.asyncio
async def test_nonexistent_user_returns_404(client: AsyncClient, admin: dict) -> None:
    response = await client.get("/users/999999", headers=admin["headers"])
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_own_profile_email(client: AsyncClient, employee: dict) -> None:
    new_email = unique_email("renamed")
    response = await client.patch(
        "/users/me",
        json={"email": new_email},
        headers=employee["headers"],
    )
    assert response.status_code == 200
    assert response.json()["email"] == new_email


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(client: AsyncClient, admin: dict) -> None:
    response = await client.delete(f"/users/{admin['id']}", headers=admin["headers"])
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_after_password_change(client: AsyncClient, employee: dict) -> None:
    new_password = "newpass123"
    response = await client.patch(
        "/users/me",
        json={"password": new_password},
        headers=employee["headers"],
    )
    assert response.status_code == 200
    tokens = await login_user(client, employee["email"], new_password)
    assert tokens["access_token"]
