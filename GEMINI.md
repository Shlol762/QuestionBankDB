# Question Bank API

## Project Overview
Question Bank API is a FastAPI-based backend service designed to manage an educational question bank. It uses a hierarchical structure (Syllabus -> Grade -> Subject -> Topic -> Question) to organize content and includes user management for teachers who create the questions.

The project is currently in early development, with the core database schema and application structure established.

## Main Technologies
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **ORM:** [SQLModel](https://sqlmodel.tiangolo.com/) (built on SQLAlchemy and Pydantic)
- **Database:** PostgreSQL (with async support via `asyncpg`)
- **Server:** [Uvicorn](https://www.uvicorn.org/)
- **Configuration:** [Pydantic Settings](https://docs.pydantic.dev/latest/usage/pydantic_settings/)

## Project Structure
```
E:\QuestionBankDB\
├── runserver.py          # Entry point for running the FastAPI server
├── src/
│   ├── __init__.py      # App initialization and lifespan (db init)
│   ├── config.py        # Configuration management (Pydantic Settings)
│   └── db/
│       ├── main.py      # Database engine and session setup
│       ├── models.py    # SQLModel definitions for all entities
│       └── questions/
│           └── routes.py # (In Progress) Question-related API routes
└── .env                  # Local environment variables (ignored by git)
```

## Building and Running

### Prerequisites
- Python 3.8+
- PostgreSQL database

### Installation
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd QuestionBankDB
   ```

2. **Set up a virtual environment:**
   ```bash
   python -m venv env
   env\Scripts\activate  # Windows
   # source env/bin/activate  # Linux/macOS
   ```

3. **Install Dependencies:**
   *(Note: No requirements.txt found, common dependencies for this stack include:)*
   ```bash
   pip install fastapi uvicorn sqlmodel pydantic-settings asyncpg
   ```

### Configuration
Create a `.env` file in the root directory with your database connection string:
```env
POSTGRES_URL=postgresql+asyncpg://user:password@localhost/dbname
```

### Execution
Run the development server:
```bash
python runserver.py
```
The API will be available at `http://127.0.0.1:8000`. You can access the interactive documentation at `http://127.0.0.1:8000/docs`.

## Development Conventions
- **Asynchronous Operations:** Use `async`/`await` for all database interactions and route handlers to maintain performance.
- **Data Models:** Define all database tables as `SQLModel` classes in `src/db/models.py`. Ensure `Relationship` fields are correctly set up for the hierarchy.
- **API Routes:** Organize routes by domain within `src/db/` (e.g., `src/db/questions/routes.py`). Register routers in `src/__init__.py`.
- **Database Migrations:** Currently, the project uses `SQLModel.metadata.create_all` on startup (`src/db/main.py`). Future development should consider using Alembic for migrations.
- **Environment Variables:** All configuration should be managed via the `Settings` class in `src/config.py`.
