from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Query, Request
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
import os
import uuid
import puremagic
from src.db.main import get_session
from src.db.models import SyllabusMaster, GradeConfig, Subject, Topic, Users, Page
from src.db.auth_utils import get_current_user
from src.limiter import limiter
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/curriculum", tags=["Curriculum Management"])

# --- SCHEMAS (Data Transfer Objects) ---

class BaseCurriculumModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

class TopicRead(BaseCurriculumModel):
    topic_id: int
    topic_name: str
    subject_id: int

class SubjectRead(BaseCurriculumModel):
    subject_id: int
    subject_name: str
    config_id: int

class GradeRead(BaseCurriculumModel):
    config_id: int
    syllabus_id: int
    grade_level: int
    pdf_url: Optional[str] = None

class SyllabusRead(BaseCurriculumModel):
    syllabus_id: int
    syllabus_name: str
    academic_year: str
    pdf_url: Optional[str] = None

# Hierarchy Versions (for the Tree View)
class SubjectHierarchy(SubjectRead):
    topics: List[TopicRead] = []

class GradeHierarchy(GradeRead):
    subjects: List[SubjectHierarchy] = []

class SyllabusHierarchyRead(SyllabusRead):
    grades: List[GradeHierarchy] = []

# --- UPDATE SCHEMAS ---

class SyllabusUpdate(BaseCurriculumModel):
    syllabus_name: Optional[str] = Field(default=None, min_length=1)
    academic_year: Optional[str] = Field(default=None, min_length=1)
    pdf_url: Optional[str] = None

class GradeUpdate(BaseCurriculumModel):
    grade_level: Optional[int] = None
    pdf_url: Optional[str] = None

class SubjectUpdate(BaseCurriculumModel):
    subject_name: Optional[str] = Field(default=None, min_length=1)

class TopicUpdate(BaseCurriculumModel):
    topic_name: Optional[str] = Field(default=None, min_length=1)

# --- CREATION SCHEMAS ---

class SyllabusCreate(BaseCurriculumModel):
    syllabus_name: str = Field(min_length=1)
    academic_year: str = Field(min_length=1)
    pdf_url: Optional[str] = None

class GradeCreate(BaseCurriculumModel):
    syllabus_id: int
    grade_level: int

class SubjectCreate(BaseCurriculumModel):
    config_id: int
    allowed_subject_id: int
    subject_name: str = Field(min_length=1)

class TopicCreate(BaseCurriculumModel):
    subject_id: int
    topic_name: str = Field(min_length=1)

# --- CONSTANTS ---
UPLOAD_DIR = "uploads/curriculum"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_MIME_TYPES = ["application/pdf"]

# --- ROUTES: SYLLABUS ---

@router.post("/upload-pdf")
@limiter.limit("20/minute")
async def upload_syllabus_pdf(
    request: Request,
    file: UploadFile = File(...),
    current_user: Users = Depends(get_current_user)
):
    """
    Uploads a PDF for a syllabus. 
    Enforces a 50MB size limit and verifies file header (magic numbers).
    """
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can upload syllabus documents")
    
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    # 1. Size Validation
    content = await file.read()
    file_size = len(content)
    
    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
        
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({file_size} bytes). Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )
    
    # 2. MIME Type Validation (Deep Check)
    is_pdf = False
    detected_str = "None"
    try:
        # Manual Check for standard PDF header as fallback
        if content.startswith(b"%PDF-"):
            is_pdf = True
            detected_str = "Manual %PDF- match"
        else:
            exts = puremagic.from_string(content)
            detected_mimes = [m.mime_type for m in exts]
            detected_str = ", ".join(detected_mimes)
            is_pdf = any(mime in ALLOWED_MIME_TYPES for mime in detected_mimes)
        
        if not is_pdf:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid file type. Size: {file_size} bytes. Detected: {detected_str}. Only PDF allowed."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Verification error: {str(e)}")

    unique_filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    return {"pdf_url": f"/static/curriculum/{unique_filename}"}

