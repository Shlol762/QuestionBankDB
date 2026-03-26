#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.production.yml"
ENV_FILE="$ROOT_DIR/.env.production"
BACKUP_DIR="$ROOT_DIR/backups"

compute_project_hash() {
  if command -v sha1sum >/dev/null 2>&1; then
    printf "%s" "$1" | sha1sum | cut -c1-8
    return
  fi
  printf "%s" "$1" | cksum | awk '{print $1}'
}

PROJECT_HASH="$(compute_project_hash "$ROOT_DIR")"
COMPOSE_PROJECT_NAME="questionbankdb_${PROJECT_HASH}"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Run scripts/install.sh first."
  exit 1
fi

source "$ENV_FILE"
timestamp="$(date +%Y%m%d_%H%M%S)"
out_file="$BACKUP_DIR/questionbank_${timestamp}.sql"

echo "Creating backup: $out_file"
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$out_file"

echo "Backup complete: $out_file"
