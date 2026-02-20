from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
import os
import uuid
from datetime import datetime
from src.db.main import get_session
from src.db.models import QuestionBank, Users, Topic, DifficultyLevel, QuestionType, Subject
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
    """Creates a new question. Verifies management rights for the topic."""
    # Load topic with subject and grade level
    stmt = select(Topic).where(Topic.topic_id == data.topic_id).options(
        selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    topic = result.first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if not current_user.can_manage_topic(topic.subject_id, topic.subject.subject_name, topic.subject.grade.grade_level):
        raise HTTPException(status_code=403, detail="Not authorized for this subject/topic")
    
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
    """Lists questions. Admins see all, others see based on permissions."""
    statement = select(QuestionBank).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    )
    
    if not current_user.is_admin:
        # Complex filtering for HOD and Grade Coordinator might be better done with a JOIN
        # or by gathering allowed subject IDs
        # But for simplicity, we can fetch all and filter if the list isn't massive, 
        # or better, build a targeted query.
        
        # Gathering IDs:
        # 1. Subject IDs assigned as Teacher
        # 2. Subject names assigned as HOD
        # 3. Grade levels assigned as Coordinator
        
        teacher_subject_ids = [s.subject_id for s in current_user.subjects]
        hod_subject_names = [h.subject_name for h in current_user.hod_subjects]
        coordinator_grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        
        from sqlalchemy import or_
        from src.db.models import GradeConfig
        
        statement = statement.join(Topic).join(Subject).join(GradeConfig)
        
        filters = []
        if teacher_subject_ids:
            filters.append(Subject.subject_id.in_(teacher_subject_ids))
        if hod_subject_names:
            filters.append(Subject.subject_name.in_(hod_subject_names))
        if coordinator_grade_levels:
            filters.append(GradeConfig.grade_level.in_(coordinator_grade_levels))
        
        if filters:
            statement = statement.where(or_(*filters))
        else:
            # If no roles at all, can only see their own questions if any? 
            # Current logic for list_questions didn't handle "own only" specifically besides subjects.
            statement = statement.where(QuestionBank.teacher_id == current_user.user_id)
    
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
    """Updates a question. Author, Admin, HOD, or Grade Coordinator."""
    stmt = select(QuestionBank).where(QuestionBank.question_id == question_id).options(
        selectinload(QuestionBank.topic).selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    question = result.first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    can_manage = current_user.can_manage_topic(
        question.topic.subject_id, 
        question.topic.subject.subject_name, 
        question.topic.subject.grade.grade_level
    )
    
    if question.teacher_id != current_user.user_id and not can_manage:
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
    """Deletes a question. Author, Admin, HOD, or Grade Coordinator."""
    stmt = select(QuestionBank).where(QuestionBank.question_id == question_id).options(
        selectinload(QuestionBank.topic).selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    question = result.first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    can_manage = current_user.can_manage_topic(
        question.topic.subject_id, 
        question.topic.subject.subject_name, 
        question.topic.subject.grade.grade_level
    )
    
    if question.teacher_id != current_user.user_id and not can_manage:
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    
    await session.delete(question)
    await session.commit()
    return None
