# Question Bank API - Complete Implementation

## Project Structure

```
src/
├── __init__.py              # Main FastAPI app with integrated routers
├── config.py                # Configuration (database URL from .env)
├── db/
│   ├── __init__.py
│   ├── main.py              # Async engine and session management
│   ├── models.py            # SQLModel definitions (6 tables)
│   └── questions/
│       └── routes.py        # Deprecated (handlers moved to src/routers)
├── schemas/                 # NEW: Pydantic validation models
│   ├── __init__.py
│   ├── common.py            # Enums: DifficultyLevel, QuestionType
│   ├── master_data.py       # Schemas for Syllabus, Grade, Subject, Topic
│   ├── questions.py         # Schemas for Question CRUD
│   └── users.py             # Schemas for User CRUD
└── routers/                 # NEW: API endpoint handlers
    ├── __init__.py
    ├── master_data.py       # Master data endpoints (Syllabus, Grade, Subject, Topic)
    ├── questions.py         # Question CRUD endpoints with filtering
    └── users.py             # User management endpoints
```

## Database Hierarchy

The system follows a hierarchical structure:

```
SyllabusMaster (CBSE, ICSE, etc.)
├── GradeConfig (Class 10, 11, 12, etc.)
│   ├── Subject (Physics, Mathematics, Chemistry, etc.)
│   │   ├── Topic (Kinematics, Algebra, Organic Chemistry, etc.)
│   │   │   └── QuestionBank (Individual questions with metadata)
Users (Teachers/Authors)
└── QuestionBank (Questions authored by users)
```

## Database Models

### 1. **SyllabusMaster**
- `syllabus_id` (PK)
- `syllabus_name` (e.g., "CBSE", "ICSE")
- `academic_year` (e.g., "2025-2026")
- Relationships: `grades` (One-to-Many)

### 2. **GradeConfig**
- `config_id` (PK)
- `syllabus_id` (FK → SyllabusMaster)
- `grade_level` (e.g., 10, 11, 12)
- Relationships: `syllabus`, `subjects`

### 3. **Subject**
- `subject_id` (PK)
- `subject_name` (e.g., "Physics")
- `config_id` (FK → GradeConfig)
- Relationships: `grade`, `topics`

### 4. **Topic**
- `topic_id` (PK)
- `topic_name` (e.g., "Kinematics")
- `subject_id` (FK → Subject)
- Relationships: `subject`, `questions`

### 5. **Users**
- `user_id` (PK)
- `full_name`
- `email` (UNIQUE, indexed)
- `department` (e.g., "Science")
- `is_admin` (boolean)
- Relationships: `questions`

### 6. **QuestionBank**
- `question_id` (PK)
- `topic_id` (FK → Topic)
- `teacher_id` (FK → Users)
- `question_text` (the question content)
- `answer_text` (the answer/solution)
- `marks` (integer)
- `difficulty` (ENUM: Easy, Medium, Hard)
- `q_type` (ENUM: MCQ, True/False, Match, Short Answer, Long Answer)
- `image_url` (optional)
- `is_active` (boolean, default: True)
- `created_at` (timestamp, auto-generated)

## API Endpoints

### **1. Syllabus Management** (`/api/v1/syllabus/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/syllabus/` | Create new syllabus |
| GET | `/api/v1/syllabus/` | List all syllabi |
| GET | `/api/v1/syllabus/{syllabus_id}` | Get specific syllabus |
| PATCH | `/api/v1/syllabus/{syllabus_id}` | Update syllabus |
| DELETE | `/api/v1/syllabus/{syllabus_id}` | Delete syllabus |

**Example Request (Create):**
```json
POST /api/v1/syllabus/
{
  "syllabus_name": "CBSE",
  "academic_year": "2025-2026"
}
```

### **2. Grade Management** (`/api/v1/grades/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/grades/` | Create new grade |
| GET | `/api/v1/grades/` | List all grades (filter by `?syllabus_id=X`) |
| GET | `/api/v1/grades/{config_id}` | Get specific grade |
| PATCH | `/api/v1/grades/{config_id}` | Update grade |
| DELETE | `/api/v1/grades/{config_id}` | Delete grade |

**Example Request (Create):**
```json
POST /api/v1/grades/
{
  "grade_level": 10,
  "syllabus_id": 1
}
```

**Query Parameters:**
- `?syllabus_id=1` → Get all grades for syllabus 1

### **3. Subject Management** (`/api/v1/subjects/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/subjects/` | Create new subject |
| GET | `/api/v1/subjects/` | List all subjects (filter by `?config_id=X`) |
| GET | `/api/v1/subjects/{subject_id}` | Get specific subject |
| PATCH | `/api/v1/subjects/{subject_id}` | Update subject |
| DELETE | `/api/v1/subjects/{subject_id}` | Delete subject |

**Example Request (Create):**
```json
POST /api/v1/subjects/
{
  "subject_name": "Physics",
  "config_id": 1
}
```

**Query Parameters:**
- `?config_id=1` → Get all subjects for grade config 1

