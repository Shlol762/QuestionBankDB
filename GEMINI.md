# Question Bank Platform

## Project Overview
Question Bank Platform is a mature, full-stack application designed to manage an educational question bank. It features a robust FastAPI backend and a modern React/Vite frontend. The system uses a hierarchical curriculum structure (Syllabus -> Grade -> Subject -> Topic -> Question) to meticulously organize content and includes comprehensive role-based access control (RBAC) for administrators and teaching faculty.

## Core Technologies
### Backend
- **Framework:** FastAPI
- **ORM:** SQLModel (SQLAlchemy + Pydantic v2)
- **Database:** PostgreSQL (async via `asyncpg`)
- **Security:** OAuth2 with JWT, BCrypt password hashing, rate limiting
- **Testing:** Pytest (asyncio)

### Frontend
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **State Management:** Zustand, React Query (@tanstack/react-query)
- **Styling:** Tailwind CSS, Lucide React icons
- **Form Handling:** React Hook Form with Zod validation

## Project Structure
```
E:\QuestionBankDB\
├── .github/              # GitHub Actions workflows for CI/CD
├── frontend/             # React/Vite frontend application
│   ├── src/
│   │   ├── api/          # Axios client and API utilities
│   │   ├── components/   # Reusable UI components (Modals, Forms, Managers)
│   │   ├── pages/        # Main application views (Dashboard, Login, Setup)
│   │   └── store/        # Zustand state stores (auth, settings)
│   ├── package.json
│   └── vite.config.ts
├── src/                  # FastAPI backend application
│   ├── db/
│   │   ├── migrations/   # Alembic migrations (if adopted)
│   │   ├── questions/    # Question-specific API routes
│   │   ├── auth_routes.py # JWT Authentication and User Management
│   │   ├── auth_utils.py  # Password hashing and token generation
│   │   ├── curriculum_routes.py # Curriculum hierarchy management
│   │   └── models.py      # SQLModel definitions and Pydantic schemas
│   ├── config.py         # Environment configuration
│   └── limiter.py        # Rate limiting logic
├── tests/                # Comprehensive Pytest suite (Brutal testing)
├── requirements.txt      # Python dependencies
└── runserver.py          # Uvicorn entry point
```

## Security Features
- **Role-Based Access Control (RBAC):** Differentiates between 'Root Administrators', 'Grade Coordinators', 'Subject Heads', and 'Faculty'.
- **JWT Authentication:** Secure API access via stateless JWTs.
- **Input Validation:** Strict Pydantic validation on the backend and Zod on the frontend.
- **SQL Injection Prevention:** Utilization of SQLModel/SQLAlchemy ORM.
- **File Upload Security:** Magic number (MIME) validation and file size restrictions for PDFs and Images.
- **Setup Lockout:** Initial admin setup is locked after the first execution to prevent unauthorized takeovers.

## Building and Running

### Backend Setup
1. **Set up virtual environment:**
   ```bash
   python -m venv env
   env\Scripts\activate  # Windows
   ```
2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Configuration:**
   Create a `.env` file in the project root:
   ```env
   POSTGRES_URL=postgresql+asyncpg://user:password@localhost/dbname
   JWT_SECRET_KEY=your_super_secret_key
   ```
4. **Execution:**
   ```bash
   python runserver.py
   ```
   API docs at `http://127.0.0.1:8000/docs`

### Frontend Setup
1. **Navigate and Install:**
   ```bash
   cd frontend
   npm install
   ```
2. **Configuration:**
   Create a `.env` file in `frontend/`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. **Execution:**
   ```bash
   npm run dev
   ```

## Development Conventions
- **Asynchronous Flow:** Use `async`/`await` across the stack.
- **Atomic Commits:** Maintain clear, concise commit messages detailing the "why".
- **Validation:** Always verify changes with the exhaustive `pytest` suite before finalizing.
