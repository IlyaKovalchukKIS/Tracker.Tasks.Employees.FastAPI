"""Task API tests.

Тесты API задач.
"""

import pytest
from httpx import AsyncClient


async def create_task(
    client: AsyncClient,
    headers: dict,
    *,
    title: str = "Write API tests",
    description: str = "Cover authentication and task assignment.",
    **fields,
) -> dict:
    """Create a task through the API and return the JSON body.

    Создаёт задачу через API и возвращает JSON-тело ответа.
    """
    payload = {"title": title, "description": description, **fields}
    response = await client.post("/tasks", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_employee_cannot_create_task(client: AsyncClient, employee: dict) -> None:
    """Employees are forbidden from creating tasks.

    Сотрудникам запрещено создавать задачи.
    """
    response = await client.post(
        "/tasks",
        json={"title": "Should fail", "description": "Employees cannot create tasks."},
        headers=employee["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_manager_creates_and_assigns_task(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """A manager can create a task and assign it.

    Менеджер может создать задачу и назначить исполнителя.
    """
    task = await create_task(
        client,
        manager["headers"],
        title="Implement login",
        executor_id=employee["id"],
        priority="HIGH",
    )
    assert task["owner_id"] == manager["id"]
    assert task["executor_id"] == employee["id"]
    assert task["status"] == "TODO"
    assert task["priority"] == "HIGH"


@pytest.mark.asyncio
async def test_employee_sees_only_assigned_tasks(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """Employees only see tasks assigned to them.

    Сотрудники видят только назначенные им задачи.
    """
    await create_task(client, manager["headers"], title="Unassigned work")
    assigned = await create_task(
        client,
        manager["headers"],
        title="Assigned work",
        executor_id=employee["id"],
    )
    response = await client.get("/tasks", headers=employee["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == assigned["id"]


@pytest.mark.asyncio
async def test_employee_cannot_view_unassigned_task(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """An employee cannot read a task that is not assigned to them.

    Сотрудник не может прочитать задачу, которая на него не назначена.
    """
    task = await create_task(client, manager["headers"], title="Secret task")
    response = await client.get(f"/tasks/{task['id']}", headers=employee["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_employee_can_update_own_status(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """An assignee can change the status of their task.

    Исполнитель может сменить статус своей задачи.
    """
    task = await create_task(
        client,
        manager["headers"],
        title="Status update",
        executor_id=employee["id"],
    )
    response = await client.patch(
        f"/tasks/{task['id']}",
        json={"status": "IN_PROGRESS"},
        headers=employee["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_employee_cannot_change_priority(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """An employee cannot change priority.

    Сотрудник не может менять приоритет.
    """
    task = await create_task(
        client,
        manager["headers"],
        title="Locked fields",
        executor_id=employee["id"],
    )
    response = await client.patch(
        f"/tasks/{task['id']}",
        json={"priority": "CRITICAL"},
        headers=employee["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_employee_cannot_delete_task(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """An employee cannot delete a task.

    Сотрудник не может удалить задачу.
    """
    task = await create_task(
        client,
        manager["headers"],
        title="Keep me",
        executor_id=employee["id"],
    )
    response = await client.delete(f"/tasks/{task['id']}", headers=employee["headers"])
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_manager_can_delete_own_task(client: AsyncClient, manager: dict) -> None:
    """A manager can delete a task they created.

    Менеджер может удалить созданную им задачу.
    """
    task = await create_task(client, manager["headers"], title="Obsolete")
    response = await client.delete(f"/tasks/{task['id']}", headers=manager["headers"])
    assert response.status_code == 204
    missing = await client.get(f"/tasks/{task['id']}", headers=manager["headers"])
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_nonexistent_task_returns_404(client: AsyncClient, manager: dict) -> None:
    """Missing task ids return 404.

    Несуществующие id задач возвращают 404.
    """
    response = await client.get("/tasks/999999", headers=manager["headers"])
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_nonexistent_user_returns_404(client: AsyncClient, manager: dict) -> None:
    """Assigning a missing user returns 404.

    Назначение несуществующего пользователя возвращает 404.
    """
    response = await client.post(
        "/tasks",
        json={
            "title": "Broken assignment",
            "description": "Assignee does not exist.",
            "executor_id": 999999,
        },
        headers=manager["headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_filter_and_search_and_sort(
    client: AsyncClient,
    manager: dict,
    employee: dict,
) -> None:
    """Search, status/priority filters, and priority sort work together.

    Поиск, фильтры статуса/приоритета и сортировка по приоритету работают вместе.
    """
    await create_task(
        client,
        manager["headers"],
        title="backend refactor",
        description="Clean up the service layer.",
        priority="HIGH",
        executor_id=employee["id"],
    )
    await create_task(
        client,
        manager["headers"],
        title="frontend polish",
        description="Not relevant here.",
        priority="LOW",
    )
    searched = await client.get("/tasks", params={"search": "backend"}, headers=manager["headers"])
    assert searched.status_code == 200
    assert searched.json()["total"] == 1
    assert "backend" in searched.json()["items"][0]["title"]

    filtered = await client.get(
        "/tasks",
        params={"status": "TODO", "priority": "HIGH", "employee_id": employee["id"]},
        headers=manager["headers"],
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1

    unassigned = await client.get("/tasks", params={"unassigned": True}, headers=manager["headers"])
    assert unassigned.json()["total"] == 1

    sorted_resp = await client.get("/tasks", params={"sort": "-priority"}, headers=manager["headers"])
    assert sorted_resp.status_code == 200
    titles = [item["title"] for item in sorted_resp.json()["items"]]
    assert titles[0] == "backend refactor"


@pytest.mark.asyncio
async def test_pagination(client: AsyncClient, manager: dict) -> None:
    """Pagination returns the requested page size and total.

    Пагинация возвращает запрошенный размер страницы и общее число.
    """
    for index in range(3):
        await create_task(client, manager["headers"], title=f"Task {index}")

    page_one = await client.get("/tasks", params={"page": 1, "limit": 2}, headers=manager["headers"])
    assert page_one.status_code == 200
    body = page_one.json()
    assert body["page"] == 1
    assert body["limit"] == 2
    assert body["total"] == 3
    assert len(body["items"]) == 2

    page_two = await client.get("/tasks", params={"page": 2, "limit": 2}, headers=manager["headers"])
    assert len(page_two.json()["items"]) == 1


@pytest.mark.asyncio
async def test_invalid_task_payload(client: AsyncClient, manager: dict) -> None:
    """Empty title and description fail validation.

    Пустые title и description не проходят валидацию.
    """
    response = await client.post(
        "/tasks",
        json={"title": "", "description": ""},
        headers=manager["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_admin_sees_all_tasks(
    client: AsyncClient,
    admin: dict,
    manager: dict,
) -> None:
    """An admin can see tasks created by a manager.

    Администратор видит задачи, созданные менеджером.
    """
    await create_task(client, manager["headers"], title="Manager task")
    response = await client.get("/tasks", headers=admin["headers"])
    assert response.json()["total"] >= 1
