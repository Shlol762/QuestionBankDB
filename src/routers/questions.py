from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional
from src.db.main import get_session
from src.db.models import QuestionBank, Topic, Users
from src.schemas.questions import QuestionCreate, QuestionRead, QuestionUpdate
from src.schemas.common import DifficultyLevel, QuestionType
from src.auth.deps import get_current_user

router = APIRouter(prefix="/api/v1", tags=["Questions"])

@router.post("/questions/", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    question: QuestionCreate,
    session: AsyncSession = Depends(get_session),
    user: Users = Depends(get_current_user)
):
    topic = await session.get(Topic, question.topic_id)
    if not topic:
        raise HTTPException(status_code=400, detail="Topic not found")
    db_question = QuestionBank(
        question_text=question.question_text,
        answer_text=question.answer_text,
        marks=question.marks,
        difficulty=question.difficulty,
        q_type=question.q_type,
        image_url=question.image_url,
        topic_id=question.topic_id,
        teacher_id=user.user_id  # Set to current user
    )
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
    session: AsyncSession = Depends(get_session)
):
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
    session: AsyncSession = Depends(get_session)
):
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.patch("/questions/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    question_update: QuestionUpdate,
    session: AsyncSession = Depends(get_session),
    user: Users = Depends(get_current_user)
):
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not (user.is_admin or question.teacher_id == user.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to update this question")
    update_data = question_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    session.add(question)
    await session.commit()
    await session.refresh(question)
    return question

@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    session: AsyncSession = Depends(get_session),
    user: Users = Depends(get_current_user)
):
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not (user.is_admin or question.teacher_id == user.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    await session.delete(question)
    await session.commit()
    return {"deleted": True}