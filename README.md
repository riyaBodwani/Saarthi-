# Saarthi 2.0

Saarthi helps college students understand administrative notices without decoding dense circulars on their own.

**Tagline:** Understand your college notices. Never miss what matters.

## What works now

- Upload PDF/PNG/JPEG notices and analyze them with Gemini (English / Hindi / Marathi)
- Evidence-grounded analysis page with copy, download, and print/PDF
- Session library + optional authenticated persistence (SQLite by default, PostgreSQL ready)
- Register / login / JWT-protected notice library
- Ask Saarthi grounded assistant (document-only answers)
- Calendar, action items, reminders, and in-app notifications
- Dashboard stats from real session or saved notices (never fabricated)

## Stack

- Frontend: React 19, Vite, Tailwind CSS 4, lucide-react
- Backend: FastAPI, PyMuPDF, Pillow, Google GenAI, SQLAlchemy, Alembic, JWT/bcrypt

## Local setup

### Backend

```powershell
cd E:\project\Saarthi--main\backend
py -3 -m venv .venv
Copy-Item .env.example .env
notepad .env
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Set at least:
- `GEMINI_API_KEY`
- `JWT_SECRET` (long random string)
- optional `DATABASE_URL` (defaults to local SQLite `saarthi.db`)

Health: `http://127.0.0.1:8001/health`

### Frontend

```powershell
cd E:\project\Saarthi--main\frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

`VITE_API_BASE_URL=http://127.0.0.1:8001`

Never put Gemini secrets in frontend env files.

## Tests

```powershell
cd E:\project\Saarthi--main\backend
.\.venv\Scripts\python.exe test_evidence.py
.\.venv\Scripts\python.exe test_app_auth_notices.py
# Legacy extraction/analysis suite (expects package-style import in some environments):
.\.venv\Scripts\python.exe test_main.py

cd E:\project\Saarthi--main\frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Gemini is mocked or avoided in automated backend auth/assistant tests.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).

## Phase status

| Phase | Status |
|---|---|
| 1 Design foundation | Done |
| 2 Analysis + evidence | Done |
| 3 DB + auth + library | Done (SQLite default; PostgreSQL via `DATABASE_URL`) |
| 4 Ask Saarthi | Done (grounded; live Gemini optional) |
| 5 Calendar + reminders | Done (process via `POST /reminders/process-due`) |
| 6 Production hardening | Partial — modular routers, env config, deployment docs; legacy `main.py` extract/analyze retained for compatibility |
