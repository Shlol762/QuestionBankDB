#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="Shlol762"
REPO_NAME="QuestionBankDB"
BRANCH="Live-Version"
ARCHIVE_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz"

TARGET_DIR="${1:-$PWD/QuestionBankDB}"
TARGET_DIR="$(cd "$(dirname "$TARGET_DIR")" && pwd)/$(basename "$TARGET_DIR")"
COMPOSE_FILE="$TARGET_DIR/docker-compose.production.yml"
ENV_FILE="$TARGET_DIR/.env.production"
EXAMPLE_ENV_FILE="$TARGET_DIR/.env.production.example"

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

require_cmd docker
require_cmd openssl
require_cmd curl
require_cmd tar
require_cmd cp

sync_from_github_archive() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "Downloading latest ${REPO_NAME} (${BRANCH}) from GitHub..."
  curl -fsSL "$ARCHIVE_URL" -o "$tmp_dir/repo.tar.gz"
  tar -xzf "$tmp_dir/repo.tar.gz" -C "$tmp_dir"

  local extracted_dir
  extracted_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name "${REPO_NAME}-*" | head -n 1)"

  if [[ -z "$extracted_dir" ]]; then
    echo "Error: Failed to extract repository archive from GitHub."
    exit 1
  fi

  mkdir -p "$TARGET_DIR"
  for path in "${RUNTIME_PATHS[@]}"; do
    rm -rf "$TARGET_DIR/$path"
    cp -a "$extracted_dir/$path" "$TARGET_DIR/$path"
  done
}

print_install_plan() {
  echo "Install target: $TARGET_DIR"
  echo "Source: $ARCHIVE_URL"
}

print_install_plan
sync_from_github_archive

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose plugin is missing."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running or current user has no access."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE_ENV_FILE" "$ENV_FILE"
  db_pass="$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
  secret="$(openssl rand -hex 32)"

  sed -i "s|POSTGRES_PASSWORD=replace_me_with_strong_password|POSTGRES_PASSWORD=${db_pass}|" "$ENV_FILE"
  sed -i "s|POSTGRES_URL=postgresql+asyncpg://questionbank:replace_me_with_strong_password@postgres:5432/questionbank|POSTGRES_URL=postgresql+asyncpg://questionbank:${db_pass}@postgres:5432/questionbank|" "$ENV_FILE"
  sed -i "s|SECRET_KEY=replace_me_with_long_random_secret|SECRET_KEY=${secret}|" "$ENV_FILE"

  echo "Generated $ENV_FILE with secure defaults."
fi

echo "Running update script to build/start services..."
bash "$TARGET_DIR/scripts/update.sh"

echo "Install complete in: $TARGET_DIR"
