import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.models import Task, User
from tests.conftest import register_user
from tests.test_tasks import create_task


@pytest.mark.asyncio
async def test_user_email_is_unique(client: AsyncClient, session: AsyncSession) -> None:
    user = await register_user(client)
    users = (await session.execute(select(User).where(User.email == user["email"]))).scalars().all()
    assert len(users) == 1


@pytest.mark.asyncio
async def test_task_owner_relationship(
    client: AsyncClient,
    manager: dict,
    session: AsyncSession,
) -> None:
    created = await create_task(client, manager["headers"], title="Owned task")
    task = await session.get(Task, created["id"])
    assert task is not None
    assert task.owner_id == manager["id"]
    assert task.parent_id is None


@pytest.mark.asyncio
async def test_cannot_delete_user_who_owns_tasks(
    client: AsyncClient,
    admin: dict,
    manager: dict,
) -> None:
    await create_task(client, manager["headers"], title="Blocking task")
    response = await client.delete(f"/users/{manager['id']}", headers=admin["headers"])
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_subtask_parent_must_exist(client: AsyncClient, manager: dict) -> None:
    response = await client.post(
        "/tasks",
        json={
            "title": "Child",
            "description": "Parent does not exist.",
            "parent_id": 999999,
        },
        headers=manager["headers"],
    )
    assert response.status_code == 404
