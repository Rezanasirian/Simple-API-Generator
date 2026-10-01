# Simple API Generator

Turn tables and collections in your databases into filterable REST APIs, without writing code.

Pick a data source and a table, choose which parameters callers may filter by and which fields
they get back, try it live, and save. The API is immediately available at `/api/<id>`, protected
by API keys, documented in OpenAPI, and tracked on the dashboard.

- **Data sources:** MongoDB, MySQL, PostgreSQL, Trino and SQLite
- **Filters:** `=`, `!=`, `<`, `<=`, `>`, `>=`, `LIKE`, `CONTAINS`, `STARTS WITH`, `IN`, `NOT IN`,
  `IS NULL`, with type checking, validation rules, "skip when value is …", and optional SQL column
  transforms (cast, substring, trim, replace)
- **Responses:** choose fields, add computed fields (templates, concat, upper/lower, substring,
  replace), pagination and sorting
- **Security:** values are always bound as query parameters and identifiers are quoted; API keys
  are stored hashed; panel login uses JWTs; data source passwords are never sent to the browser
- **Operations:** dashboard with call volume, error rate and latency; JSON export/import of APIs;
  OpenAPI docs at `/docs` that include every generated API

## Architecture

```
backend/    FastAPI + SQLAlchemy — panel API (/admin-api), generated APIs (/api/{id}), docs (/docs)
frontend/   React 19 + Vite + TypeScript + Tailwind + shadcn/ui
```

The backend keeps its own data (users, API keys, data sources, API definitions and the call log)
in an internal database, SQLite by default. In production it also serves the built frontend.

## Getting started

Requirements: Python 3.11+ and Node.js 20+.

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # set SECRET_KEY and ADMIN_PASSWORD
uvicorn app.main:app --reload
```

On first start an `admin` user is created with `ADMIN_PASSWORD`. If that variable is not set, a
random password is generated and printed to the log.

### Frontend (development)

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies API calls to :8000
```

### Production

```bash
cd frontend && npm ci && npm run build      # writes frontend/dist
cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend serves `frontend/dist` at `/` when it exists. Set `FRONTEND_DIST` to use another path.

## Configuration

Backend settings come from environment variables or `backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./data/app.db` | Internal database (any SQLAlchemy URL) |
| `SECRET_KEY` | random per process | Signs login tokens; set it, or everyone is logged out on restart |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / random | First admin account |
| `ALLOW_REGISTRATION` | `false` | Let people create their own (non-admin) accounts |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `720` | Login session length |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Origins allowed to call the panel API |
| `FRONTEND_DIST` | `../frontend/dist` | Built frontend to serve |

Target database connections are not configured here: admins add them on the **Data sources** page.

## Calling a generated API

```bash
curl -X POST 'http://localhost:8000/api/companies?limit=20&offset=0&order_by=name' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: sag_...' \
  -d '{"category_code": "web", "since": 2010}'
```

```json
{
  "api": "companies",
  "version": "1.0.0",
  "data": [{ "name": "Acme", "category_code": "web", "founded_year": 2012 }],
  "pagination": { "limit": 20, "offset": 0, "total": 57, "page": 1, "total_pages": 3 },
  "ordering": { "field": "name", "direction": "ASC" }
}
```

- `GET` works too, with filters in the query string.
- `limit`, `offset`, `order_by` and `order_direction` can be sent in the query string or the body.
  `limit` is capped at the API's maximum.
- Invalid parameters return `400` with an `errors` object keyed by parameter.
- APIs marked public need no key. Signed-in panel users can add `?debug=1` to see the generated query.

## Users and roles

- **admin:** everything, including users and data sources
- **user:** create, edit and test APIs, and manage their own API keys

## Migrating from the Flask version

API definitions used to live in `config/ApiDoc.json`. To import them:

1. Start the new backend and add the database on **Data sources**, e.g. under the name `Mongo`.
2. Run:

```bash
cd backend
python -m app.cli import-legacy path/to/ApiDoc.json --data-source Mongo
```

Conditions, validation, paging, ordering, response fields and `CONCAT(...)` transformations are
converted. The "last update table" setting no longer exists and is skipped with a warning.
Old user accounts are not migrated. Create them again, or reset a password with
`python -m app.cli create-admin <username> <password>`.

## Development

```bash
cd backend && pytest && ruff check . && ruff format --check .
cd frontend && npm run build && npm run lint
```

Backend tests run real queries against SQLite and against MongoDB through `mongomock`, and check
the SQL generated for MySQL, PostgreSQL and Trino.
