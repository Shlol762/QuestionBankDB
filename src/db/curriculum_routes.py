from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from src.db.main import get_session
from src.db.models import SyllabusMaster, GradeConfig, Subject, Topic
from pydantic import BaseModel

router = APIRouter(prefix="/curriculum", tags=["Curriculum Management"])

# --- SCHEMAS (Data Transfer Objects) ---

class TopicRead(BaseModel):
    topic_id: int
    topic_name: str
    subject_id: int

class SubjectRead(BaseModel):
    subject_id: int
    subject_name: str
    config_id: int

class GradeRead(BaseModel):
    config_id: int
    syllabus_id: int
    grade_level: int

class SyllabusRead(BaseModel):
    syllabus_id: int
    syllabus_name: str
    academic_year: str

# Hierarchy Versions (for the Tree View)
class SubjectHierarchy(SubjectRead):
    topics: List[TopicRead] = []

class GradeHierarchy(GradeRead):
    subjects: List[SubjectHierarchy] = []

class SyllabusHierarchyRead(SyllabusRead):
    grades: List[GradeHierarchy] = []

class SyllabusCreate(BaseModel):
    syllabus_name: str
    academic_year: str

class GradeCreate(BaseModel):
    syllabus_id: int
    grade_level: int

class SubjectCreate(BaseModel):
    config_id: int
    subject_name: str

class TopicCreate(BaseModel):
    subject_id: int
    topic_name: str

# --- ROUTES: SYLLABUS ---

@router.post("/syllabuses", response_model=SyllabusRead, status_code=status.HTTP_201_CREATED)
async def create_syllabus(data: SyllabusCreate, session: AsyncSession = Depends(get_session)):
    """Creates a new Syllabus. Prevents duplicate name+year combinations."""
    statement = select(SyllabusMaster).where(
        SyllabusMaster.syllabus_name == data.syllabus_name,
        SyllabusMaster.academic_year == data.academic_year
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="This Syllabus already exists for this year")

    new_item = SyllabusMaster(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/hierarchy", response_model=List[SyllabusHierarchyRead])
async def get_full_hierarchy(session: AsyncSession = Depends(get_session)):
    """Returns the nested hierarchy of Syllabus -> Grade -> Subject -> Topic."""
    from sqlalchemy.orm import selectinload
    
    statement = select(SyllabusMaster).options(
        selectinload(SyllabusMaster.grades)
        .selectinload(GradeConfig.subjects)
        .selectinload(Subject.topics)
    )
    result = await session.exec(statement)
    return result.all()

@router.get("/syllabuses", response_model=List[SyllabusRead])
async def get_all_syllabuses(session: AsyncSession = Depends(get_session)):
    """Lists all available syllabuses."""
    statement = select(SyllabusMaster)
    result = await session.exec(statement)
    return result.all()

# --- ROUTES: GRADES ---

@router.post("/grades", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(data: GradeCreate, session: AsyncSession = Depends(get_session)):
    """Adds a Grade level. Prevents duplicate grades in the same syllabus."""
    # Verify syllabus exists
    syllabus = await session.get(SyllabusMaster, data.syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    
    # Check for duplicate
    statement = select(GradeConfig).where(
        GradeConfig.syllabus_id == data.syllabus_id,
        GradeConfig.grade_level == data.grade_level
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail=f"Grade {data.grade_level} already exists in this syllabus")
    
    new_item = GradeConfig(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/grades/{syllabus_id}", response_model=List[GradeRead])
async def get_grades_by_syllabus(syllabus_id: int, session: AsyncSession = Depends(get_session)):
    """Lists all grades within a specific syllabus."""
    statement = select(GradeConfig).where(GradeConfig.syllabus_id == syllabus_id)
    result = await session.exec(statement)
    return result.all()

# --- ROUTES: SUBJECTS ---

@router.post("/subjects", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(data: SubjectCreate, session: AsyncSession = Depends(get_session)):
    """Adds a Subject. Prevents duplicate subject names in the same Grade."""
    grade = await session.get(GradeConfig, data.config_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade config not found")
    
    # Check for duplicate
    statement = select(Subject).where(
        Subject.config_id == data.config_id,
        Subject.subject_name == data.subject_name
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="This subject already exists in this grade")
    
    new_item = Subject(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/subjects/{config_id}", response_model=List[SubjectRead])
async def get_subjects_by_grade(config_id: int, session: AsyncSession = Depends(get_session)):
    """Lists all subjects for a specific Grade configuration."""
    statement = select(Subject).where(Subject.config_id == config_id)
    result = await session.exec(statement)
    return result.all()

# --- ROUTES: TOPICS ---

@router.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(data: TopicCreate, session: AsyncSession = Depends(get_session)):
    """Adds a Topic. Prevents duplicate topic names in the same Subject."""
    subject = await session.get(Subject, data.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check for duplicate
    statement = select(Topic).where(
        Topic.subject_id == data.subject_id,
        Topic.topic_name == data.topic_name
    )
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="This topic already exists in this subject")
    
    new_item = Topic(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.get("/topics", response_model=List[TopicRead])
async def get_all_topics(session: AsyncSession = Depends(get_session)):
    """Lists every topic in the database (useful for testing/selection)."""
    statement = select(Topic)
    result = await session.exec(statement)
    return result.all()

@router.get("/topics/{subject_id}", response_model=List[TopicRead])
async def get_topics_by_subject(subject_id: int, session: AsyncSession = Depends(get_session)):
    """Lists all topics for a specific subject."""
    statement = select(Topic).where(Topic.subject_id == subject_id)
    result = await session.exec(statement)
    return result.all()
