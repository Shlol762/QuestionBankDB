#!/usr/bin/env bash
# Question Bank Platform - Simplified Docker Orchestration Script

set -e

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_EXAMPLE=".env.production.example"
ENV_FILE=".env"

# Display help menu
show_help() {
    echo "========================================================="
    echo "  Question Bank Platform - Docker Orchestration Helper   "
    echo "========================================================="
    echo "Usage: ./launcher.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup         Copy environment templates if not already present"
    echo "  start         Build and run containers in background (detached)"
    echo "  stop          Stop running containers"
    echo "  restart       Restart all containers"
    echo "  logs          Tail logs for backend and frontend"
    echo "  seed-dummy    Seed academic database with 700+ Indian curriculum questions"
    echo "  seed-admin    Seed the initial Root Administrator account"
    echo "  status        Check container health and port maps"
    echo "========================================================="
}

# Check and copy env templates
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "⚠️  No $ENV_FILE found. Copying from $ENV_EXAMPLE..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "📝 Generated $ENV_FILE. Please review its credentials before starting production services."
    fi
}

case "$1" in
    setup)
        check_env
        ;;
    start)
        check_env
        echo "🚀 Building and starting containers..."
        docker compose -f "$COMPOSE_FILE" up --build -d
        echo "✨ Containers started. Use './launcher.sh status' to monitor startup health."
        ;;
    stop)
        echo "🛑 Stopping containers..."
        docker compose -f "$COMPOSE_FILE" down
        ;;
    restart)
        echo "🔄 Restarting containers..."
        docker compose -f "$COMPOSE_FILE" down
        docker compose -f "$COMPOSE_FILE" up -d
        ;;
    logs)
        docker compose -f "$COMPOSE_FILE" logs -f backend frontend
        ;;
    seed-dummy)
        echo "❓ Seeding mock Indian syllabus curriculum and question bank..."
        docker compose -f "$COMPOSE_FILE" exec backend python generate_dummy_data.py
        ;;
    seed-admin)
        echo "🔑 Bootstrapping root admin account..."
        docker compose -f "$COMPOSE_FILE" exec backend python seed_admin.py
        ;;
    status)
        echo "📊 Container statuses:"
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        show_help
        exit 1
        ;;
esac
