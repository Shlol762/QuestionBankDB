from typing import Optional, List
from sqlmodel import SQLModel, Field


# ==========================================
# SYLLABUS SCHEMAS
# ==========================================
class SyllabusBase(SQLModel):
    """Base schema for Syllabus"""
    syllabus_name: str = Field(..., description="Name of the syllabus (e.g., CBSE, ICSE)")
    academic_year: str = Field(..., description="Academic year (e.g., 2025-2026)")


class SyllabusCreate(SyllabusBase):
    """Schema for creating a new Syllabus"""
    pass


class SyllabusUpdate(SQLModel):
    """Schema for updating a Syllabus"""
    syllabus_name: Optional[str] = None
    academic_year: Optional[str] = None


class SyllabusRead(SyllabusBase):
    """Schema for reading Syllabus (includes ID)"""
    syllabus_id: int


# ==========================================
# GRADE CONFIG SCHEMAS
# ==========================================
class GradeBase(SQLModel):
    """Base schema for Grade Config"""
    grade_level: int = Field(..., description="Grade level (e.g., 10, 11, 12)")
    syllabus_id: int = Field(..., description="ID of the parent syllabus")


class GradeCreate(GradeBase):
    """Schema for creating a new Grade"""
    pass


class GradeUpdate(SQLModel):
    """Schema for updating a Grade"""
    grade_level: Optional[int] = None
    syllabus_id: Optional[int] = None


class GradeRead(GradeBase):
    """Schema for reading Grade (includes ID)"""
    config_id: int


class GradePublic(GradeRead):
    """Public grade response with syllabus details"""
    syllabus: Optional["SyllabusRead"] = None


# ==========================================
# SUBJECT SCHEMAS
# ==========================================
class SubjectBase(SQLModel):
    """Base schema for Subject"""
    subject_name: str = Field(..., description="Name of the subject (e.g., Physics, Mathematics)")
    config_id: int = Field(..., description="ID of the parent grade config")


class SubjectCreate(SubjectBase):
    """Schema for creating a new Subject"""
    pass


class SubjectUpdate(SQLModel):
    """Schema for updating a Subject"""
    subject_name: Optional[str] = None
    config_id: Optional[int] = None


class SubjectRead(SubjectBase):
    """Schema for reading Subject (includes ID)"""
    subject_id: int


class SubjectPublic(SubjectRead):
    """Public subject response with grade details"""
    grade: Optional["GradeRead"] = None


# ==========================================
# TOPIC SCHEMAS
# ==========================================
class TopicBase(SQLModel):
    """Base schema for Topic"""
    topic_name: str = Field(..., description="Name of the topic (e.g., Kinematics, Algebra)")
    subject_id: int = Field(..., description="ID of the parent subject")


class TopicCreate(TopicBase):
    """Schema for creating a new Topic"""
    pass


class TopicUpdate(SQLModel):
    """Schema for updating a Topic"""
    topic_name: Optional[str] = None
    subject_id: Optional[int] = None


class TopicRead(TopicBase):
    """Schema for reading Topic (includes ID)"""
    topic_id: int


class TopicPublic(TopicRead):
    """Public topic response with subject details"""
    subject: Optional["SubjectRead"] = None


# Update forward references
GradePublic.model_rebuild()
SubjectPublic.model_rebuild()
TopicPublic.model_rebuild()
