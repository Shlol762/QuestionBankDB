from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from src.db.main import get_session
from src.db.models import QuestionBank, Topic, Users
from src.schemas.questions import (
    QuestionCreate, QuestionRead, QuestionPublic, QuestionUpdate
)
from src.schemas.common import DifficultyLevel, QuestionType

router = APIRouter(prefix="/api/v1", tags=["Questions"])


# ==========================================
# QUESTION ENDPOINTS
# ==========================================
@router.post("/questions/", response_model=QuestionRead)
async def create_question(
    question: QuestionCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new question.
    Validates that:
    - topic_id exists in the database
    - teacher_id exists in the database
    """
    # Validate topic exists
    topic = await session.get(Topic, question.topic_id)
    if not topic:
        raise HTTPException(status_code=400, detail="Topic not found")
    
    # Validate teacher exists
    teacher = await session.get(Users, question.teacher_id)
    if not teacher:
        raise HTTPException(status_code=400, detail="Teacher not found")
    
    db_question = QuestionBank(**question.model_dump())
    session.add(db_question)
    await session.commit()
    await session.refresh(db_question)
    return db_question


@router.get("/questions/", response_model=list[QuestionRead])
async def list_questions(
    topic_id: Optional[int] = Query(None, description="Filter by topic ID"),
    difficulty: Optional[DifficultyLevel] = Query(None, description="Filter by difficulty level"),
    q_type: Optional[QuestionType] = Query(None, description="Filter by question type"),
    teacher_id: Optional[int] = Query(None, description="Filter by teacher ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    session: Session = Depends(get_session)
):
    """
    List all questions with optional filtering by:
    - topic_id: Questions for a specific topic
    - difficulty: EASY, MEDIUM, HARD
    - q_type: MCQ, True/False, Match the Following, Short Answer, Long Answer
    - teacher_id: Questions by a specific teacher
    - is_active: Only active (true) or inactive (false) questions
    """
    query = select(QuestionBank)
    
    if topic_id is not None:
        query = query.where(QuestionBank.topic_id == topic_id)
    
    if difficulty is not None:
        query = query.where(QuestionBank.difficulty == difficulty)
    
    if q_type is not None:
        query = query.where(QuestionBank.q_type == q_type)
    
    if teacher_id is not None:
        query = query.where(QuestionBank.teacher_id == teacher_id)
    
    if is_active is not None:
        query = query.where(QuestionBank.is_active == is_active)
    
    questions = await session.exec(query)
    return questions.all()


@router.get("/questions/{question_id}", response_model=QuestionRead)
async def get_question(
    question_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific question by ID"""
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.patch("/questions/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    question_update: QuestionUpdate,
    session: Session = Depends(get_session)
):
    """
    Update a question with partial fields.
    Cannot update: question_id, created_at
    """
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get only the fields that were actually provided
    update_data = question_update.model_dump(exclude_unset=True)
    
    # Update the fields
    for key, value in update_data.items():
        setattr(question, key, value)
    
    session.add(question)
    await session.commit()
    await session.refresh(question)
    return question


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    session: Session = Depends(get_session)
):
    """Delete a question"""
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await session.delete(question)
    await session.commit()
    return {"deleted": True}


@router.get("/questions/search/by-difficulty", response_model=list[QuestionRead])
async def search_by_difficulty(
    difficulty: DifficultyLevel,
    session: Session = Depends(get_session)
):
    """Get all questions of a specific difficulty level"""
    questions = await session.exec(
        select(QuestionBank).where(QuestionBank.difficulty == difficulty)
    )
    return questions.all()


@router.get("/questions/search/by-type", response_model=list[QuestionRead])
async def search_by_type(
    q_type: QuestionType,
    session: Session = Depends(get_session)
):
    """Get all questions of a specific type"""
    questions = await session.exec(
        select(QuestionBank).where(QuestionBank.q_type == q_type)
    )
    return questions.all()
