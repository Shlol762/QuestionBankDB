from datetime import datetime, timezone
from typing import Optional, List, Dict, TypeVar, Generic
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Session
from sqlalchemy import JSON, Column
from pydantic import BaseModel, ConfigDict

# --- ENUMS ---
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
# BASE MODEL CONFIG
# ==========================================
class BaseSQLModel(SQLModel):
    model_config = ConfigDict(str_strip_whitespace=True)

# ==========================================
# LINK TABLE: TEACHER <-> SUBJECT
# ==========================================
class UserSubjectLink(BaseSQLModel, table=True):
    __tablename__ = "user_subject_link"
    
    user_id: int = Field(foreign_key="users.user_id", primary_key=True, ondelete="CASCADE")
    subject_id: int = Field(foreign_key="subjects.subject_id", primary_key=True, ondelete="CASCADE")

# ==========================================
# LINK TABLE: GRADE COORDINATOR <-> GRADE LEVEL
# ==========================================
class GradeCoordinatorLink(BaseSQLModel, table=True):
    __tablename__ = "grade_coordinator_link"
    
    user_id: int = Field(foreign_key="users.user_id", primary_key=True, ondelete="CASCADE")
    grade_level: int = Field(primary_key=True)

# ==========================================
# LINK TABLE: HOD <-> SUBJECT NAME
# ==========================================
class HODLink(BaseSQLModel, table=True):
    __tablename__ = "hod_link"
    
    user_id: int = Field(foreign_key="users.user_id", primary_key=True, ondelete="CASCADE")
    subject_name: str = Field(primary_key=True)

# ==========================================
# LEVEL 1: THE CONTEXT (Syllabus)
# ==========================================
class SyllabusMaster(BaseSQLModel, table=True):
    __tablename__ = "syllabus_master"

    syllabus_id: Optional[int] = Field(default=None, primary_key=True)
    syllabus_name: str
    academic_year: str
    pdf_url: Optional[str] = None
    
    # Cascade: If Syllabus is deleted, delete all Grades
    grades: List["GradeConfig"] = Relationship(back_populates="syllabus", cascade_delete=True)

    def __repr__(self):
        return f"<SyllabusMaster(id={self.syllabus_id}, name='{self.syllabus_name}')>"

# ==========================================
# LEVEL 2: THE GRADE
# ==========================================
class GradeConfig(BaseSQLModel, table=True):
    __tablename__ = "grade_config"

    config_id: Optional[int] = Field(default=None, primary_key=True)
    syllabus_id: int = Field(foreign_key="syllabus_master.syllabus_id", ondelete="CASCADE")
    syllabus: SyllabusMaster = Relationship(back_populates="grades")
    
    grade_level: int
    
    # Cascade: If Grade is deleted, delete all Subjects
    subjects: List["Subject"] = Relationship(back_populates="grade", cascade_delete=True)

    def __repr__(self):
        return f"<GradeConfig(id={self.config_id}, level={self.grade_level})>"

# ==========================================
# LEVEL 3: THE SUBJECT
# ==========================================
class Subject(BaseSQLModel, table=True):
    __tablename__ = "subjects"
    
    subject_id: Optional[int] = Field(default=None, primary_key=True)
    subject_name: str
    config_id: int = Field(foreign_key="grade_config.config_id", ondelete="CASCADE")
    grade: GradeConfig = Relationship(back_populates="subjects")
    
    # Cascade: If Subject is deleted, delete all Topics
    topics: List["Topic"] = Relationship(back_populates="subject", cascade_delete=True)
    teachers: List["Users"] = Relationship(back_populates="subjects", link_model=UserSubjectLink)

    def __repr__(self):
        return f"<Subject(id={self.subject_id}, name='{self.subject_name}')>"

