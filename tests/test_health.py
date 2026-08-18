"""Health endpoint tests.

Тесты эндпоинта health.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    """Health check returns 200 and status ok.

    Проверка живости возвращает 200 и status ok.
    """
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
