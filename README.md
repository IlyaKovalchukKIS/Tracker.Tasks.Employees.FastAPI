# Employee Task Management

**English** | [Русский](README.ru.md)

REST API and bilingual web client for assigning, tracking, and updating employee work. The service is intended for teams that need a single source of truth for tasks, ownership, and progress without a full project-management suite.

## Problem

Managers need a reliable way to create work, assign it to employees, and see status. Employees need a simple way to see what they own and report progress. Most of that coordination still happens in chat and spreadsheets, which makes it hard to know who is responsible and whether work is blocked.

## Solution

This project gives a small team a backend for that workflow — JWT-authenticated users, role-based access, and a task resource with status, priority, assignee, and due dates — plus a web client so the workflow is usable without an API tool. Clients can filter, search, and paginate work instead of loading the entire dataset.

## Key Features

- User registration and login with access and refresh tokens
- Role-based access control: `ADMIN`, `MANAGER`, `EMPLOYEE`
- Task create / read / update / delete with assignment
- Task status (`TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`) and priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
- Pagination, filtering, sorting, and search
- Optional subtasks via `parent_id`
- Web client in English and Russian, switchable from any page, with light and dark themes
- Dashboard with workload, overdue work, and status / priority breakdowns
- Alembic migrations against PostgreSQL
- Automated tests and GitHub Actions CI
- Docker Compose for local and VPS-style deployment

## Architecture

```
Browser (static SPA served at /)
  ↓  fetch + Bearer token
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
- Vanilla ES modules and CSS for the web client, with no build step
- Docker / Docker Compose
- Pytest
- Node.js test runner for the web client (`npm test`)
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

## Web Client

The API serves a web client at the root URL. Start the app and open http://127.0.0.1:8000 — no separate build, dev server, or `CORS_ORIGINS` entry is needed, because the client is served from the same origin as the API.

What it covers:

- Register and sign in; the session is refreshed automatically when the access token expires
- Dashboard: total / active / overdue / completed work, status and priority mix, items that need attention, and recent tasks
- Task list with search, status / priority / assignee filters, sorting, pagination, and status counts
- Create, edit, assign, and delete tasks, with a task detail page for the full description and metadata
- Inline status changes, so employees can report progress without opening a form
- Employee directory with assigned tasks, and an administrator screen for roles, managers, and account state
- Profile page for changing your own email or password

Routes are hash-based: `#/dashboard`, `#/tasks`, `#/tasks/:id`, `#/employees`, `#/users` (administrators), `#/profile`. The interface hides what the caller's role cannot do, and the API still enforces every rule independently.

On a wide screen the client uses a sidebar and data tables. Tablets get a compact icon rail. Phones get a navigation drawer, stacked pages, and task cards instead of a seven-column table.

### Languages and appearance

English and Russian are both first-class. The switcher sits in the header on every page, including the sign-in and registration screens. The choice is stored in the browser, applied to `<html lang>`, and used for date and number formatting; on a first visit the browser's preferred language is used. Error messages returned by the API are translated as well.

A light / dark theme toggle sits next to the language switcher and follows the operating system preference until it is changed.

### Implementation

`frontend/` is plain ES modules with no build step and no runtime dependencies, so `docker compose up` serves the client unchanged. `package.json` only marks the sources as ESM and runs the client test suite. Routing is hash-based (`#/tasks/12`), which is why serving `index.html` at `/` is enough for deep links to work without rewrite rules.

```
frontend/
  index.html             # App shell
  css/styles.css         # Design tokens and components
  js/
    app.js               # Routes, access guards, session lifecycle
    core/                # API client, tokens, i18n, permissions, filters
    layout/              # Sidebar, top bar, mobile drawer
    ui/                  # Buttons, forms, tables, toasts, empty/error states
    views/               # Dashboard, auth, tasks, employees, users, profile
  tests/                 # Node test suite (npm test)
```

Tokens are kept in `localStorage`, which is convenient for a same-origin client but readable by any script on the page. If you extend this with third-party scripts, move to cookie-based sessions first.

Accessibility was part of the work rather than an afterthought: labelled controls with inline validation messages, a skip link, keyboard-navigable dialogs with a focus trap and Escape to close, `aria-current` on the active nav item, live-region toasts, and visible focus rings. Layout and motion respect `prefers-reduced-motion`.

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

Then open http://127.0.0.1:8000 for the web client, or http://127.0.0.1:8000/docs for the API documentation. The first account you register becomes the administrator.

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
| `CORS_ORIGINS` | Optional comma-separated browser origins; not needed for the bundled client |
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

The web client has its own suite (locales, permissions, filters, deadlines, metrics, API error mapping). It needs Node.js 22+ and no extra packages:

```bash
npm test
```

## Docker

```bash
cp .env.example .env
# set DB_* and JWT_SECRET

docker compose up --build
```

The API and the web client both listen on http://127.0.0.1:8000. Compose starts PostgreSQL, runs migrations, then starts Uvicorn.

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
frontend/                # Bilingual web client, served at /
package.json             # ESM marker and `npm test` for the web client
migrations/              # Alembic revisions
tests/                   # Pytest suite
deploy/nginx.example.conf
.github/workflows/ci.yml
```

## Testing

The suite covers registration and login, invalid credentials, expired tokens, refresh-token rotation, role restrictions, task CRUD and assignment, filtering, pagination, sorting, and constraint failures such as duplicate email or deleting a user who still owns tasks. It also checks that the web client is served and that the static mount does not shadow API routes. `npm test` covers the client's dictionaries, role rules, task filters, deadline logic, and API error mapping.

## CI

GitHub Actions runs on every push and pull request: install dependencies, lint with Ruff, run Pytest, run the web-client tests (`npm test`), and build the Docker image. The job fails if tests fail.

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
- CORS is disabled unless `CORS_ORIGINS` is set explicitly; the bundled client needs no exception because it is same-origin
- The web client hides actions a role cannot perform, but authorization is enforced by the service layer, never by the UI
- Known trade-off: the client stores its tokens in `localStorage`, which any script on the page can read

This does not mean the service is “secure” for every threat model. Review secrets handling, TLS, and network exposure before production use.

## Future Improvements

- Email verification and password-reset mail delivery
- Organization / team model more precise than `manager_id`
- Audit log of assignment and status changes
- Rate limiting on login
- Generated typed API client to replace the hand-written fetch layer
- Cookie-based sessions so the browser client does not keep tokens in `localStorage`

## License

MIT
