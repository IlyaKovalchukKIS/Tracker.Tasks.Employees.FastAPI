# Employee Task Management API

REST API for assigning, tracking, and updating employee work. The service is intended for teams that need a single source of truth for tasks, ownership, and progress without a full project-management suite.

## Problem

Managers need a reliable way to create work, assign it to employees, and see status. Employees need a simple way to see what they own and report progress. Most of that coordination still happens in chat and spreadsheets, which makes it hard to know who is responsible and whether work is blocked.

## Solution

This API gives a small team a backend for that workflow: JWT-authenticated users, role-based access, and a task resource with status, priority, assignee, and due dates. Clients can filter, search, and paginate work instead of loading the entire dataset.

## Key Features

- User registration and login with access and refresh tokens
- Role-based access control: `ADMIN`, `MANAGER`, `EMPLOYEE`
- Task create / read / update / delete with assignment
- Task status (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`) and priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- Pagination, filtering, sorting, and search
- Optional subtasks via `parent_id`
- Alembic migrations against PostgreSQL
- Automated tests and GitHub Actions CI
- Docker Compose for local and VPS-style deployment

## Architecture

```
Client
  ↓
FastAPI (routing / validation)
  ↓
Service layer (business rules and authorization)
  ↓
SQLAlchemy (async data access)
  ↓
PostgreSQL
```

The HTTP layer stays thin. Services enforce who can create, view, update, or delete a resource. CRUD modules run database queries and load related rows with `selectinload` where a response includes nested collections.

## Tech Stack

- Python 3.12
- FastAPI
- PostgreSQL
- SQLAlchemy 2 (async)
- Alembic
- fastapi-users (password hashing and JWT access tokens)
- Docker / Docker Compose
- Pytest
- Ruff
- GitHub Actions

## Authentication

Clients register with email and password, then call `POST /auth/login` for a JWT access token and an opaque refresh token.

- Passwords are hashed; they are never stored in plain text
- Access tokens expire (default 30 minutes)
- Refresh tokens are stored as SHA-256 hashes, expire (default 7 days), and are rotated on use
- `POST /auth/logout` revokes the refresh token
- The first registered user is promoted to `ADMIN` so a new environment can be bootstrapped

Send the access token as `Authorization: Bearer <token>`.

## Roles and Permissions

| Action | ADMIN | MANAGER | EMPLOYEE |
| --- | --- | --- | --- |
| Manage users and roles | yes | no | no |
| List employees in scope | yes | yes | own record only |
| Create / assign tasks | yes | yes | no |
| View tasks | all | all | assigned only |
| Update task fields | yes | yes | status of own tasks |
| Delete tasks | any | own created tasks | no |

A manager's employee scope is: users assigned to that manager (`manager_id`) plus employees who do not yet have a manager.

## API Documentation

After the API is running, OpenAPI is available at:

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

Authorize in Swagger with the access token from `POST /auth/login`.

## Running Locally

Requires Python 3.12, Poetry, and PostgreSQL (or Docker).

```bash
cp .env.example .env
# set JWT_SECRET and database credentials in .env

poetry install
alembic upgrade head
poetry run uvicorn src.app:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

Copy `.env.example` to `.env`. The repository does not contain real secrets.

| Variable | Purpose |
| --- | --- |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL connection |
| `DB_ECHO` | Log SQL when `true` |
| `JWT_SECRET` | Signing key for access tokens |
| `JWT_ALGORITHM` | JWT algorithm (default `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime |
| `CORS_ORIGINS` | Optional comma-separated browser origins |
| `DEBUG` | Verbose application logs when `true` |

## Running Tests

Tests use an isolated in-memory SQLite database and do not require PostgreSQL.

```bash
poetry install --with dev
poetry run pytest
```

```bash
poetry run ruff check src tests
```

## Docker

```bash
cp .env.example .env
# set DB_* and JWT_SECRET

docker compose up --build
```

The API listens on http://127.0.0.1:8000. Compose starts PostgreSQL, runs migrations, then starts Uvicorn.

## Project Structure

```
src/
  app.py                 # FastAPI application, error handlers, OpenAPI
  auth.py                # JWT strategy and current-user dependency
  config/                # pydantic-settings
  exceptions.py          # Domain errors mapped to HTTP status codes
  routing/               # HTTP routers
  services/              # Business logic and authorization
  schemas/               # Request / response models
  repositories/
    models/              # SQLAlchemy models
    crud/                # Query helpers
    db_helper.py         # Async engine and session
migrations/              # Alembic revisions
tests/                   # Pytest suite
deploy/nginx.example.conf
.github/workflows/ci.yml
```

## Testing

The suite covers registration and login, invalid credentials, expired tokens, refresh-token rotation, role restrictions, task CRUD and assignment, filtering, pagination, sorting, and constraint failures such as duplicate email or deleting a user who still owns tasks.

## CI

GitHub Actions runs on every push and pull request: install dependencies, lint with Ruff, run Pytest, and build the Docker image. The job fails if tests fail.

## Deployment

The intended production path is:

```
GitHub → Docker image → VPS → Nginx → HTTPS → FastAPI → PostgreSQL
```

Practical notes:

- Keep secrets in the server environment or a secrets manager, not in git
- Run `alembic upgrade head` before serving traffic (the image entrypoint does this)
- Put Nginx in front of Uvicorn and terminate TLS there; see `deploy/nginx.example.conf`
- Do not expose PostgreSQL publicly on a VPS
- Set `DEBUG=false` and a long random `JWT_SECRET`
- This repository does not include a cloud deploy workflow; shipping to a VPS is a `docker compose pull/up` (or equivalent) on the host

## Security measures implemented

- Password hashing via fastapi-users / pwdlib
- JWT access tokens with expiration
- Refresh tokens hashed at rest and rotated
- Role checks in the service layer, not only in the router
- Registration does not accept `is_superuser` or role from the client
- Database credentials and JWT secret come from the environment
- API error responses do not include stack traces, SQL, or secrets
- Docker image runs as a non-root user
- CORS is disabled unless `CORS_ORIGINS` is set explicitly

This does not mean the service is “secure” for every threat model. Review secrets handling, TLS, and network exposure before production use.

## Future Improvements

- Email verification and password-reset mail delivery
- Organization / team model more precise than `manager_id`
- Audit log of assignment and status changes
- Rate limiting on login
- OpenAPI client generation for a frontend

## License

MIT
