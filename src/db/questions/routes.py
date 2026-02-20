from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
import os
import uuid
from datetime import datetime
from src.db.main import get_session
from src.db.models import QuestionBank, Users, Topic, DifficultyLevel, QuestionType
from src.db.auth_utils import get_current_user
from pydantic import BaseModel
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/questions", tags=["Question Management"])

# --- SCHEMAS ---

class UserSimple(BaseModel):
    user_id: int
    full_name: str

class TopicSimple(BaseModel):
    topic_id: int
    topic_name: str
    subject_id: int

class QuestionCreate(BaseModel):
    topic_id: int
    question_text: str
    answer_text: str
    options: Optional[dict] = None
    image_url: Optional[str] = None
    marks: int
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    q_type: QuestionType = QuestionType.MCQ

class QuestionRead(QuestionCreate):
    question_id: int
    teacher_id: int
    created_at: datetime
    teacher: Optional[UserSimple] = None
    topic: Optional[TopicSimple] = None

class QuestionUpdate(BaseModel):
    topic_id: Optional[int] = None
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    image_url: Optional[str] = None
    marks: Optional[int] = None
    difficulty: Optional[DifficultyLevel] = None
    q_type: Optional[QuestionType] = None
    is_active: Optional[bool] = None

# --- CONSTANTS ---
UPLOAD_DIR = "uploads"

# --- ROUTES ---

@router.post("/upload-image")
async def upload_question_image(
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user)
):
    """Uploads an image for a question and returns its path."""
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    return {"image_url": f"/static/{unique_filename}"}

@router.post("/", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    data: QuestionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Creates a new question. Verifies topic ownership/assignment."""
    topic = await session.get(Topic, data.topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if not current_user.is_admin:
        assigned_subject_ids = [s.subject_id for s in current_user.subjects]
        if topic.subject_id not in assigned_subject_ids:
            raise HTTPException(status_code=403, detail="Not authorized for this subject")
    
    new_question = QuestionBank(
        **data.model_dump(),
        teacher_id=current_user.user_id
    )
    
    session.add(new_question)
    await session.commit()
    
    stmt = select(QuestionBank).where(QuestionBank.question_id == new_question.question_id).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    )
    result = await session.exec(stmt)
    return result.first()

@router.get("/", response_model=List[QuestionRead])
async def list_questions(
    topic_id: Optional[int] = None,
    difficulty: Optional[DifficultyLevel] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Lists questions. Admins see all, Teachers see assigned subjects only."""
    statement = select(QuestionBank).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    )
    
    if not current_user.is_admin:
        assigned_subject_ids = [s.subject_id for s in current_user.subjects]
        statement = statement.join(Topic).where(Topic.subject_id.in_(assigned_subject_ids))
    
    if topic_id:
        statement = statement.where(QuestionBank.topic_id == topic_id)
    if difficulty:
        statement = statement.where(QuestionBank.difficulty == difficulty)
    
    result = await session.exec(statement)
    return result.all()

@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(
    question_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Retrieves a specific question by its ID."""
    statement = select(QuestionBank).where(QuestionBank.question_id == question_id).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    )
    result = await session.exec(statement)
    question = result.first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Updates a question. Only the author or an admin can perform this."""
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.teacher_id != current_user.user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this question")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    session.add(question)
    await session.commit()
    
    stmt = select(QuestionBank).where(QuestionBank.question_id == question_id).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    )
    result = await session.exec(stmt)
    return result.first()

@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Deletes a question. Only the author or an admin can perform this."""
    question = await session.get(QuestionBank, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if question.teacher_id != current_user.user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    
    await session.delete(question)
    await session.commit()
    return None
