#!/usr/bin/env sh
set -eu

echo "[backend] Running database migrations..."
alembic upgrade head

echo "[backend] Starting API server..."
exec uvicorn src:app --host 0.0.0.0 --port 8000
