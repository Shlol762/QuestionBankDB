from datetime import datetime, timezone
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship

# --- ENUMS (Dropdown Options) ---
class DifficultyLevel(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class QuestionType(str, Enum):
    MCQ = "MCQ"
    TRUE_FALSE = "True/False"
    MATCH_THE_FOLLOWING = "Match the Following"
    SHORT_ANSWER = "Short Answer"
    LONG_ANSWER = "Long Answer"

# ==========================================
# LINK TABLE: TEACHER <-> SUBJECT
# ==========================================
class UserSubjectLink(SQLModel, table=True):
    __tablename__ = "user_subject_link"
    
    user_id: int = Field(foreign_key="users.user_id", primary_key=True)
    subject_id: int = Field(foreign_key="subjects.subject_id", primary_key=True)

# ==========================================
# LEVEL 1: THE CONTEXT (Syllabus & Year)
# ==========================================
class SyllabusMaster(SQLModel, table=True):
    __tablename__ = "syllabus_master"

    syllabus_id: Optional[int] = Field(default=None, primary_key=True)
    syllabus_name: str  # e.g., "CBSE", "ICSE"
    academic_year: str  # e.g., "2025-2026"
    
    # Relationship: One Syllabus has many Grades
    grades: List["GradeConfig"] = Relationship(back_populates="syllabus")

    def __repr__(self):
        return f"<SyllabusMaster(id={self.syllabus_id}, name='{self.syllabus_name}', year='{self.academic_year}')>"

# ==========================================
# LEVEL 2: THE GRADE (Class 10, 11...)
# ==========================================
class GradeConfig(SQLModel, table=True):
    __tablename__ = "grade_config"

    config_id: Optional[int] = Field(default=None, primary_key=True)
    
    # Link to Syllabus
    syllabus_id: int = Field(foreign_key="syllabus_master.syllabus_id")
    syllabus: SyllabusMaster = Relationship(back_populates="grades")
    
    grade_level: int  # e.g., 10, 11
    
    # Relationship: One Grade has many Subjects
    subjects: List["Subject"] = Relationship(back_populates="grade")

    def __repr__(self):
        return f"<GradeConfig(id={self.config_id}, grade={self.grade_level}, syllabus_id={self.syllabus_id})>"

# ==========================================
# LEVEL 3: THE SUBJECT (Physics, Math)
# ==========================================
class Subject(SQLModel, table=True):
    __tablename__ = "subjects"
    
    subject_id: Optional[int] = Field(default=None, primary_key=True)
    subject_name: str # e.g., "Physics"
    
    # Link to Grade
    config_id: int = Field(foreign_key="grade_config.config_id")
    grade: GradeConfig = Relationship(back_populates="subjects")
    
    # Relationship: One Subject has many Topics
    topics: List["Topic"] = Relationship(back_populates="subject")
    
    # Many-to-Many: Subject linked to multiple Teachers
    teachers: List["Users"] = Relationship(back_populates="subjects", link_model=UserSubjectLink)

    def __repr__(self):
        return f"<Subject(id={self.subject_id}, name='{self.subject_name}', config_id={self.config_id})>"

# ==========================================
# LEVEL 4: THE TOPIC (Kinematics, Algebra)
# ==========================================
class Topic(SQLModel, table=True):
    __tablename__ = "topics"
    
    topic_id: Optional[int] = Field(default=None, primary_key=True)
    topic_name: str # e.g., "Kinematics"
    
    # Link to Subject
    subject_id: int = Field(foreign_key="subjects.subject_id")
    subject: Subject = Relationship(back_populates="topics")
    
    # Relationship: One Topic has many Questions
    questions: List["QuestionBank"] = Relationship(back_populates="topic")

    def __repr__(self):
        return f"<Topic(id={self.topic_id}, name='{self.topic_name}', subject_id={self.subject_id})>"

# ==========================================
# LEVEL 5: THE USERS (Teachers)
# ==========================================
class Users(SQLModel, table=True):
    __tablename__ = "users"

    user_id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str = Field(exclude=True)
    department: str  # e.g., "Science"
    is_admin: bool = Field(default=False)
    
    # Many-to-Many: User assigned to multiple Subjects
    subjects: List[Subject] = Relationship(back_populates="teachers", link_model=UserSubjectLink)
    
    # Relationship: One Teacher writes many Questions
    questions: List["QuestionBank"] = Relationship(back_populates="teacher")

    def __repr__(self):
        return f"<User(id={self.user_id}, name='{self.full_name}', email='{self.email}')>"

# ==========================================
# LEVEL 6: THE CONTENT (Questions)
# ==========================================
class QuestionBank(SQLModel, table=True):
    __tablename__ = "question_bank"

    question_id: Optional[int] = Field(default=None, primary_key=True)
    
    # LINK 1: TOPIC (Determines Subject, Grade, and Syllabus automatically!)
    topic_id: int = Field(foreign_key="topics.topic_id")
    topic: Topic = Relationship(back_populates="questions")
    
    # LINK 2: AUTHOR (Who wrote this?)
    teacher_id: int = Field(foreign_key="users.user_id")
    teacher: Users = Relationship(back_populates="questions")

    # The Actual Content
    question_text: str
    answer_text: str
    image_url: Optional[str] = None 
    marks: int
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    q_type: QuestionType = Field(default=QuestionType.MCQ)
    
    # Metadata
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    def __repr__(self):
        short_text = (self.question_text[:30] + '..') if len(self.question_text) > 30 else self.question_text
        return (
            f"<Question(id={self.question_id}, "
            f"type={self.q_type.value}, "
            f"marks={self.marks}, "
            f"topic_id={self.topic_id}, "
            f"text='{short_text}')>"
        )