# ==========================================
# LEVEL 4: THE TOPIC
# ==========================================
class Topic(BaseSQLModel, table=True):
    __tablename__ = "topics"
    
    topic_id: Optional[int] = Field(default=None, primary_key=True)
    topic_name: str
    subject_id: int = Field(foreign_key="subjects.subject_id", ondelete="CASCADE")
    subject: Subject = Relationship(back_populates="topics")
    
    # Cascade: If Topic is deleted, delete all Questions
    questions: List["QuestionBank"] = Relationship(back_populates="topic", cascade_delete=True)

    def __repr__(self):
        return f"<Topic(id={self.topic_id}, name='{self.topic_name}')>"

# ==========================================
# LEVEL 5: THE USERS
# ==========================================
class Users(BaseSQLModel, table=True):
    __tablename__ = "users"

    user_id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str = Field(exclude=True)
    department: str
    is_admin: bool = Field(default=False)
    
    subjects: List[Subject] = Relationship(back_populates="teachers", link_model=UserSubjectLink)
    grade_coordinating: List[GradeCoordinatorLink] = Relationship(cascade_delete=True)
    hod_subjects: List[HODLink] = Relationship(cascade_delete=True)
    
    # Cascade: If Teacher is deleted, delete their Questions (or we could set to NULL, but cascade is safer for now)
    questions: List["QuestionBank"] = Relationship(back_populates="teacher", cascade_delete=True)

    def can_manage_grade(self, grade_level: Optional[int] = None) -> bool:
        """Admins can manage all grades; coordinators can manage their assigned grades."""
        if self.is_admin:
            return True
        if grade_level is None:
            return False
        return any(g.grade_level == grade_level for g in self.grade_coordinating)

    def can_manage_subject(self, grade_level: int) -> bool:
        """Admins and Grade Coordinators can manage subjects within a grade."""
        if self.is_admin: return True
        return any(g.grade_level == grade_level for g in self.grade_coordinating)

    def can_modify_topic(self, subject_id: int, subject_name: str, grade_level: int) -> bool:
        """Admins, Coordinators, HODs, and Assigned Teachers can modify topics."""
        if self.is_admin: return True
        
        # Normalized comparison for HOD (Case-Insensitive)
        search_name = subject_name.strip().lower()
        if any(h.subject_name.strip().lower() == search_name for h in self.hod_subjects):
            return True
            
        # Grade Coordinator for the grade
        if any(g.grade_level == grade_level for g in self.grade_coordinating):
            return True
            
        # Assigned Teacher for the specific subject ID
        if any(s.subject_id == subject_id for s in self.subjects):
            return True
            
        return False

    def __repr__(self):
        return f"<User(id={self.user_id}, name='{self.full_name}')>"

# ==========================================
# LEVEL 6: THE CONTENT (Questions)
# ==========================================
class QuestionBank(BaseSQLModel, table=True):
    __tablename__ = "question_bank"

    question_id: Optional[int] = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topics.topic_id", ondelete="CASCADE")
    topic: Topic = Relationship(back_populates="questions")
    
    teacher_id: int = Field(foreign_key="users.user_id", ondelete="CASCADE")
    teacher: Users = Relationship(back_populates="questions")

    question_text: str
    answer_text: str
    # Options stored as JSON for flexibility: {"A": "Choice 1", "B": "Choice 2"...}
    options: Optional[Dict[str, str]] = Field(default=None, sa_column=Column(JSON))
    image_url: Optional[str] = None 
    marks: int
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    q_type: QuestionType = Field(default=QuestionType.MCQ)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    def __repr__(self):
        short_text = (self.question_text[:30] + '..') if len(self.question_text) > 30 else self.question_text
        return f"<Question(id={self.question_id}, text='{short_text}')>"


# ==========================================
# PAGINATION GENERIC MODELS
# ==========================================

T = TypeVar('T')

class Page(BaseModel, Generic[T]):
    """
    Standardized paginated response model.
    """
    items: List[T]
    total: int

    model_config = ConfigDict(arbitrary_types_allowed=True)