@router.post("/syllabuses", response_model=SyllabusRead, status_code=status.HTTP_201_CREATED)
async def create_syllabus(data: SyllabusCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Creates a new Syllabus. Admin only. Case-insensitive existence check."""
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can create syllabuses")
    
    # Case-insensitive duplicate check
    statement = select(SyllabusMaster).where(
        func.lower(SyllabusMaster.syllabus_name) == data.syllabus_name.lower(),
        SyllabusMaster.academic_year == data.academic_year
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Syllabus '{data.syllabus_name}' already exists for {data.academic_year}")

    new_item = SyllabusMaster(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/hierarchy", response_model=List[SyllabusHierarchyRead])
async def get_full_hierarchy(
    syllabus_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Returns the nested hierarchy. Filtered based on user permissions for non-admins."""
    from sqlalchemy.orm import selectinload
    
    statement = select(SyllabusMaster).options(
        selectinload(SyllabusMaster.grades)
        .selectinload(GradeConfig.subjects)
        .selectinload(Subject.topics)
    ).order_by(SyllabusMaster.syllabus_id)
    if syllabus_id:
        statement = statement.where(SyllabusMaster.syllabus_id == syllabus_id)
    result = await session.exec(statement)
    syllabuses = result.all()

    if current_user.is_admin:
        return [
            SyllabusHierarchyRead(
                syllabus_id=s.syllabus_id,
                syllabus_name=s.syllabus_name,
                academic_year=s.academic_year,
                pdf_url=s.pdf_url,
                grades=[
                    GradeHierarchy(
                        config_id=g.config_id,
                        syllabus_id=g.syllabus_id,
                        grade_level=g.grade_level,
                        subjects=[
                            SubjectHierarchy(
                                subject_id=sub.subject_id,
                                subject_name=sub.subject_name,
                                config_id=sub.config_id,
                                topics=[
                                    TopicRead(
                                        topic_id=t.topic_id,
                                        topic_name=t.topic_name,
                                        subject_id=t.subject_id,
                                    )
                                    for t in sub.topics
                                ],
                            )
                            for sub in g.subjects
                        ],
                    )
                    for g in s.grades
                ],
            )
            for s in syllabuses
        ]

    # Filter hierarchy for non-admins
    filtered_syllabuses: List[SyllabusHierarchyRead] = []
    teacher_sub_ids = [s.subject_id for s in current_user.subjects]
    hod_sub_names = [h.allowed_subject.subject_name.strip().lower() for h in current_user.hod_assignments]
    coord_grade_levels = [g.grade_level for g in current_user.grade_coordinating]

    for syllabus in syllabuses:
        filtered_grades: List[GradeHierarchy] = []
        for grade in syllabus.grades:
            is_coordinator = grade.grade_level in coord_grade_levels

            if is_coordinator:
                filtered_grades.append(
                    GradeHierarchy(
                        config_id=grade.config_id,
                        syllabus_id=grade.syllabus_id,
                        grade_level=grade.grade_level,
                        subjects=[
                            SubjectHierarchy(
                                subject_id=sub.subject_id,
                                subject_name=sub.subject_name,
                                config_id=sub.config_id,
                                topics=[
                                    TopicRead(
                                        topic_id=t.topic_id,
                                        topic_name=t.topic_name,
                                        subject_id=t.subject_id,
                                    )
                                    for t in sub.topics
                                ],
                            )
                            for sub in grade.subjects
                        ],
                    )
                )
                continue

            filtered_subjects = [
                sub for sub in grade.subjects 
                if sub.subject_name.strip().lower() in hod_sub_names or sub.subject_id in teacher_sub_ids
            ]

            if filtered_subjects:
                filtered_grades.append(
                    GradeHierarchy(
                        config_id=grade.config_id,
                        syllabus_id=grade.syllabus_id,
                        grade_level=grade.grade_level,
                        subjects=[
                            SubjectHierarchy(
                                subject_id=sub.subject_id,
                                subject_name=sub.subject_name,
                                config_id=sub.config_id,
                                topics=[
                                    TopicRead(
                                        topic_id=t.topic_id,
                                        topic_name=t.topic_name,
                                        subject_id=t.subject_id,
                                    )
                                    for t in sub.topics
                                ],
                            )
                            for sub in filtered_subjects
                        ],
                    )
                )

        if filtered_grades:
            filtered_syllabuses.append(
                SyllabusHierarchyRead(
                    syllabus_id=syllabus.syllabus_id,
                    syllabus_name=syllabus.syllabus_name,
                    academic_year=syllabus.academic_year,
                    pdf_url=syllabus.pdf_url,
                    grades=filtered_grades,
                )
            )

    return filtered_syllabuses

@router.get("/syllabuses", response_model=Page[SyllabusRead])
async def get_all_syllabuses(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0)
):
    """Lists available syllabuses with pagination."""
    count_stmt = select(func.count(SyllabusMaster.syllabus_id))
    total = (await session.exec(count_stmt)).one()
    
    data_stmt = select(SyllabusMaster).order_by(SyllabusMaster.syllabus_id).offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

