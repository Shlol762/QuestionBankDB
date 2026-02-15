# Quick Start Guide - Question Bank API

## Setup Instructions

### 1. Activate Virtual Environment
```bash
# Windows
env\Scripts\activate

# Linux/macOS
source env/bin/activate
```

### 2. Install Dependencies (if needed)
```bash
pip install fastapi uvicorn sqlmodel sqlalchemy asyncpg python-dotenv
```

### 3. Configure Database
Edit `.env` file:
```env
POSTGRES_URL="postgresql+asyncpg://postgres:password@localhost:5432/question_bank"
```

### 4. Start the Server
```bash
python runserver.py
```

The API will be available at: **http://127.0.0.1:8000**

---

## Quick API Examples

### Example 1: Create a Complete Question Bank Hierarchy

#### Step 1: Create Syllabus
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/syllabus/" \
  -H "Content-Type: application/json" \
  -d '{
    "syllabus_name": "CBSE",
    "academic_year": "2025-2026"
  }'
```

**Response:**
```json
{
  "syllabus_id": 1,
  "syllabus_name": "CBSE",
  "academic_year": "2025-2026"
}
```

#### Step 2: Create Grade
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/grades/" \
  -H "Content-Type: application/json" \
  -d '{
    "grade_level": 10,
    "syllabus_id": 1
  }'
```

**Response:**
```json
{
  "config_id": 1,
  "grade_level": 10,
  "syllabus_id": 1
}
```

#### Step 3: Create Subject
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/subjects/" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_name": "Physics",
    "config_id": 1
  }'
```

**Response:**
```json
{
  "subject_id": 1,
  "subject_name": "Physics",
  "config_id": 1
}
```

#### Step 4: Create Topic
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/topics/" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_name": "Kinematics",
    "subject_id": 1
  }'
```

**Response:**
```json
{
  "topic_id": 1,
  "topic_name": "Kinematics",
  "subject_id": 1
}
```

#### Step 5: Create User (Teacher)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Dr. Sharma",
    "email": "sharma@school.com",
    "department": "Science",
    "is_admin": false
  }'
```

**Response:**
```json
{
  "user_id": 1,
  "full_name": "Dr. Sharma",
  "email": "sharma@school.com",
  "department": "Science",
  "is_admin": false
}
```

#### Step 6: Create Question
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/questions/" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "A car travels 100 km in 2 hours. What is its average velocity?",
    "answer_text": "50 km/h",
    "marks": 5,
    "difficulty": "Easy",
    "q_type": "MCQ",
    "topic_id": 1,
    "teacher_id": 1,
    "image_url": null
  }'
```

**Response:**
```json
{
  "question_id": 1,
  "question_text": "A car travels 100 km in 2 hours. What is its average velocity?",
  "answer_text": "50 km/h",
  "marks": 5,
  "difficulty": "Easy",
  "q_type": "MCQ",
  "topic_id": 1,
  "teacher_id": 1,
  "image_url": null,
  "is_active": true,
  "created_at": "2026-02-15T10:30:45.123456"
}
```

---

### Example 2: Query Questions with Filters

#### Get easy questions for a topic
```bash
curl "http://127.0.0.1:8000/api/v1/questions/?topic_id=1&difficulty=Easy"
```

#### Get MCQ questions by a specific teacher
```bash
curl "http://127.0.0.1:8000/api/v1/questions/?teacher_id=1&q_type=MCQ"
```

#### Get all active questions with medium difficulty
```bash
curl "http://127.0.0.1:8000/api/v1/questions/?is_active=true&difficulty=Medium"
```

---

### Example 3: Update Operations

#### Update a question
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/questions/1" \
  -H "Content-Type: application/json" \
  -d '{
    "marks": 10,
    "difficulty": "Hard"
  }'
```

#### Update a user
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v1/users/1" \
  -H "Content-Type: application/json" \
  -d '{
    "is_admin": true
  }'
```

---

### Example 4: Delete Operations

#### Delete a question
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/questions/1"
```

#### Delete a user
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/users/1"
```

---

## Interactive API Documentation

**Swagger UI (Recommended):**
```
http://127.0.0.1:8000/docs
```

**ReDoc (Alternative):**
```
http://127.0.0.1:8000/redoc
```

Use these interfaces to:
- View all available endpoints
- Try requests with auto-completion
- See response schemas and examples
- Test authentication (if added later)

---

## Troubleshooting

### Database Connection Error
```
Error: could not connect to server: Connection refused
```
**Solution:** Ensure PostgreSQL is running and the connection string in `.env` is correct.

### Import Errors
```
Error: No module named 'src'
```
**Solution:** Make sure you're running commands from the project root directory.

### Port Already in Use
```
Error: Address already in use
```
**Solution:** Change the port in `runserver.py` or kill the process using port 8000.

---

## Directory Structure Reference

```
QuestionBankDB/
├── src/
│   ├── __init__.py           ← Main FastAPI app
│   ├── config.py             ← Database settings
│   ├── db/
│   │   ├── main.py           ← Engine and sessions
│   │   └── models.py         ← Database tables
│   ├── schemas/              ← Pydantic validation
│   │   ├── common.py         ← Enums
│   │   ├── master_data.py    ← Hierarchy schemas
│   │   ├── questions.py      ← Question schemas
│   │   └── users.py          ← User schemas
│   └── routers/              ← API endpoints
│       ├── master_data.py    ← Syllabus, Grade, Subject, Topic
│       ├── questions.py      ← Question CRUD
│       └── users.py          ← User CRUD
├── runserver.py              ← Server entry point
├── .env                       ← Database URL
└── env/                       ← Virtual environment
```

---

## Environment Variables

**File: `.env`**

```env
# PostgreSQL connection string
POSTGRES_URL=postgresql+asyncpg://user:password@host:port/database
```

---

## Next Steps

1. **Test the API** using Swagger UI at `/docs`
2. **Review** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete endpoint reference
3. **Configure** the database connection in `.env`
4. **Start creating** syllabi, grades, subjects, topics, and questions

---

**Questions or Issues?** Check the main API documentation or the code comments in the routers.
