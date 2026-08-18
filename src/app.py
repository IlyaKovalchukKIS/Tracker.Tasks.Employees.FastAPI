import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.config import settings
from src.exceptions import AppError
from src.repositories.db_helper import db_helper
from src.routing import auth_router, employees_router, task_router, users_router

logger = logging.getLogger("tracker")

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

TAGS_METADATA = [
    {
        "name": "Health",
        "description": "Liveness probe used by Docker and load balancers.",
    },
    {
        "name": "Authentication",
        "description": "Register, login, refresh JWT access tokens, and revoke refresh tokens.",
    },
    {
        "name": "Users",
        "description": "Current profile and administrative user management, including role assignment.",
    },
    {
        "name": "Employees",
        "description": "Manager-facing employee directory with assigned tasks.",
    },
    {
        "name": "Tasks",
        "description": "Create, assign, filter, and update work items according to the caller's role.",
    },
]


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if len(settings.jwt_secret) < 16:
        raise RuntimeError("JWT_SECRET must be set to a random string of at least 16 characters")
    yield
    await db_helper.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "REST API for assigning and tracking employee work. "
        "Access is controlled with JWT authentication and role-based authorization "
        "(ADMIN, MANAGER, EMPLOYEE)."
    ),
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
    contact={"name": "Ilya Kovalchuk"},
    license_info={"name": "MIT"},
)

if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("Database constraint violation: %s", exc.__class__.__name__)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Resource conflict"},
    )


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    _request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, HTTPException | StarletteHTTPException | AppError):
        raise exc
    logger.exception("Unhandled application error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health", tags=["Health"], summary="Health check")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(employees_router)
app.include_router(task_router)


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        tags=TAGS_METADATA,
    )
    openapi_schema.setdefault("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Paste the access token returned by POST /auth/login.",
        }
    }
    public_paths = {"/health", "/auth/register", "/auth/login", "/auth/refresh", "/openapi.json", "/docs", "/redoc"}
    for path, methods in openapi_schema.get("paths", {}).items():
        if path in public_paths:
            continue
        for method in methods.values():
            if isinstance(method, dict):
                method.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