@router.get("/subjects", response_model=Page[SubjectRead])
async def get_all_subjects(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """Lists all subjects in the system with pagination."""
    count_stmt = select(func.count(Subject.subject_id))
    total = (await session.exec(count_stmt)).one()
    
    data_stmt = select(Subject).offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

# --- ROUTES: GRADES ---

@router.post("/grades", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(data: GradeCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Grade level. Admin only."""
    if not current_user.can_manage_grade(data.grade_level): 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to manage this grade")
    
    syllabus = await session.get(SyllabusMaster, data.syllabus_id)
    if not syllabus:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "The target syllabus does not exist")
    
    statement = select(GradeConfig).where(
        GradeConfig.syllabus_id == data.syllabus_id,
        GradeConfig.grade_level == data.grade_level
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Grade {data.grade_level} already exists in this syllabus")
    
    new_item = GradeConfig(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/grades/{syllabus_id}", response_model=Page[GradeRead])
async def get_grades_by_syllabus(
    syllabus_id: int, 
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Lists all grades within a specific syllabus with pagination."""
    base_stmt = select(GradeConfig).where(GradeConfig.syllabus_id == syllabus_id)
    
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await session.exec(count_stmt)).one()
    
    data_stmt = base_stmt.offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

# --- ROUTES: SUBJECTS ---

@router.post("/subjects", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(data: SubjectCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Subject. Case-insensitive existence check."""
    grade = await session.get(GradeConfig, data.config_id)
    if not grade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Target grade configuration not found")
    
    if not current_user.can_manage_subject(grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to manage subjects for this grade")
    
    # Case-insensitive duplicate check
    statement = select(Subject).where(
        Subject.config_id == data.config_id,
        func.lower(Subject.subject_name) == data.subject_name.lower()
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Subject '{data.subject_name}' already exists in this grade")
    
    new_item = Subject(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/subjects/{config_id}", response_model=Page[SubjectRead])
async def get_subjects_by_grade(
    config_id: int, 
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0)
):
    """Lists all subjects for a specific Grade configuration with pagination."""
    base_stmt = select(Subject).where(Subject.config_id == config_id)
    
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await session.exec(count_stmt)).one()
    
    data_stmt = base_stmt.offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

# --- UPDATE/DELETE ROUTES ---

# SYLLABUS
@router.patch("/syllabuses/{id}", response_model=SyllabusRead)
async def update_syllabus(id: int, data: SyllabusUpdate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can update syllabuses")
    item = await session.get(SyllabusMaster, id)
    if not item: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Syllabus not found")
    for key, val in data.model_dump(exclude_unset=True).items(): 
        setattr(item, key, val)
    await session.commit()
    await session.refresh(item)
    return item

@router.delete("/syllabuses/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_syllabus(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can delete syllabuses")
    item = await session.get(SyllabusMaster, id)
    if item: 
        await session.delete(item)
        await session.commit()
    return None

# GRADE
@router.patch("/grades/{id}", response_model=GradeRead)
async def update_grade(id: int, data: GradeUpdate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(GradeConfig, id)
    if not item: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Grade not found")
    target_grade_level = data.grade_level if data.grade_level is not None else item.grade_level
    if not current_user.can_manage_grade(target_grade_level): 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to manage this grade")
    for key, val in data.model_dump(exclude_unset=True).items(): 
        setattr(item, key, val)
    await session.commit()
    await session.refresh(item)
    return item

@router.delete("/grades/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(GradeConfig, id)
    if item and not current_user.can_manage_grade(item.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to manage this grade")
    if item:
        await session.delete(item)
        await session.commit()
    return None

# SUBJECT
@router.patch("/subjects/{id}", response_model=SubjectRead)
async def update_subject(id: int, data: SubjectUpdate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Subject, id)
    if not item: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    
    grade = await session.get(GradeConfig, item.config_id)
    if not current_user.can_manage_subject(grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to modify subjects for this grade")

    for key, val in data.model_dump(exclude_unset=True).items(): 
        setattr(item, key, val)
    await session.commit()
    await session.refresh(item)
    return item

@router.delete("/subjects/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Subject, id)
    if not item: return None
    
    grade = await session.get(GradeConfig, item.config_id)
    if not current_user.can_manage_subject(grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to delete this subject")

    await session.delete(item)
    await session.commit()
    return None

# TOPIC
@router.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(data: TopicCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Topic. Case-insensitive existence check."""
    from sqlalchemy.orm import selectinload
    stmt = select(Subject).where(Subject.subject_id == data.subject_id).options(selectinload(Subject.grade))
    result = await session.exec(stmt)
    subject = result.first()
    if not subject: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")

    if not current_user.can_modify_topic(subject.subject_id, subject.allowed_subject_id, subject.grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to manage topics for this subject")

    # Case-insensitive duplicate check
    statement = select(Topic).where(
        Topic.subject_id == data.subject_id, 
        func.lower(Topic.topic_name) == data.topic_name.lower()
    )
    result = await session.exec(statement)
    if result.first(): 
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Topic '{data.topic_name}' already exists in this subject")
    
    new_item = Topic(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.patch("/topics/{id}", response_model=TopicRead)
async def update_topic(id: int, data: TopicUpdate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Topic, id)
    if not item: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")
    
    from sqlalchemy.orm import selectinload
    stmt = select(Subject).where(Subject.subject_id == item.subject_id).options(selectinload(Subject.grade))
    result = await session.exec(stmt)
    subject = result.first()

    if not current_user.can_modify_topic(subject.subject_id, subject.allowed_subject_id, subject.grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to modify topics for this subject")

    for key, val in data.model_dump(exclude_unset=True).items(): 
        setattr(item, key, val)
    await session.commit()
    await session.refresh(item)
    return item

@router.delete("/topics/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Topic, id)
    if not item: return None
    
    from sqlalchemy.orm import selectinload
    stmt = select(Subject).where(Subject.subject_id == item.subject_id).options(selectinload(Subject.grade))
    result = await session.exec(stmt)
    subject = result.first()

    if not current_user.can_modify_topic(subject.subject_id, subject.allowed_subject_id, subject.grade.grade_level):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to delete topics for this subject")

    await session.delete(item)
    await session.commit()
    return None

@router.get("/topics", response_model=Page[TopicRead])
async def get_all_topics(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=2000),
    offset: int = Query(default=0, ge=0)
):
    """Lists every topic in the database with pagination."""
    count_stmt = select(func.count(Topic.topic_id))
    total = (await session.exec(count_stmt)).one()
    
    data_stmt = select(Topic).offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()
    
    return Page(items=items, total=total)

@router.get("/topics/subject/{subject_id}", response_model=Page[TopicRead])
async def get_topics_by_subject(
    subject_id: int, 
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0)
):
    """Lists all topics for a specific subject with pagination."""
    base_stmt = select(Topic).where(Topic.subject_id == subject_id)
    
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await session.exec(count_stmt)).one()

    data_stmt = base_stmt.offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()

    return Page(items=items, total=total)
