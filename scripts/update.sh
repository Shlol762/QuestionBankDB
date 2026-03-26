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

compute_project_hash() {
  if command -v sha1sum >/dev/null 2>&1; then
    printf "%s" "$1" | sha1sum | cut -c1-8
    return
  fi
  printf "%s" "$1" | cksum | awk '{print $1}'
}

PROJECT_HASH="$(compute_project_hash "$ROOT_DIR")"
COMPOSE_PROJECT_NAME="questionbankdb_${PROJECT_HASH}"
DB_VOLUME_NAME="${COMPOSE_PROJECT_NAME}_postgres_data"
CREDENTIAL_CACHE_DIR="${HOME}/.questionbankdb"
CREDENTIAL_CACHE_FILE="${CREDENTIAL_CACHE_DIR}/${COMPOSE_PROJECT_NAME}.env.production"

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
    case "$1" in
      docker)
        echo "Install Docker Engine + Compose plugin, then retry."
        ;;
      curl)
        echo "Install curl, then retry."
        ;;
      tar)
        echo "Install tar, then retry."
        ;;
      openssl)
        echo "Install openssl, then retry."
        ;;
    esac
    exit 1
  fi
}

print_docker_access_help() {
  local docker_info_output
  docker_info_output="$1"

  echo "Error: Docker daemon is not available."
  if echo "$docker_info_output" | grep -qi "permission denied"; then
    echo "Reason: current user cannot access Docker socket."
    echo "Fix (Linux) - copy/paste these commands:"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    echo "  docker info"
    echo "Then rerun update:"
    echo "  curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/scripts/update.sh | bash"
    return
  fi

  echo "Fix (Linux) - copy/paste these commands:"
  echo "  sudo systemctl enable --now docker"
  echo "  sudo systemctl status docker --no-pager"
  echo "  docker info"
  echo "If docker info still fails with permission denied, run:"
  echo "  sudo usermod -aG docker \$USER"
  echo "  newgrp docker"
  echo "Then rerun update:"
  echo "  curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/scripts/update.sh | bash"
  echo
  echo "Raw docker error:"
  echo "$docker_info_output"
}

validate_docker_ready() {
  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: Docker Compose plugin is missing."
    echo "Fix: install docker-compose-plugin (or Docker Desktop with Compose), then retry."
    exit 1
  fi

  local docker_info_output
  set +e
  docker_info_output="$(docker info 2>&1)"
  local docker_info_rc=$?
  set -e
  if [[ $docker_info_rc -ne 0 ]]; then
    print_docker_access_help "$docker_info_output"
    exit 1
  fi
}

