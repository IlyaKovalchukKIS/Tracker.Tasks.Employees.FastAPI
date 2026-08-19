"""Tests for serving the bundled web client.

Тесты раздачи встроенного веб-клиента.
"""

from httpx import AsyncClient


async def test_root_serves_the_web_client(client: AsyncClient) -> None:
    """GET / returns the single-page application shell.

    GET / возвращает оболочку одностраничного приложения.
    """
    response = await client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert 'id="header-root"' in response.text


async def test_static_assets_are_served(client: AsyncClient) -> None:
    """Stylesheet and entry script are reachable with sensible content types.

    Таблица стилей и точка входа доступны с корректными content-type.
    """
    stylesheet = await client.get("/css/styles.css")
    script = await client.get("/js/app.js")

    assert stylesheet.status_code == 200
    assert stylesheet.headers["content-type"].startswith("text/css")
    assert script.status_code == 200
    assert "javascript" in script.headers["content-type"]


async def test_nested_modules_are_served(client: AsyncClient) -> None:
    """The client imports ES modules from subdirectories, which must resolve.

    Клиент импортирует ES-модули из подкаталогов, они должны отдаваться.
    """
    for path in ("/js/core/api.js", "/js/ui/primitives.js", "/js/views/tasks/list.js"):
        response = await client.get(path)

        assert response.status_code == 200, path
        assert "javascript" in response.headers["content-type"], path


async def test_api_routes_take_priority_over_static_files(client: AsyncClient) -> None:
    """The static mount must not shadow API endpoints or the OpenAPI schema.

    Статика не должна перекрывать эндпоинты API и схему OpenAPI.
    """
    health = await client.get("/health")
    schema = await client.get("/openapi.json")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert schema.status_code == 200
    assert "/tasks" in schema.json()["paths"]


async def test_unknown_static_path_returns_json_error(client: AsyncClient) -> None:
    """Missing files keep the API's JSON error shape.

    Отсутствующие файлы отдают ошибку в том же JSON-формате, что и API.
    """
    response = await client.get("/js/does-not-exist.js")

    assert response.status_code == 404
    assert "detail" in response.json()
