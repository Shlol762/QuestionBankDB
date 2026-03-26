#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/restore-db.sh <path-to-backup.sql>"
  exit 1
fi

BACKUP_FILE="$1"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.production.yml"
ENV_FILE="$ROOT_DIR/.env.production"

compute_project_hash() {
  if command -v sha1sum >/dev/null 2>&1; then
    printf "%s" "$1" | sha1sum | cut -c1-8
    return
  fi
  printf "%s" "$1" | cksum | awk '{print $1}'
}

PROJECT_HASH="$(compute_project_hash "$ROOT_DIR")"
COMPOSE_PROJECT_NAME="questionbankdb_${PROJECT_HASH}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Run scripts/install.sh first."
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

source "$ENV_FILE"

echo "Restoring database from: $BACKUP_FILE"
cat "$BACKUP_FILE" | docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore complete."
