# Deployment and Configuration Guide

This guide explains the environment configuration architecture of the Question Bank Platform, detailing how variables flow through both local development and Docker container setups.

---

## 1. Environment Configuration Files Overview

There are several configuration files designed for different operational stages:

| File Location | Target Mode | Description |
|---|---|---|
| **`/.env`** | Unified Active Config | Read by the FastAPI backend (local dev) and by Docker Compose (container deployment). Created by copying `/.env.example`. |
| **`/.env.example`** | Unified Template | The single template file containing configuration variables for both local bare-metal execution and Docker Compose deployments. |
| **`/frontend/.env.example`** | Frontend Dev Server | Reference configuration for Vite local development server overrides. (Not required in Docker/production builds). |

---

## 2. Docker Compose Configuration Workflow

When deploying the platform via Docker, the containers configure themselves dynamically. Here is how the environment variable hierarchy behaves:

1. **Environment File Load:**
   Docker Compose automatically searches for a `/.env` file in the root repository directory. This file is fed into the services defined in `docker-compose.yml`.
2. **Dynamic Database Mapping:**
   Inside `docker-compose.yml`, the database credentials and connection parameters are mapped directly to the backend service, specifying `POSTGRES_HOST=postgres`. The backend's config module dynamically constructs the `POSTGRES_URL` connection string on startup using these variables. This eliminates the need to hardcode a database URL in any configuration file.

---

## 3. Zero-Configuration Production Containers (Relative URLs)

In traditional React SPA container builds, hardcoding the backend API address (`VITE_API_BASE_URL`) at build time is a common pain point: it forces you to rebuild the container image whenever the target host domain changes.

To solve this, the application implements a **Zero-Configuration Adaptive Base URL** pattern:

* **In Development Mode:** Axios requests default to `http://localhost:8000`.
* **In Production Mode:** Axios requests default to an empty string (`""`), which tells the browser to make **relative URL requests** (e.g. `GET /questions`).
* **Nginx Reverse Proxy:** The Nginx server running inside the frontend container intercepts these relative requests (e.g., `/auth`, `/questions`, `/curriculum`, `/static`) and proxies them internally inside the Docker network directly to the `backend` container on port `8000`.

This configuration allows you to build the frontend container once and deploy it on any domain or port without rebuilding it.

---

## 4. Simplified Launcher Command Reference

A orchestration script `launcher.sh` is provided in the repository root for streamlined automation.

### Commands

#### A. Setup Environment Files
```bash
./launcher.sh setup
```
Checks if the local `/.env` file is present. If missing, it copies the settings template from `.env.example`.

#### B. Start Services
```bash
./launcher.sh start
```
Starts `postgres`, `backend`, and `frontend` services in background detached mode, building the local source if needed.

#### C. Tail Container Logs
```bash
./launcher.sh logs
```
Tails live logging output for both the backend and frontend application servers.

#### D. Seed Core & Mock Data
Run these once the database container is online and healthy:
* **Initial Setup Wizard Admin:**
  ```bash
  ./launcher.sh seed-admin
  ```
* **Full Indian Syllabus & Questions (700+ entries):**
  ```bash
  ./launcher.sh seed-dummy
  ```

#### E. Check Health & Tear Down
* **Check Port Maps and health status:**
  ```bash
  ./launcher.sh status
  ```
* **Stop all containers safely:**
  ```bash
  ./launcher.sh stop
  ```
