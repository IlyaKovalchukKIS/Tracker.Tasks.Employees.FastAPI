from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.repositories.models.enums import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "title": "Prepare monthly payroll report",
                    "description": "Collect hours and generate the March payroll summary.",
                    "priority": "HIGH",
                    "deadline": "2026-09-01T17:00:00Z",
                    "executor_id": 3,
                }
            ]
        }
    )

    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: datetime | None = None
    executor_id: int | None = None
    parent_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    deadline: datetime | None = None
    executor_id: int | None = None
    parent_id: int | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    owner_id: int
    executor_id: int | None
    parent_id: int | None
    deadline: datetime | None
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    items: list[TaskRead]
    page: int
    limit: int
    total: int
