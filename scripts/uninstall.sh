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

PURGE_DATA=false
PURGE_BACKUPS=false
REMOVE_ENV=false
PRUNE_IMAGES=false

usage() {
  cat <<EOF
Usage: bash scripts/uninstall.sh [options]

Options:
  --purge-data      Remove Docker volumes (deletes database and uploads data)
  --purge-backups   Delete local backups directory
  --remove-env      Delete .env.production
  --prune-images    Prune dangling Docker images after uninstall
  -h, --help        Show this help message

Default behavior is safe uninstall: stops and removes containers/network only.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --purge-data) PURGE_DATA=true ;;
    --purge-backups) PURGE_BACKUPS=true ;;
    --remove-env) REMOVE_ENV=true ;;
    --prune-images) PRUNE_IMAGES=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $arg"
      usage
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Missing required command: docker"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker and retry."
  exit 1
fi

if [[ "$PURGE_DATA" == "true" ]]; then
  echo "Running uninstall with data purge..."
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down -v --remove-orphans || true
else
  echo "Running safe uninstall (data preserved)..."
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans || true
fi

if [[ "$PURGE_BACKUPS" == "true" && -d "$BACKUP_DIR" ]]; then
  rm -rf "$BACKUP_DIR"
  echo "Removed backups directory: $BACKUP_DIR"
fi

if [[ "$REMOVE_ENV" == "true" && -f "$ENV_FILE" ]]; then
  rm -f "$ENV_FILE"
  echo "Removed env file: $ENV_FILE"
fi

if [[ "$PRUNE_IMAGES" == "true" ]]; then
  docker image prune -f >/dev/null
  echo "Pruned dangling Docker images."
fi

echo "Uninstall/cleanup complete."
