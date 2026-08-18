import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_employee_directory_hidden_from_employee(
    client: AsyncClient,
    employee: dict,
) -> None:
    response = await client.get("/employees", headers=employee["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_manager_can_list_employees(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    response = await client.get("/employees", headers=manager["headers"])
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert employee["id"] in ids


@pytest.mark.asyncio
async def test_employee_can_view_own_employee_record(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    await client.post(
        "/tasks",
        json={
            "title": "Assigned to employee",
            "description": "Visible on employee detail.",
            "executor_id": employee["id"],
        },
        headers=manager["headers"],
    )
    response = await client.get(f"/employees/{employee['id']}", headers=employee["headers"])
    assert response.status_code == 200
    assert response.json()["id"] == employee["id"]
    assert len(response.json()["executed_tasks"]) == 1
