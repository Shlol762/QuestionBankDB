# Question Bank API

A full-stack web application for managing an educational question bank. Built with a **FastAPI** backend and a **React + TypeScript** frontend, it provides a structured, role-based system for teachers, department heads, and administrators to collaboratively author and organize exam questions.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
  - [Authentication & Security](#authentication--security)
  - [Role-Based Access Control](#role-based-access-control)
  - [Curriculum Management](#curriculum-management)
  - [Question Bank](#question-bank)
  - [File Uploads](#file-uploads)
  - [Analytics Dashboard](#analytics-dashboard)
  - [First-Run Setup Wizard](#first-run-setup-wizard)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Management Endpoints](#user-management-endpoints)
  - [Curriculum Endpoints](#curriculum-endpoints)
  - [Question Endpoints](#question-endpoints)
  - [Statistics Endpoint](#statistics-endpoint)
- [Data Models](#data-models)
  - [Curriculum Hierarchy](#curriculum-hierarchy)
  - [Question Types & Difficulty Levels](#question-types--difficulty-levels)
  - [Paginated Responses](#paginated-responses)
- [How to Install](#how-to-install)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Run the Backend Server](#4-run-the-backend-server)
  - [5. Frontend Setup](#5-frontend-setup)
  - [6. Run the Frontend Dev Server](#6-run-the-frontend-dev-server)
  - [Seeding an Admin Account (Optional)](#seeding-an-admin-account-optional)
  - [Generating Dummy Data (Optional)](#generating-dummy-data-optional)

---

## Overview

Question Bank API organizes educational content in a five-level hierarchy:

```
Syllabus → Grade → Subject → Topic → Question
```

Each level cascades downward: deleting a syllabus removes all grades, subjects, topics, and questions beneath it. Access to each level is enforced by a fine-grained permission system tied to user roles.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) |
| **ORM** | [SQLModel](https://sqlmodel.tiangolo.com/) (built on SQLAlchemy + Pydantic) |
| **Database** | PostgreSQL (async via `asyncpg`) |
| **Authentication** | JWT (JSON Web Tokens) via `python-jose` |
| **Password Hashing** | bcrypt via `passlib` |
| **Rate Limiting** | `slowapi` |
| **Configuration** | Pydantic Settings (`.env` file) |
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
│       ├── curriculum_routes.py    # /curriculum/* endpoints
│       ├── stats_routes.py         # /stats/* endpoints
│       ├── migrations/             # Alembic-style migration scripts
│       └── questions/
│           └── routes.py           # /questions/* endpoints
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
│       │   ├── client.ts
│       │   ├── curriculum.ts
│       │   └── preferences.ts
│       ├── components/             # Reusable UI components
│       │   ├── CurriculumManager.tsx
│       │   ├── Modal.tsx
│       │   ├── Pagination.tsx
│       │   ├── QuestionForm.tsx
│       │   └── UserManagement.tsx
│       ├── pages/                  # Full-page views
│       │   ├── Dashboard.tsx
│       │   ├── Login.tsx
│       │   └── Setup.tsx
│       └── store/                  # Zustand state stores
│           ├── authStore.ts
│           ├── settingsStore.ts
│           └── themeStore.ts
│
└── tests/
    ├── conftest.py                 # Pytest fixtures (async DB, test client)
    ├── test_brutal.py              # Comprehensive edge-case and stress tests
    ├── test_curriculum.py          # Curriculum CRUD tests
    └── test_security.py            # Security and permission tests
```

---

## Features

### Authentication & Security

- **JWT Authentication**: Every protected endpoint requires a `Bearer` token in the `Authorization` header. Tokens are signed using HS256 and expire after a configurable interval.
- **bcrypt Password Hashing**: User passwords are never stored in plain text.
- **Rate-Limited Login**: The `POST /auth/login` endpoint is limited to **5 requests per minute** per IP address to mitigate brute-force attacks.
- **Setup Lock**: The initial-setup endpoint (`POST /auth/initial-setup`) is permanently locked once the first user exists.
- **Self-Deletion Protection**: An administrator cannot delete their own account.
- **Last-Admin Lock**: The system blocks deletion of the final administrator account to prevent a permanent lockout.
- **Password Reset**: Administrators can reset any user's password to a default value, or users can change their own password by providing their current one.

### Role-Based Access Control

The system supports four distinct permission tiers. Each check is enforced server-side on every mutating request.

| Role | Capabilities |
|---|---|
| **Admin** | Full access to everything: all CRUD operations, user management, and school-wide statistics |
| **Grade Coordinator** | Manages subjects and topics within their assigned grade level(s) |
| **HOD** (Head of Department) | Manages topics within their assigned subject(s) across all grades (case-insensitive match) |
| **Teacher** | Creates and manages questions and topics within their specifically assigned subject(s) |

A user can hold multiple roles simultaneously (e.g., both a Teacher and a Grade Coordinator).

### Curriculum Management

The curriculum is organized as a strict four-level tree. All mutation routes enforce the RBAC rules above.

- **Syllabuses**: Created per academic year. Supports an optional attached PDF document.
- **Grades**: Each grade belongs to exactly one syllabus.
- **Subjects**: Each subject belongs to exactly one grade configuration. Teachers, HODs, and Grade Coordinators can be assigned to subjects.
- **Topics**: Each topic belongs to one subject and acts as the container for questions.
- **Full Hierarchy View**: A single `GET /curriculum/hierarchy` endpoint returns the entire tree, filtered automatically to show only the branches a non-admin user has access to.
- **Duplicate Prevention**: All creation endpoints perform **case-insensitive** duplicate checks before inserting.
- **Cascading Deletes**: Deleting any node automatically removes all its descendants.

### Question Bank

- **Five Question Types**: Multiple Choice (MCQ), True/False, Match the Following, Short Answer, Long Answer.
- **Three Difficulty Levels**: Easy, Medium, Hard.
- **MCQ Integrity Validation**: When creating or updating an MCQ, the system validates that:
  1. The `options` field is a non-empty dictionary (e.g., `{"A": "...", "B": "..."}`).
  2. The `answer_text` corresponds to a valid key in `options`.
- **Image Attachments**: Questions can reference an uploaded image via `image_url`.
- **Active/Inactive Status**: Questions have an `is_active` flag for soft-filtering.
- **Marks**: Each question carries a configurable marks value (`>= 0` to support grace marks).
- **Filtered Listing**: Non-admin users automatically see only questions belonging to their accessible subjects. Admins see all.
- **Search & Filter**: The question list endpoint supports filtering by `topic_id`, `difficulty`, `q_type`, and a full-text `search` on the question body.
- **Race Condition Prevention**: Update and delete operations use `SELECT ... FOR UPDATE` to lock the row for the duration of the transaction.

### File Uploads

Both upload endpoints perform a **two-layer validation**:
1. **Size check** — rejects files over 50 MB.
2. **Magic number / MIME type check** — inspects the file's binary header using `puremagic`, not just the filename extension, to prevent disguised file uploads.

| Endpoint | Accepted Types | Max Size |
|---|---|---|
| `POST /questions/upload-image` | JPEG, PNG, GIF, WebP | 50 MB |
| `POST /curriculum/upload-pdf` | PDF (with `%PDF-` header fallback) | 50 MB |

Uploaded files are served as static assets from `/static/`.

### Analytics Dashboard

The `GET /stats/` endpoint returns real-time metrics:

- **Total question count** (school-wide for admins, personal for teachers)
- **Total subject count** (school-wide for admins, assigned-only for teachers)
- **Total user count** (admin only)
- **Difficulty distribution**: a breakdown of question counts by Easy / Medium / Hard
- **Recent activity**: the 5 most recently created questions with author name, topic, and timestamp

### First-Run Setup Wizard

On a fresh installation with an empty database, the frontend detects the unconfigured state via `GET /auth/setup-status` and redirects to the **Setup page**. This page calls `POST /auth/initial-setup` to create the first administrator account. Once any user exists, this route returns `403 Forbidden` and the Setup page is inaccessible.

---

## API Reference

All endpoints (except `/ping` and `/auth/setup-status`) require a valid JWT in the `Authorization: Bearer <token>` header.

Paginated endpoints return a standard `Page` object:
```json
{
  "items": [...],
  "total": 42
}
```

Paginated endpoints accept `limit` and `offset` query parameters.

---

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/ping` | None | Returns `{"message": "pong"}` |

---

### Authentication Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/setup-status` | None | Returns `{"setup_required": true/false}` |
| `POST` | `/auth/initial-setup` | None | Creates the first admin (locked after first user) |
| `POST` | `/auth/login` | None (rate-limited: 5/min) | Accepts form data (`username`, `password`), returns JWT |
| `GET` | `/auth/me` | User | Returns the current user's profile |
| `PATCH` | `/auth/me/password` | User | Changes the current user's own password |

---

### User Management Endpoints

> All endpoints below require **Admin** role.

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/users` | Lists all staff with pagination |
| `POST` | `/auth/register` | Registers a new staff member and assigns roles |
| `PATCH` | `/auth/users/{id}` | Updates a staff member's profile and/or roles |
| `DELETE` | `/auth/users/{id}` | Deletes a staff member (safety locks apply) |
| `POST` | `/auth/users/{user_id}/reset-password` | Resets a user's password to default |

**`UserCreate` / `UserUpdate` body fields:**

| Field | Type | Description |
|---|---|---|
| `full_name` | string | Staff member's display name |
| `email` | string (email) | Unique login email |
| `password` | string | Plain text password (hashed server-side) |
| `department` | string | Department name |
| `is_admin` | boolean | Whether the user has admin privileges |
| `subject_ids` | `int[]` | IDs of subjects to assign (Teacher role) |
| `grade_levels` | `int[]` | Grade levels to coordinate (Grade Coordinator role) |
| `hod_subject_names` | `string[]` | Subject names to head (HOD role) |

---

### Curriculum Endpoints

#### Syllabuses

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/curriculum/syllabuses` | User | Paginated list of all syllabuses |
| `POST` | `/curriculum/syllabuses` | Admin | Creates a new syllabus |
| `PATCH` | `/curriculum/syllabuses/{id}` | Admin | Updates a syllabus |
| `DELETE` | `/curriculum/syllabuses/{id}` | Admin | Deletes a syllabus (cascades) |
| `POST` | `/curriculum/upload-pdf` | Admin | Uploads a syllabus PDF; returns `{"pdf_url": "..."}` |
| `GET` | `/curriculum/hierarchy` | User | Returns the full tree (filtered for non-admins) |

#### Grades

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/curriculum/grades/{syllabus_id}` | User | Lists grades in a syllabus |
| `POST` | `/curriculum/grades` | Admin | Adds a grade to a syllabus |
| `PATCH` | `/curriculum/grades/{id}` | Admin | Updates a grade |
| `DELETE` | `/curriculum/grades/{id}` | Admin | Deletes a grade (cascades) |

#### Subjects

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/curriculum/subjects` | User | Paginated list of all subjects |
| `GET` | `/curriculum/subjects/{config_id}` | User | Lists subjects within a grade |
| `POST` | `/curriculum/subjects` | Admin / Coordinator | Adds a subject to a grade |
| `PATCH` | `/curriculum/subjects/{id}` | Admin / Coordinator | Updates a subject |
| `DELETE` | `/curriculum/subjects/{id}` | Admin / Coordinator | Deletes a subject (cascades) |

#### Topics

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/curriculum/topics` | User | Paginated list of all topics |
| `GET` | `/curriculum/topics/subject/{subject_id}` | User | Lists topics for a subject |
| `POST` | `/curriculum/topics` | Admin / Coordinator / HOD / Teacher | Creates a topic |
| `PATCH` | `/curriculum/topics/{id}` | Admin / Coordinator / HOD / Teacher | Updates a topic |
| `DELETE` | `/curriculum/topics/{id}` | Admin / Coordinator / HOD / Teacher | Deletes a topic (cascades) |

---

### Question Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/questions/` | User | Filtered, paginated list of questions |
| `POST` | `/questions/` | User | Creates a new question |
| `GET` | `/questions/{question_id}` | User | Retrieves a single question |
| `PATCH` | `/questions/{question_id}` | Author / Admin / HOD / Coordinator | Updates a question |
| `DELETE` | `/questions/{question_id}` | Author / Admin / HOD / Coordinator | Deletes a question |
| `POST` | `/questions/upload-image` | User | Uploads a question image; returns `{"image_url": "..."}` |

**`GET /questions/` Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `topic_id` | int | Filter by topic |
| `difficulty` | string | `Easy`, `Medium`, or `Hard` |
| `q_type` | string | `MCQ`, `True/False`, `Match the Following`, `Short Answer`, `Long Answer` |
| `search` | string | Case-insensitive substring search on question text |
| `limit` | int | Page size (1–100, default 20) |
| `offset` | int | Page offset (default 0) |

**`QuestionCreate` body fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `topic_id` | int | Yes | The topic this question belongs to |
| `question_text` | string | Yes | The full question body |
| `answer_text` | string | Yes | The answer (for MCQ, must match an options key) |
| `options` | `dict` | MCQ only | `{"A": "...", "B": "...", ...}` |
| `image_url` | string | No | URL from `/questions/upload-image` |
| `marks` | int (≥ 0) | Yes | Point value of the question |
| `difficulty` | string | No | Default: `Medium` |
| `q_type` | string | No | Default: `MCQ` |

---

### Statistics Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/stats/` | User | Returns dashboard metrics |

**Response shape:**

```json
{
  "total_questions": 150,
  "total_subjects": 12,
  "total_users": 8,
  "difficulty_distribution": {
    "Easy": 40,
    "Medium": 80,
    "Hard": 30
  },
  "recent_activity": [
    {
      "id": 99,
      "text": "What is the powerhouse of the cell?",
      "author": "Jane Smith",
      "topic": "Cell Biology",
      "created_at": "2025-01-15T10:30:00"
    }
  ]
}
```

> `total_users` is `null` for non-admin users.

---

## Data Models

### Curriculum Hierarchy

```
SyllabusMaster          (syllabus_id, syllabus_name, academic_year, pdf_url)
  └── GradeConfig       (config_id, syllabus_id, grade_level)
        └── Subject      (subject_id, config_id, subject_name)
              └── Topic  (topic_id, subject_id, topic_name)
                    └── QuestionBank  (question_id, topic_id, teacher_id, ...)
```

### Question Types & Difficulty Levels

**Question Types (`q_type`):**
- `MCQ` — Multiple Choice Question (requires `options` dict and a matching `answer_text` key)
- `True/False`
- `Match the Following`
- `Short Answer`
- `Long Answer`

**Difficulty Levels (`difficulty`):**
- `Easy`
- `Medium` *(default)*
- `Hard`

### Paginated Responses

All list endpoints return a `Page[T]` object:

```json
{
  "items": [ /* array of T */ ],
  "total": 100
}
```

Use `offset` and `limit` query parameters to paginate through results.

---

## How to Install

### Prerequisites

- **Python 3.8+**
- **Node.js 18+** and **npm**
- A running **PostgreSQL** server (version 13+ recommended)

### One-Step Production Install (Client Testing)

If you are handing this build to a client and want the simplest possible setup with persistent data, use the deployment scripts:

Linux:

```bash
bash scripts/install.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

To push updates later while preserving existing database and uploaded files:

Linux:

```bash
bash scripts/update.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1
```

To uninstall safely (keep DB/uploads data):

Linux:

```bash
bash scripts/uninstall.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall.ps1
```

For full operations guidance (backup, restore, logs), see [DEPLOYMENT.md](DEPLOYMENT.md).

---

### 1. Clone the Repository

```bash
git clone https://github.com/Shlol762/QuestionBankDB.git
cd QuestionBankDB
```

---

### 2. Backend Setup

Create and activate a virtual environment, then install the required Python packages:

```bash
# Create a virtual environment
python -m venv venv

# Activate it
# On Linux / macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate


# Install all required dependencies
pip install -r requirements.txt
```

> **Note:** The `requirements.txt` file in this repository lists all the required Python packages (with pinned versions) to run and test this project. For reproducible deployments, always use `pip install -r requirements.txt` to ensure your environment matches the expected dependencies.

---

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and configure the following:

```ini
# Async PostgreSQL connection string
POSTGRES_URL=postgresql+asyncpg://USER:PASSWORD@localhost/questionbank

# A long, random secret key for signing JWT tokens
# Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=REPLACE_WITH_A_SECURE_SECRET_KEY

# JWT algorithm (do not change unless you know what you are doing)
ALGORITHM=HS256

# Token expiry in minutes (default: 30)
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Create the PostgreSQL database if it does not exist:

```sql
CREATE DATABASE questionbank;
```

---

### 4. Run the Backend Server

```bash
python runserver.py
```

The API will be available at **http://127.0.0.1:8000**.

The database tables are created automatically on first startup via the `lifespan` handler in `src/__init__.py`.

Interactive API documentation is available at:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

### 5. Frontend Setup

Navigate to the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

Copy the frontend environment file:

```bash
cp .env.example .env
```

The default frontend `.env` points to the backend at `http://localhost:8000`. Update `VITE_API_BASE_URL` if your backend runs on a different address.
If you use a tunnel in development, optionally set `VITE_ALLOWED_HOSTS` as a comma-separated list.

---

### 6. Run the Frontend Dev Server

```bash
npm run dev
```

The frontend will be available at **http://localhost:5173**.

On first launch with an empty database, you will be redirected to the **Setup Wizard** to create the first administrator account.

---

### Seeding an Admin Account (Optional)

If you prefer to create the first admin account from the command line instead of the web UI:

```bash
python seed_admin.py
```

The script will prompt for admin name, email, department, and password (with confirmation).

---

### Generating Dummy Data (Optional)

To populate the database with sample curriculum and question data for development or testing:

```bash
python generate_dummy_data.py
```

> Ensure the backend server is running before executing this script.

---

### Running Tests

```bash
pytest tests/
```
