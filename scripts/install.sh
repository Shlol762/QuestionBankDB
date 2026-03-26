#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.production.yml"
ENV_FILE="$ROOT_DIR/.env.production"
EXAMPLE_ENV_FILE="$ROOT_DIR/.env.production.example"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: Missing required command '$1'."
    echo
    if [[ "$1" == "docker" ]]; then
      echo "Install Docker Engine and Docker Compose plugin, then retry."
      echo "Ubuntu quick start:"
      echo "  sudo apt-get update"
      echo "  sudo apt-get install -y ca-certificates curl gnupg"
      echo "  sudo install -m 0755 -d /etc/apt/keyrings"
      echo "  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg"
      echo "  sudo chmod a+r /etc/apt/keyrings/docker.gpg"
      echo "  echo \"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null"
      echo "  sudo apt-get update"
      echo "  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin"
      echo
      echo "Verify: docker --version && docker compose version"
    fi
    exit 1
  fi
}

require_cmd docker
require_cmd openssl
require_cmd curl

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose plugin is missing."
  echo "Install package: docker-compose-plugin"
  echo "Verify: docker compose version"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running or current user has no access."
  echo "Start Docker and retry. If permission denied, run:"
  echo "  sudo usermod -aG docker $USER"
  echo "Then log out and log back in."
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

echo "Building and starting services..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Waiting for backend health endpoint..."
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
  echo "Backend health check failed. Inspect logs with:"
  echo "docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --tail=100"
  exit 1
fi

echo "Install complete."
frontend_port="$(grep '^FRONTEND_PORT=' "$ENV_FILE" | cut -d '=' -f2-)"
frontend_port="${frontend_port:-80}"

if [[ "$frontend_port" == "80" ]]; then
  echo "Frontend: http://127.0.0.1"
else
  echo "Frontend: http://127.0.0.1:${frontend_port}"
fi
echo "Backend API: http://127.0.0.1:8000/docs"
