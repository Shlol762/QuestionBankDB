# Deployment Guide

This project deploys with Docker Compose using prebuilt images from Docker Hub.

## Services

- `postgres`: PostgreSQL 16 with persistent named volume `postgres_data`
- `backend`: FastAPI API container with persistent named volume `uploads_data`
- `frontend`: nginx container serving the React build and proxying API routes to backend

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+

## Configure Environment

1. Create an env file that Compose auto-loads:

```bash
cp .env.production.example .env
```

2. Update values in `.env` (minimum recommended):

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- optional image tags: `BACKEND_IMAGE`, `FRONTEND_IMAGE`

`POSTGRES_URL` is generated automatically inside Compose from `POSTGRES_USER`,
`POSTGRES_PASSWORD`, and `POSTGRES_DB`.

## Deploy

Run from repository root:

```bash
docker compose pull
docker compose up -d
```

Stop services:

```bash
docker compose down
```

Do not use `down -v` unless you want to delete database and upload data.

## First Admin Bootstrap

No automatic seeding is performed in production. Create the first admin manually:

```bash
docker compose exec backend python seed_admin.py
```

## Persistence

- PostgreSQL data is stored in named volume `postgres_data`
- Uploaded files are stored in named volume `uploads_data`

These survive normal `docker compose down` and `docker compose up` cycles.

## Backup

Database backup:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backup_$(date +%Y%m%d_%H%M%S).sql
```

Restore:

```bash
cat backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```
