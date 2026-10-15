# Calculator

A small, keyboard-friendly calculator with persistent history. It is a two-tier
project: a FastAPI + SQLite backend that evaluates arithmetic expressions and
persists history, and a React + Vite + Tailwind frontend that talks to it.

## Features

- Decimal-accurate arithmetic (+, -, *, /, parentheses, unary minus/plus).
- Rejects malformed input and division by zero with HTTP 400.
- Persistent calculation history in SQLite, surviving server restarts.
- Paginated history listing (`limit`, `offset`).
- Per-item delete and "clear all" endpoints.
- React UI with editable display, on-screen keypad, keyboard shortcuts, and a
  live history panel with per-row delete and inline two-step clear-all.
- Two-pane responsive layout (calculator + history on `lg+`, stacked on
  smaller viewports).
- Accessibility: ARIA labels on icon buttons, focus-visible rings, keyboard
  navigation, `prefers-reduced-motion` respected, >=44px tap targets.
- Tailwind v4 (CSS-first via `@tailwindcss/vite`; no `postcss.config.js`,
  no `tailwind.config.js`).

## Stack

- Backend: Python 3.13, FastAPI, Pydantic v2, SQLite (stdlib `sqlite3`),
  `uvicorn`. Tests use `pytest` + `fastapi.testclient` (which pulls
  `httpx`). Managed with [uv](https://docs.astral.sh/uv/) for the venv and
  dependency install.
- Frontend: Vite, React 19, TypeScript (strict), Tailwind CSS v4 via
  `@tailwindcss/vite`.

## Prerequisites

- Python 3.13
- [uv](https://docs.astral.sh/uv/) (for the Python venv and dependency install)
- Node 20+ and npm

## Backend quickstart

From the repo root:

```bash
cd backend
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r requirements.txt -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --app-dir . --reload
```

The server listens on `http://127.0.0.1:8000` by default. The production
database file is **not** created at import time — it is created the first time
the server starts (via the FastAPI lifespan).

## Frontend quickstart

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

The dev server listens on `http://127.0.0.1:5173` by default. Vite proxies any
`/api/*` request to `http://127.0.0.1:8000`, so run the backend on 8000 (or
edit `frontend/vite.config.ts` to point at a different host/port) and the
browser will reach it same-origin.

## Tests

Backend unit + integration tests (42 tests):

```bash
cd backend
.venv/bin/pytest -q
```

The frontend does not ship unit tests. Its check is the production build.

## Type-check and build

```bash
cd frontend
npm run build
```

This runs `tsc -b` (strict typecheck) and then `vite build`. Output goes to
`frontend/dist/`.

## Production notes

For a real deployment, build the frontend and serve it from the same origin
as the API:

```bash
cd frontend
npm run build
cd ..
# Serve frontend/dist statically, and have any non-asset request that isn't
# /api/* fall back to dist/index.html so the SPA can boot.
# Run the backend behind a reverse proxy (uvicorn is single-process by
# default; front it with nginx, Caddy, or another WSGI/ASGI server for
# production).
```

For local "production" you can also use `vite preview`:

```bash
cd frontend
npm run build
npm run preview
```

Vite preview still only proxies `/api/*` to the dev backend, so make sure
the backend is running on port 8000.

## API reference

All endpoints accept and return JSON. Errors come back as
`{"detail": "<message>"}` with the listed status.

| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| GET    | `/api/health` | — | `200 {"status":"ok"}` | — |
| POST   | `/api/calculations` | `{"expression":"<str, 1-200 chars>"}` | `201 CalculationResponse` | `400 Invalid expression`, `400 Division by zero`, `422` (schema) |
| GET    | `/api/history?limit=&offset=` | — | `200 HistoryResponse` | `422` (bad query params) |
| DELETE | `/api/history/{item_id}` | — | `204` (no body) | `404 History item not found` |
| DELETE | `/api/history` | — | `204` (no body) | — |

Schemas:

- `CalculationResponse = { id:int, expression:str, result:str, created_at:str }`
- `HistoryResponse = { items:HistoryItem[], total:int }`
- `HistoryItem = { id:int, expression:str, result:str, created_at:str }`
- `HealthResponse = { status: str }`

Query params on the history list:

- `limit` (default 50, 1..200)
- `offset` (default 0, >=0)

Response fields:

- `result` is a stringified decimal (e.g. `"84"`, `"0.3"`), formatted to
  avoid exponent notation.
- `created_at` is an ISO 8601 timestamp with microseconds and a UTC offset.

### Examples

```bash
# Health check
curl http://127.0.0.1:8000/api/health

# Evaluate 12 * (3 + 4) -> 84
curl -X POST http://127.0.0.1:8000/api/calculations \
  -H 'content-type: application/json' \
  -d '{"expression":"12 * (3 + 4)"}'

# Division by zero -> 400
curl -X POST http://127.0.0.1:8000/api/calculations \
  -H 'content-type: application/json' \
  -d '{"expression":"1/0"}'

# List history
curl 'http://127.0.0.1:8000/api/history?limit=10'

# Delete a single record
curl -X DELETE http://127.0.0.1:8000/api/history/1

# Clear all history
curl -X DELETE http://127.0.0.1:8000/api/history
```

## Keyboard shortcuts

When the page is focused (outside the expression input):

| Key | Action |
|-----|--------|
| `0`-`9`, `.` | Enter digits / decimal point |
| `+`, `-`, `*`, `/` | Operators |
| `Enter` or `=` | Evaluate |
| `Esc` | Clear the current expression |
| `Backspace` | Delete the last character

When the expression input is focused, browser-native editing applies; the
component only intercepts `Enter` (evaluate) and `Escape` (clear), so
digit/operator/backspace flow through naturally without double-processing.
`Ctrl`, `Cmd`, `Meta`, and `Alt` combinations are never hijacked.

## Configuration

The backend reads its database path from the `CALC_DB_PATH` environment
variable. If unset, it defaults to `backend/data/calculator.db`. The
directory is created on startup if it does not exist.

```bash
CALC_DB_PATH=/var/lib/calculator/calculator.db \
  .venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

## Project structure

```
calculator-app/
|-- README.md
|-- .gitignore
|-- backend/
|   |-- requirements.txt
|   |-- requirements-dev.txt
|   |-- app/
|   |   |-- __init__.py
|   |   |-- calculator.py     # Tokenizer + recursive-descent parser (decimal.Decimal)
|   |   |-- database.py       # SQLite access (one connection per request)
|   |   |-- schemas.py        # Pydantic v2 request/response models
|   |   `-- main.py           # FastAPI app, routes, exception handlers
|   `-- tests/
|       |-- __init__.py
|       |-- conftest.py       # Isolated temp-DB fixtures
|       |-- test_calculator.py
|       `-- test_api.py
`-- frontend/
    |-- package.json
    |-- package-lock.json
    |-- vite.config.ts        # React + Tailwind v4 plugins, /api proxy -> :8000
    |-- index.html
    |-- tsconfig.json
    |-- tsconfig.app.json
    |-- tsconfig.node.json
    |-- .gitignore            # Ignores node_modules/ and dist/ for the frontend
    |-- .oxlintrc.json
    |-- public/
    |   `-- favicon.svg
    `-- src/
        |-- main.tsx
        |-- App.tsx
        |-- api.ts            # Typed fetch wrapper + error mapping
        |-- types.ts          # Shared API types
        |-- index.css         # Tailwind v4 @theme + design tokens
        `-- components/
            |-- Calculator.tsx
            |-- Display.tsx
            |-- Keypad.tsx
            |-- HistoryPanel.tsx
            `-- icons.tsx
```

## Commit authorship

The three commits in this repository were created by an AI assistant (`Hermes
Agent`, repo-local identity `hermes-agent@localhost`). Before pushing to a
remote, set your own identity and re-author every commit with:

```bash
git rebase --exec 'git commit --amend --reset-author --no-edit' -i --root
```