# Production Deployment Guide

This guide gives you a one-command install and one-command update flow while preserving database and upload data.

The one-line installer fetches a minimal runtime checkout (not full source history), then runs the normal installer.

## What this deployment does

- Runs `postgres`, `backend`, and `frontend` with Docker Compose.
- Uses persistent volumes for database and uploads:
  - `questiondb_postgres_data`
  - `questiondb_uploads_data`
- Runs Alembic migrations before backend startup.
- Creates automatic DB backup before each update.

## Prerequisites

- Docker Engine with Compose support (`docker compose`)

Linux:
- `curl`
- `openssl`

Windows:
- PowerShell 5.1+ (or PowerShell 7+)

If install exits with a missing docker error:
- Linux: install Docker Engine and docker-compose-plugin, then verify with `docker --version` and `docker compose version`.
- Windows: install Docker Desktop, start it, then verify with `docker --version` and `docker compose version`.

## First-time install

From any directory.

Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/Shlol762/QuestionBankDB/Live-Version/scripts/bootstrap-install.sh | bash
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-Expression ((Invoke-WebRequest https://raw.githubusercontent.com/Shlol762/QuestionBankDB/Live-Version/scripts/bootstrap-install.ps1).Content)"
```

What happens:
1. Generates `.env.production` from `.env.production.example` if missing.
2. Generates strong defaults for DB password and app `SECRET_KEY`.
3. Builds and starts services.
4. Waits for backend health endpoint.

Note on download size:
- The repository checkout is now minimized.
- Most data usage comes from Docker image and package layer downloads during build.

## Update to latest code

After pulling latest repository changes:

Linux:

```bash
mkdir -p scripts && curl -fsSL https://raw.githubusercontent.com/Shlol762/QuestionBankDB/Live-Version/scripts/update.sh -o scripts/update.sh && bash scripts/update.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -Command "New-Item -ItemType Directory -Force -Path .\scripts | Out-Null; Invoke-WebRequest https://raw.githubusercontent.com/Shlol762/QuestionBankDB/Live-Version/scripts/update.ps1 -OutFile .\scripts\update.ps1; powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1"
```

What happens:
1. Creates SQL backup in `backups/`.
2. Pulls newer images when available.
3. Rebuilds/restarts services.
4. Verifies backend health.

## Backup and restore

Create backup manually:

Linux:

```bash
bash scripts/backup-db.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
```

Restore from backup:

Linux:

```bash
bash scripts/restore-db.sh backups/questionbank_YYYYMMDD_HHMMSS.sql
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-db.ps1 -BackupFile .\backups\questionbank_YYYYMMDD_HHMMSS.sql
```

## Uninstall and cleanup

Safe uninstall (keeps DB/uploads volumes):

Linux:

```bash
bash scripts/uninstall.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

Full cleanup (removes DB/uploads data, backups, env file, and prunes dangling images):

Linux:

```bash
bash scripts/uninstall.sh --purge-data --purge-backups --remove-env --prune-images
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1 -PurgeData -PurgeBackups -RemoveEnv -PruneImages
```

## Important data-safety rule

Do not run `docker compose down -v` in production. The `-v` flag deletes volumes and will remove database/uploads data.

## Service management

Start/restart:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Stop services (data preserved):

```bash
docker compose --env-file .env.production -f docker-compose.production.yml down
```

View logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200
```

## URLs

- Frontend: `http://<server-ip>` or `http://<server-ip>:<FRONTEND_PORT>`
- Backend docs: `http://<server-ip>:8000/docs`
