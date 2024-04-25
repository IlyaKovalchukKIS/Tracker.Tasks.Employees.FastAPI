from datetime import datetime, UTC

from pydantic import BaseModel, ConfigDict


class TaskBaseSchemas(BaseModel):
    title: str
    description: str
    # deadline: datetime
    parent_id: int | None = None
    owner_id: int
    executor_id: int | None = None


class TaskCreateSchemas(TaskBaseSchemas):
    pass


class TaskReadSchemas(TaskBaseSchemas):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # date_at: datetime = datetime.now(UTC)


class TaskUpdateSchemas(TaskBaseSchemas):
    pass
