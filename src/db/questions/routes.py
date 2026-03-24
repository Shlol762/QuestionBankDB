from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional, Any
import os
import uuid
import puremagic
from datetime import datetime, timezone
from src.db.main import get_session
from src.db.models import QuestionBank, Users, Topic, DifficultyLevel, QuestionType, QuestionStatus, Subject, Page
from src.db.auth_utils import get_current_user
from src.limiter import limiter
from pydantic import BaseModel, Field, ConfigDict, model_validator
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
    model_config = ConfigDict(str_strip_whitespace=True)
    
    topic_id: int
    question_text: str
    answer_text: str
    options: Optional[dict] = None
    image_url: Optional[str] = None
    marks: int = Field(ge=0)  # ge=0 allows grace marks (0)
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    q_type: QuestionType = QuestionType.MCQ
    status: QuestionStatus = QuestionStatus.DRAFT

    @model_validator(mode='after')
    def verify_mcq_integrity(self) -> 'QuestionCreate':
        """
        Validates that Multiple Choice Questions (MCQ) have:
        1. A non-empty options dictionary.
        2. An answer_text that matches one of the option keys (e.g., 'A', 'B').
        """
        if self.q_type == QuestionType.MCQ:
            if not self.options:
                raise ValueError("Options must be provided for MCQ questions.")
            
            # Ensure answer_text corresponds to a valid option key
            # We strip whitespace to be forgiving, as keys like " A " are bad practice but might exist.
            valid_keys = [k.strip() for k in self.options.keys()]
            if self.answer_text.strip() not in valid_keys:
                raise ValueError(f"The answer '{self.answer_text}' is not a valid option key. Available: {valid_keys}")
        return self

class QuestionRead(QuestionCreate):
    question_id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime
    teacher: Optional[UserSimple] = None
    topic: Optional[TopicSimple] = None

class QuestionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    
    topic_id: Optional[int] = None
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    options: Optional[dict] = None
    image_url: Optional[str] = None
    marks: Optional[int] = Field(default=None, ge=0)
    difficulty: Optional[DifficultyLevel] = None
    q_type: Optional[QuestionType] = None
    is_active: Optional[bool] = None
    status: Optional[QuestionStatus] = None

# --- CONSTANTS ---
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MIME_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

# --- HELPERS ---

def validate_question_logic(question: QuestionBank):
    """
    Runtime validation for QuestionBank objects.
    Used during updates to ensure the final state of the object is valid.
    """
    if question.q_type == QuestionType.MCQ:
        if not question.options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Integrity Error: MCQ questions must have options."
            )
        
        valid_keys = [str(k).strip() for k in question.options.keys()]
        if question.answer_text.strip() not in valid_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Integrity Error: Answer '{question.answer_text}' is not in options {valid_keys}"
            )

# --- ROUTES ---

@router.post("/upload-image")
@limiter.limit("20/minute")
async def upload_question_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user)
):
    """
    Uploads an image for a question.
    Enforces a 50MB size limit and verifies the magic numbers (MIME type).
    """
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    # 1. Size Validation
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )
    
    # 2. MIME Type Validation (Deep Check)
    exts = []
    try:
        exts = puremagic.from_string(content)
        # puremagic returns a list of possibilities; check if any match allowed images
        is_valid = any(m.mime_type in ALLOWED_IMAGE_MIMES for m in exts)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_MIMES)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not verify file type"
        )

    detected_mime = next((m.mime_type for m in exts if m.mime_type in MIME_EXTENSION_MAP), None)
    if not detected_mime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine a safe file extension",
        )

    unique_filename = f"{uuid.uuid4()}{MIME_EXTENSION_MAP[detected_mime]}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {"image_url": f"/static/{unique_filename}"}

