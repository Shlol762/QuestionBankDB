#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.production.yml"
ENV_FILE="$ROOT_DIR/.env.production"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Run scripts/install.sh first."
  exit 1
fi

print_backend_diagnostics() {
  echo
  echo "Startup diagnostics:"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
  echo "--- backend logs (last 200 lines) ---"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=200 backend || true
  echo "--- postgres logs (last 80 lines) ---"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 postgres || true
  echo
}

echo "Step 1/4: Creating pre-update database backup..."
"$ROOT_DIR/scripts/backup-db.sh"

echo "Step 2/4: Pulling latest images (if available)..."
set +e
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
set -e

echo "Step 3/4: Rebuilding/restarting services..."
set +e
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
compose_rc=$?
set -e

if [[ $compose_rc -ne 0 ]]; then
  echo "Compose reported a startup failure (exit $compose_rc)."
  print_backend_diagnostics
  exit 1
fi

echo "Step 4/4: Verifying backend health..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
  echo "Update verification failed. Inspect logs with:"
  echo "docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=200"
  print_backend_diagnostics
  exit 1
fi

echo "Update complete."
