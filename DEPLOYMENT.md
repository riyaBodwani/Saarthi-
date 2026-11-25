# Saarthi 2.0 — Deployment Guide

## Overview

Saarthi is a modular FastAPI + React application. Local demos can use SQLite. Production should use PostgreSQL.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Required for OCR/analysis/assistant when live AI is needed |
| `GEMINI_MODEL` | Gemini model id |
| `DATABASE_URL` | SQLAlchemy URL (`sqlite:///./saarthi.db` or `postgresql+psycopg://...`) |
| `JWT_SECRET` | Long random secret for access tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime (default 1440) |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `CLIENT_URL` | Frontend base URL |
| `FILE_STORAGE_PATH` | Local upload directory |

Never expose Gemini or JWT secrets through `VITE_` variables.

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=https://api.example.com
```

## Database

### Local / demo

SQLite is created automatically on API startup via `init_db()`.

### PostgreSQL

1. Create database and user.
2. Set `DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/saarthi`
3. Run migrations:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

The checked-in Alembic revision bootstraps core tables; startup `create_all` also ensures schema for local SQLite demos. Prefer Alembic for production schema changes going forward.

## Run production-style

```powershell
# Backend
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001

# Frontend build
cd frontend
npm.cmd ci
npm.cmd run build
# Serve frontend/dist behind nginx/caddy/static host
```

## Health checks

- `GET /health` → `{ "status": "ok" }`

## Reminders worker

In-app reminders are processed by:

```http
POST /reminders/process-due
Authorization: Bearer <token>
```

Schedule this endpoint with cron/Task Scheduler. Do not rely on an open browser tab.

## Backup

- PostgreSQL: `pg_dump`
- SQLite: copy `saarthi.db`
- Uploaded files: copy `FILE_STORAGE_PATH`

## Security checklist

- Rotate `JWT_SECRET` and Gemini keys
- Restrict `CORS_ORIGINS`
- Serve HTTPS in production
- Keep upload size limits enabled
- Do not commit `.env` files