@router.post("/", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(
    data: QuestionCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Creates a new question. Verifies management rights for the topic."""
    stmt = select(Topic).where(Topic.topic_id == data.topic_id).options(
        selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    topic = result.first()
    if not topic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Target topic not found")
    
    if not current_user.can_modify_topic(topic.subject_id, topic.subject.subject_name, topic.subject.grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to add questions to this topic")
    
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

@router.get("/", response_model=Page[QuestionRead])
async def list_questions(
    topic_id: Optional[int] = None,
    difficulty: Optional[DifficultyLevel] = None,
    q_type: Optional[QuestionType] = None,
    status_filter: Optional[QuestionStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    include_drafts: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Lists questions with pagination. Admins see all, others see based on permissions. Drafts only visible to author."""
    
    from src.db.models import GradeConfig
    from sqlalchemy import or_, func

    # Base statement for both count and data fetching
    base_stmt = select(QuestionBank)
    
    if not current_user.is_admin:
        teacher_subject_ids = [s.subject_id for s in current_user.subjects]
        hod_subject_names = [h.subject_name for h in current_user.hod_subjects]
        coordinator_grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        
        base_stmt = base_stmt.join(Topic).join(Subject).join(GradeConfig)
        
        filters = []
        if teacher_subject_ids:
            filters.append(Subject.subject_id.in_(teacher_subject_ids))
        if hod_subject_names:
            filters.append(Subject.subject_name.in_(hod_subject_names))
        if coordinator_grade_levels:
            filters.append(GradeConfig.grade_level.in_(coordinator_grade_levels))
        
        if filters:
            base_stmt = base_stmt.where(or_(*filters))
        else:
            # If a user has no roles, only show their own questions
            base_stmt = base_stmt.where(QuestionBank.teacher_id == current_user.user_id)
    
    # Draft visibility: non-admins only see their own drafts
    if not current_user.is_admin:
        base_stmt = base_stmt.where(
            or_(
                QuestionBank.status != QuestionStatus.DRAFT,
                QuestionBank.teacher_id == current_user.user_id
            )
        )
    
    # Filter by status if specified
    if status_filter:
        base_stmt = base_stmt.where(QuestionBank.status == status_filter)
    else:
        # Default: exclude archived questions unless explicitly requested
        base_stmt = base_stmt.where(QuestionBank.status != QuestionStatus.ARCHIVED)
    
    # Apply standard filters
    if topic_id:
        base_stmt = base_stmt.where(QuestionBank.topic_id == topic_id)
    if difficulty:
        base_stmt = base_stmt.where(QuestionBank.difficulty == difficulty)
    if q_type:
        base_stmt = base_stmt.where(QuestionBank.q_type == q_type)
    if search:
        base_stmt = base_stmt.where(func.lower(QuestionBank.question_text).contains(search.lower()))

    # Keep is_active for backward compatibility, but it's now supplemented by status
    base_stmt = base_stmt.where(QuestionBank.is_active == True)

    # Count total matching records
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await session.exec(count_stmt)).one()
    
    # Get the paginated data
    data_stmt = base_stmt.options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic)
    ).order_by(
        QuestionBank.created_at.desc(),
        QuestionBank.question_id.desc(),
    ).offset(offset).limit(limit)
    
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(
    question_id: int, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Retrieves a specific question by its ID. Enforces permission boundaries."""
    statement = select(QuestionBank).where(QuestionBank.question_id == question_id).options(
        selectinload(QuestionBank.teacher),
        selectinload(QuestionBank.topic).selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(statement)
    question = result.first()
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    if not question.is_active and not current_user.is_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    
    # Permission Check
    if not current_user.is_admin:
        can_view = current_user.can_modify_topic(
            question.topic.subject_id,
            question.topic.subject.subject_name,
            question.topic.subject.grade.grade_level
        )
        if question.teacher_id != current_user.user_id and not can_view:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not authorized to view this question")

    return question

@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """
    Updates a question. Author, Admin, HOD, or Grade Coordinator.
    Uses 'with_for_update' to prevent race conditions (BT-10).
    Validates logical integrity of the final object state (BT-03).
    Automatically updates the updated_at timestamp.
    """
    # Use with_for_update() to lock the row for the duration of this transaction
    stmt = select(QuestionBank).where(QuestionBank.question_id == question_id).with_for_update().options(
        selectinload(QuestionBank.topic).selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    question = result.first()
    
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    
    can_manage = current_user.can_modify_topic(
        question.topic.subject_id, 
        question.topic.subject.subject_name, 
        question.topic.subject.grade.grade_level
    )
    
    if question.teacher_id != current_user.user_id and not can_manage:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to update this question")
    
    # Apply updates
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    # Always update the updated_at timestamp
    question.updated_at = datetime.now(timezone.utc)
    
    # Logic Validation (ensure integrity of the NEW state)
    validate_question_logic(question)
    
    session.add(question)
    await session.commit()
    
    # Refresh logic for response
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
    # Use with_for_update() to prevent race conditions during deletion check
    stmt = select(QuestionBank).where(QuestionBank.question_id == question_id).with_for_update().options(
        selectinload(QuestionBank.topic).selectinload(Topic.subject).selectinload(Subject.grade)
    )
    result = await session.exec(stmt)
    question = result.first()
    
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    
    can_manage = current_user.can_modify_topic(
        question.topic.subject_id, 
        question.topic.subject.subject_name, 
        question.topic.subject.grade.grade_level
    )
    
    if question.teacher_id != current_user.user_id and not can_manage:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to delete this question")
    
    await session.delete(question)
    await session.commit()
    return None
