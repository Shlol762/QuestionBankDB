# Deployment Guide (Temporary Reset State)

This project is currently in a reset phase for deployment.

Container deployment files and deployment scripts were intentionally removed so deployment can be redesigned later in a simpler way.

## Supported Right Now

- Local or bare-metal PostgreSQL setup
- Local backend run via `python runserver.py`
- Local frontend run via Vite (`npm run dev`) or static build (`npm run build`)

## Prerequisites

- Python 3.8+
- Node.js 18+ and npm
- PostgreSQL 13+

## First-Time Setup

1. Clone repository:

```bash
git clone https://github.com/Shlol762/QuestionBankDB.git
cd QuestionBankDB
```

2. Backend environment:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Configure environment:

```bash
cp .env.example .env
```

Set at least:

- `POSTGRES_URL=postgresql+asyncpg://USER:PASSWORD@localhost/questionbank`
- `SECRET_KEY=<strong-random-value>`

4. Run backend:

```bash
python runserver.py
```

5. Run frontend (in a separate terminal):

```bash
cd frontend
npm ci
npm run dev
```

## Build Frontend For Static Hosting

```bash
cd frontend
npm ci
npm run build
```

Build output is generated in `frontend/dist/`.

## Database Backup and Restore (Manual)

Backup:

```bash
pg_dump -U USER -d questionbank > backup_$(date +%Y%m%d_%H%M%S).sql
```

Restore:

```bash
psql -U USER -d questionbank < backup_YYYYMMDD_HHMMSS.sql
```

## Project URLs (Default Local)

- Frontend dev: `http://localhost:5173`
- Backend API/docs: `http://localhost:8000/docs`

## Important Note

Production orchestration is intentionally not defined in this temporary reset state.
A new simplified deployment approach can be introduced in a later iteration.