### **4. Topic Management** (`/api/v1/topics/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/topics/` | Create new topic |
| GET | `/api/v1/topics/` | List all topics (filter by `?subject_id=X`) |
| GET | `/api/v1/topics/{topic_id}` | Get specific topic |
| PATCH | `/api/v1/topics/{topic_id}` | Update topic |
| DELETE | `/api/v1/topics/{topic_id}` | Delete topic |

**Example Request (Create):**
```json
POST /api/v1/topics/
{
  "topic_name": "Kinematics",
  "subject_id": 1
}
```

**Query Parameters:**
- `?subject_id=1` → Get all topics for subject 1

### **5. Question Management** (`/api/v1/questions/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/questions/` | Create new question |
| GET | `/api/v1/questions/` | List questions with advanced filtering |
| GET | `/api/v1/questions/{question_id}` | Get specific question |
| PATCH | `/api/v1/questions/{question_id}` | Update question (partial) |
| DELETE | `/api/v1/questions/{question_id}` | Delete question |
| GET | `/api/v1/questions/search/by-difficulty` | Search by difficulty |
| GET | `/api/v1/questions/search/by-type` | Search by type |

**Example Request (Create):**
```json
POST /api/v1/questions/
{
  "question_text": "What is the SI unit of force?",
  "answer_text": "Newton (N)",
  "marks": 5,
  "difficulty": "Easy",
  "q_type": "MCQ",
  "topic_id": 1,
  "teacher_id": 1,
  "image_url": null
}
```

**Query Parameters (List/Search):**
- `?topic_id=1` → Questions for topic 1
- `?difficulty=Hard` → Only Hard questions
- `?q_type=MCQ` → Only MCQ type questions
- `?teacher_id=1` → Questions by teacher 1
- `?is_active=true` → Only active questions

**Combined Example:**
```
GET /api/v1/questions/?topic_id=1&difficulty=Medium&teacher_id=2
```

**Search Endpoints:**
```
GET /api/v1/questions/search/by-difficulty?difficulty=Easy
GET /api/v1/questions/search/by-type?q_type=True/False
```

### **6. User Management** (`/api/v1/users/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/users/` | Create new user (teacher) |
| GET | `/api/v1/users/` | List all users (filter by `?department=X`, `?is_admin=true`) |
| GET | `/api/v1/users/{user_id}` | Get specific user |
| GET | `/api/v1/users/email/{email}` | Get user by email |
| PATCH | `/api/v1/users/{user_id}` | Update user |
| DELETE | `/api/v1/users/{user_id}` | Delete user |

**Example Request (Create):**
```json
POST /api/v1/users/
{
  "full_name": "Dr. Sharma",
  "email": "sharma@school.com",
  "department": "Science",
  "is_admin": false
}
```

**Query Parameters:**
- `?department=Science` → Get all Science department users
- `?is_admin=true` → Get only admin users

**Email Lookup:**
```
GET /api/v1/users/email/sharma@school.com
```

### **7. Health Check**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/ping` | Health check endpoint |

**Response:**
```json
{"message": "pong"}
```

## Enums

### **DifficultyLevel**
```python
- "Easy"
- "Medium"
- "Hard"
```

### **QuestionType**
```python
- "MCQ"
- "True/False"
- "Match the Following"
- "Short Answer"
- "Long Answer"
```

## Error Handling

All endpoints follow standard HTTP conventions:

- **200 OK**: Successful GET request
- **201 Created**: Successful POST request (creation)
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Validation error or invalid foreign key reference
- **404 Not Found**: Resource does not exist
- **500 Internal Server Error**: Server error

### Example Error Response:
```json
{
  "detail": "Topic not found"
}
```

## Validation Rules

1. **Foreign Key Validation**: Before creating/updating records, referenced entities must exist
2. **Email Uniqueness**: User email must be unique across the system
3. **Enum Validation**: DifficultyLevel and QuestionType must use valid enum values
4. **Required Fields**: All fields marked in schema (without Optional) are mandatory on creation

## Running the Server

```bash
# Start the development server
python runserver.py

# Server will run at: http://127.0.0.1:8000

# Access API documentation:
# - Swagger UI: http://127.0.0.1:8000/docs
# - ReDoc: http://127.0.0.1:8000/redoc
```

## Implementation Details

### Async/Await Pattern
All database operations use `async`/`await` with SQLAlchemy's async engine for non-blocking I/O.

### Dependency Injection
FastAPI's `Depends()` system is used to inject the database session into each endpoint:
```python
async def endpoint(session: Session = Depends(get_session)):
    # Use session for database operations
```

### Response Models
Each endpoint specifies its response model using Pydantic schemas, ensuring consistent API contracts.

### Filtering
The `GET /api/v1/questions/` endpoint supports query parameter filtering:
- Multiple filters can be combined
- Unspecified filters are ignored
- Only `exclude_unset=True` is used for partial updates

## Schema Design

### Create Models
- Required fields only
- No IDs (auto-generated by database)

### Read Models
- Include ID
- Include all database fields
- Used as response models

### Update Models
- All fields optional
- Only provided fields are updated
- Supports partial updates (PATCH)

### Public Models
- Can include nested relationship data
- Used for rich responses (optional)

---

**Implementation Date:** February 15, 2026
**Framework:** FastAPI + SQLModel
**Database:** PostgreSQL (async)
**Python Version:** 3.12.10
