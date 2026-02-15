from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from src.schemas.common import DifficultyLevel, QuestionType
from src.schemas.master_data import TopicRead


# ==========================================
# QUESTION SCHEMAS
# ==========================================
class QuestionBase(SQLModel):
    """Base schema for Question"""
    question_text: str = Field(..., description="The question text/content")
    answer_text: str = Field(..., description="The answer or solution")
    marks: int = Field(..., ge=1, description="Marks for this question")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM, description="Difficulty level")
    q_type: QuestionType = Field(default=QuestionType.MCQ, description="Type of question")
    image_url: Optional[str] = Field(None, description="Optional image URL for the question")


class QuestionCreate(QuestionBase):
    """Schema for creating a new Question"""
    topic_id: int = Field(..., description="ID of the topic this question belongs to")
    teacher_id: int = Field(..., description="ID of the teacher/author creating this question")


class QuestionUpdate(SQLModel):
    """Schema for updating a Question (all fields optional)"""
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    marks: Optional[int] = Field(None, ge=1)
    difficulty: Optional[DifficultyLevel] = None
    q_type: Optional[QuestionType] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class QuestionRead(QuestionBase):
    """Schema for reading Question (includes ID and metadata)"""
    question_id: int
    topic_id: int
    teacher_id: int
    is_active: bool = True
    created_at: datetime


class QuestionPublic(QuestionRead):
    """Public question response (optional topic details)"""
    topic: Optional[TopicRead] = None
    teacher_name: Optional[str] = None