sync_from_github_archive() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "Syncing runtime files from GitHub (${BRANCH})..."
  if ! curl --retry 3 --retry-delay 2 --connect-timeout 20 -fsSL "$ARCHIVE_URL" -o "$tmp_dir/repo.tar.gz"; then
    echo "Error: Failed to download project archive from GitHub."
    echo "Check internet/DNS access and verify URL is reachable:"
    echo "  $ARCHIVE_URL"
    exit 1
  fi
  tar -xzf "$tmp_dir/repo.tar.gz" -C "$tmp_dir"

  local extracted_dir
  extracted_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name "${REPO_NAME}-*" | head -n 1)"
  if [[ -z "$extracted_dir" ]]; then
    echo "Error: Failed to extract repository archive from GitHub."
    exit 1
  fi

  for path in "${RUNTIME_PATHS[@]}"; do
    if [[ ! -e "$extracted_dir/$path" ]]; then
      echo "Error: GitHub archive is missing required path: $path"
      exit 1
    fi
    rm -rf "$ROOT_DIR/$path"
    cp -a "$extracted_dir/$path" "$ROOT_DIR/$path"
  done
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    mkdir -p "$CREDENTIAL_CACHE_DIR"
    cp "$ENV_FILE" "$CREDENTIAL_CACHE_FILE"
    chmod 600 "$CREDENTIAL_CACHE_FILE" 2>/dev/null || true
    return
  fi

  if docker volume inspect "$DB_VOLUME_NAME" >/dev/null 2>&1; then
    if [[ -f "$CREDENTIAL_CACHE_FILE" ]]; then
      cp "$CREDENTIAL_CACHE_FILE" "$ENV_FILE"
      chmod 600 "$ENV_FILE" 2>/dev/null || true
      echo "Recovered DB credentials from cache: $CREDENTIAL_CACHE_FILE"
      return
    fi

    echo "Error: Existing database volume detected: $DB_VOLUME_NAME"
    echo "No $ENV_FILE found, and generating a new password would break DB authentication."
    echo "No credential cache found at: $CREDENTIAL_CACHE_FILE"
    echo
    echo "Choose one option:"
    echo "1) Reuse existing data: restore the original .env.production for this folder, then rerun update."
    echo "2) Fresh reset (deletes old DB data):"
    echo "   docker compose --project-name $COMPOSE_PROJECT_NAME --env-file $ENV_FILE -f $COMPOSE_FILE down -v --remove-orphans"
    echo "   docker volume rm $DB_VOLUME_NAME"
    echo "   curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/scripts/install.sh | bash"
    exit 1
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

  mkdir -p "$CREDENTIAL_CACHE_DIR"
  cp "$ENV_FILE" "$CREDENTIAL_CACHE_FILE"
  chmod 600 "$CREDENTIAL_CACHE_FILE" 2>/dev/null || true
  echo "Saved DB credentials cache to: $CREDENTIAL_CACHE_FILE"
}

require_cmd docker
require_cmd curl
require_cmd tar
require_cmd cp
require_cmd openssl
validate_docker_ready

sync_from_github_archive
ensure_env_file

print_backend_diagnostics() {
  echo
  echo "Startup diagnostics:"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps || true
  echo "--- backend logs (last 200 lines) ---"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=200 backend || true
  echo "--- postgres logs (last 80 lines) ---"
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 postgres || true
  echo
}

print_db_credentials_mismatch_help_if_detected() {
  local backend_logs
  backend_logs="$(docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=300 backend 2>/dev/null || true)"
  if echo "$backend_logs" | grep -Eqi "InvalidPasswordError|password authentication failed for user"; then
    echo "Detected database credential mismatch between $ENV_FILE and existing Postgres volume."
    echo "Fix options:"
    echo "1) Reuse existing data: restore the original .env.production used when DB was created."
    echo "2) Fresh install (data loss):"
    echo "   docker compose --project-name $COMPOSE_PROJECT_NAME --env-file $ENV_FILE -f $COMPOSE_FILE down -v --remove-orphans"
    echo "   docker volume rm $DB_VOLUME_NAME"
    echo "   curl -fsSL https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/scripts/install.sh | bash"
    echo
  fi
}

echo "Step 1/4: Creating pre-update database backup..."
postgres_container_id="$(docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || true)"
if [[ -z "$postgres_container_id" ]]; then
  echo "No existing postgres container found. Skipping backup for first-time install."
else
  if [[ ! -f "$ROOT_DIR/scripts/backup-db.sh" ]]; then
    echo "Error: Missing backup helper: $ROOT_DIR/scripts/backup-db.sh"
    echo "Run install script again to restore required runtime files."
    exit 1
  fi
  bash "$ROOT_DIR/scripts/backup-db.sh"
fi

echo "Step 2/4: Pulling latest images (if available)..."
set +e
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
set -e

echo "Step 3/4: Rebuilding/restarting services..."
set +e
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
compose_rc=$?
set -e

if [[ $compose_rc -ne 0 ]]; then
  echo "Compose reported a startup failure (exit $compose_rc)."
  print_backend_diagnostics
  print_db_credentials_mismatch_help_if_detected
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
  echo "docker compose --project-name $COMPOSE_PROJECT_NAME --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=200"
  print_backend_diagnostics
  print_db_credentials_mismatch_help_if_detected
  exit 1
fi

echo "Update complete."
