# Question Bank Platform

A full-stack web application designed to manage an educational question bank. It features a robust FastAPI backend and a modern React/Vite frontend. The system uses a hierarchical curriculum structure (Syllabus -> Grade -> Subject -> Topic -> Question) to meticulously organize content and includes comprehensive role-based access control (RBAC) for administrators and teaching faculty.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) |
| **ORM** | [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic v2) |
| **Database** | PostgreSQL (async via `asyncpg`) |
| **Authentication** | JWT (JSON Web Tokens) via `python-jose` |
| **Password Hashing** | bcrypt via `passlib` |
| **Rate Limiting** | `slowapi` |
| **ASGI Server** | Uvicorn |
| **Frontend Framework** | React 19 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand |
| **Data Fetching** | TanStack React Query + Axios |
| **Forms** | React Hook Form + Zod |

---

## Project Structure

```
QuestionBankDB/
├── runserver.py                    # Entry point — starts Uvicorn
├── seed_admin.py                   # CLI helper to seed the first admin account
├── generate_dummy_data.py          # Script to populate the DB with sample data
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
│
├── src/
│   ├── __init__.py                 # FastAPI app creation, middleware, router registration
│   ├── config.py                   # Pydantic Settings (reads .env)
│   ├── limiter.py                  # slowapi rate limiter instance
│   └── db/
│       ├── main.py                 # Async DB engine and session factory
│       ├── models.py               # All SQLModel table definitions and enums
│       ├── auth_routes.py          # /auth/* endpoints
│       ├── auth_utils.py           # JWT helpers, password hashing, current-user dependency
│       └── curriculum_routes.py    # /curriculum/* endpoints
│
├── uploads/                        # Auto-created; stores uploaded images and PDFs
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx                 # Root component and routing
│       ├── main.tsx
│       ├── api/                    # Axios client + typed API modules
│       ├── components/             # Reusable UI components
│       ├── pages/                  # Full-page views
│       └── store/                  # Zustand state stores
│
└── tests/
    ├── conftest.py                 # Pytest fixtures (async DB, test client)
    ├── test_brutal.py              # Comprehensive edge-case and stress tests
    ├── test_curriculum.py          # Curriculum CRUD tests
    └── test_security.py            # Security and permission tests
```

---

## Setup & Installation Guide

Choose one of the two setup pathways below depending on your environment.

### Pathway 1: Local Development Setup

#### Prerequisites
* **Python 3.12+**
* **Node.js 20+** and **npm**
* **PostgreSQL** server running locally

#### 1. Setup the Database
Log into your PostgreSQL console and create a new database:
```sql
CREATE DATABASE questionbank;
```

#### 2. Configure Environment Variables
* **Backend Configuration**: In the repository root, copy the environment template:
  ```bash
  cp .env.example .env
  ```
  Open `.env` and fill in your connection string and security details:
  ```ini
  POSTGRES_URL=postgresql+asyncpg://qbdev_user:qbdev_pass@localhost/questionbank
  SECRET_KEY=REPLACE_WITH_A_SECURE_JWT_SECRET_KEY
  ```
* **Frontend Configuration**: Navigate to the `frontend` directory, copy the frontend environment template:
  ```bash
  cd frontend
  cp .env.example .env
  cd ..
  ```
  Ensure `VITE_API_BASE_URL` in `frontend/.env` points to the local backend port (default: `http://localhost:8000`).

#### 3. Start the Backend Server
Navigate to the root directory, configure the virtual environment, install dependencies, and run:
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run the app
python runserver.py
```
The API documentation will be available at:
* **Swagger UI**: http://localhost:8000/docs
* **ReDoc**: http://localhost:8000/redoc

#### 4. Start the Frontend Dev Server
In a new terminal window, navigate to the `frontend` directory, install Node modules, and run the development compiler:
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** to access the application.

---

### Pathway 2: Docker Compose Deployment Setup

#### Prerequisites
* **Docker Engine 24+**
* **Docker Compose v2+**

#### 1. Configure Environment Variables
Copy the example environment template in the repository root:
```bash
cp .env.example .env
```
Ensure `.env` contains secure values for `POSTGRES_PASSWORD`, `SECRET_KEY`, and custom network ports if needed.

#### 2. Build & Launch Containers
Run the following command in the repository root to build and start the database, backend, and frontend containers:
```bash
docker compose up --build -d
```
Once healthy, the application will be accessible at:
* **Frontend**: http://localhost
* **Backend API Docs**: http://localhost:8000/docs

To stop and teardown containers (preserving database volumes):
```bash
docker compose down
```

---

## Administrative CLI Helpers

### 1. Seeding the First Admin Account
If you prefer not to use the Web Setup Wizard, bootstrap the primary administrator account from the CLI:

* **Local Development**:
  ```bash
  PYTHONPATH=. python seed_admin.py
  ```
* **Docker Compose**:
  ```bash
  docker compose exec backend python seed_admin.py
  ```

### 2. Generating Dummy Data
To populate the database with a pre-configured syllabus structure and mock questions:

* **Local Development**:
  ```bash
  PYTHONPATH=. python generate_dummy_data.py
  ```
* **Docker Compose**:
  ```bash
  docker compose exec backend python generate_dummy_data.py
  ```

---

## Running Backend Tests

Run the full pytest suite to verify curriculum CRUD logic, authentication, and RBAC security policies:

```bash
python -m pytest
```
