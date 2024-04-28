from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi_users import FastAPIUsers
from src.auth.db_user import User as UserSchemas
from src.auth.manager import get_user_manager, auth_backend
from src.auth.schemas import UserRead, UserCreate
from src.core.models.db_helper import db_helper
from src.core.models.task_model import Task
from src.core.models.user_model import User
from src.task import task_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Создание таблиц перед запуском приложения"""
    async with db_helper.engine.begin() as conn:
        # await conn.run_sync(Task.metadata.drop_all)
        await conn.run_sync(User.metadata.create_all)
        await conn.run_sync(Task.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)
fastapi_users = FastAPIUsers[UserSchemas, int](
    get_user_manager,
    [auth_backend],
)

app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(task_router)

if __name__ == "__main__":
    uvicorn.run("src.main:app", reload=True)
