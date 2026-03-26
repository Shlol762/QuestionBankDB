#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="Shlol762"
REPO_NAME="QuestionBankDB"
BRANCH="Live-Version"
ARCHIVE_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.production.yml"
ENV_FILE="$ROOT_DIR/.env.production"
EXAMPLE_ENV_FILE="$ROOT_DIR/.env.production.example"

RUNTIME_PATHS=(
  scripts
  src
  frontend
  docker-compose.production.yml
  Dockerfile.backend
  Dockerfile.frontend
  requirements.txt
  alembic.ini
  .dockerignore
  .env.production.example
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Missing required command '$1'."
    exit 1
  fi
}

sync_from_github_archive() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "Syncing runtime files from GitHub (${BRANCH})..."
  curl -fsSL "$ARCHIVE_URL" -o "$tmp_dir/repo.tar.gz"
  tar -xzf "$tmp_dir/repo.tar.gz" -C "$tmp_dir"

  local extracted_dir
  extracted_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name "${REPO_NAME}-*" | head -n 1)"
  if [[ -z "$extracted_dir" ]]; then
    echo "Error: Failed to extract repository archive from GitHub."
    exit 1
  fi

  for path in "${RUNTIME_PATHS[@]}"; do
    rm -rf "$ROOT_DIR/$path"
    cp -a "$extracted_dir/$path" "$ROOT_DIR/$path"
  done
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return
  fi

  if [[ ! -f "$EXAMPLE_ENV_FILE" ]]; then
    echo "Error: Missing $EXAMPLE_ENV_FILE after sync."
    exit 1
  fi

  cp "$EXAMPLE_ENV_FILE" "$ENV_FILE"
  local db_pass
  local secret
  db_pass="$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
  secret="$(openssl rand -hex 32)"

  sed -i "s|POSTGRES_PASSWORD=replace_me_with_strong_password|POSTGRES_PASSWORD=${db_pass}|" "$ENV_FILE"
  sed -i "s|POSTGRES_URL=postgresql+asyncpg://questionbank:replace_me_with_strong_password@postgres:5432/questionbank|POSTGRES_URL=postgresql+asyncpg://questionbank:${db_pass}@postgres:5432/questionbank|" "$ENV_FILE"
  sed -i "s|SECRET_KEY=replace_me_with_long_random_secret|SECRET_KEY=${secret}|" "$ENV_FILE"

  echo "Generated $ENV_FILE with secure defaults."
}

require_cmd docker
require_cmd curl
require_cmd tar
require_cmd cp
require_cmd openssl

sync_from_github_archive
ensure_env_file

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
