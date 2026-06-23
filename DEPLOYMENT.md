# Setup & Deployment Guide

This guide explains the step-by-step instructions to configure and run the Question Bank Platform in different environments.

---

## 1. Local Development Setup (WSL / Ubuntu / Linux Host)

Follow these steps to run the application directly on your host machine for development.

### Prerequisites
* **Python 3.12+**
* **Node.js 20+** and **npm**
* **PostgreSQL** installed and running on your host machine (or WSL instance).

### Step-by-Step Local Setup

#### 1. Setup the Local Database
Log into your PostgreSQL console and create a new database:
```sql
CREATE DATABASE questionbank;
```

#### 2. Configure Environment Variables
* Copy the environment template in the repository root:
  ```bash
  cp .env.example .env
  ```
* Open the root `/.env` file and configure your local Postgres settings:
  ```ini
  POSTGRES_DB=questionbank
  POSTGRES_USER=your_postgres_user
  POSTGRES_PASSWORD=your_postgres_password
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432
  SECRET_KEY=generate_a_secure_jwt_secret_key
  ```
  *(Note: The backend automatically constructs its database connection URL from these individual parameters on boot).*

#### 3. Run the Backend Server
From the root directory, create a virtual environment, install dependencies, and launch:
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows/WSL: .venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Run the FastAPI server in hot-reload mode
python runserver.py
```
* The API docs will load at: `http://localhost:8000/docs`

#### 4. Run the Frontend Dev Server
In a separate terminal, compile the frontend application:
```bash
cd frontend
npm install
npm run dev
```
* Open your browser to `http://localhost:5173`.
* *(Optional)*: If you run the backend on a port other than `8000`, copy `/frontend/.env.example` to `/frontend/.env` and update the `VITE_API_BASE_URL` value.

---

## 2. Docker & Containerized Environment Setup (For Testers / Local Compose)

To package and share development updates with testers on different operating systems, use the multi-container Docker setup.

### Prerequisites
* **Docker Engine 24+**
* **Docker Compose v2+**

### Step-by-Step Docker Setup

#### 1. Prepare the Environment
* Copy the unified template to the root `/.env`:
  ```bash
  cp .env.example .env
  ```
* Change the database host variable in `/.env` to point to the Postgres container rather than localhost:
  ```ini
  POSTGRES_HOST=postgres
  ```
* Configure credentials (`POSTGRES_PASSWORD`, `SECRET_KEY`) and preferred host port mappings (e.g., `FRONTEND_PORT=80`).

#### 2. Service Orchestration Helper (`launcher.sh`)
Use the automated launcher shell script in the repository root to control your containers:

* **Build & Start all containers in background:**
  ```bash
  ./launcher.sh start
  ```
  This runs `docker compose up --build -d`. Once online, the frontend is available at `http://localhost` (port 80) and the backend API docs are at `http://localhost:8000/docs`.

* **Verify Container Health status:**
  ```bash
  ./launcher.sh status
  ```

* **Tail Container Logs:**
  ```bash
  ./launcher.sh logs
  ```

* **Seed Initial Data:**
  To populate the Docker database with the syllabus curriculum and mock questions, execute:
  ```bash
  ./launcher.sh seed-dummy
  ```
  To bootstrap the Root Administrator login account:
  ```bash
  ./launcher.sh seed-admin
  ```

* **Shutdown services safely:**
  ```bash
  ./launcher.sh stop
  ```

#### 3. How Docker Handles Network Mapping & Base URLs
* **Adaptive Base URLs:** In production container builds, the React frontend Axios client defaults to relative paths (e.g. `GET /questions`). This prevents hardcoding the API server IP or hostname during image builds.
* **Nginx Reverse Proxy:** The Nginx server inside the frontend container intercepts these relative endpoints and proxies them inside the virtual network directly to the backend container (`http://backend:8000`), allowing host-agnostic, zero-configuration deployments.

---

## 3. Production Deployment Guide

*This section is a work-in-progress.*

Deploying production-ready builds at scale (e.g., via cloud engines, managed Kubernetes, or serverless infrastructure) has not yet been finalized. This section will be updated once the remote deployment target architecture, deployment pipelines, and SSL/HTTPS policies are defined.
