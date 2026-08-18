#!/bin/sh
# Run database migrations, then start the API.
# Применяет миграции базы данных и запускает API.
set -e
alembic upgrade head
exec uvicorn src.app:app --host 0.0.0.0 --port 8000
