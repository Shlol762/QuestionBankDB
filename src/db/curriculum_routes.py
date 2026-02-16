from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from src.db.main import get_session
from src.db.models import SyllabusMaster, GradeConfig, Subject, Topic, Users
from src.db.auth_utils import get_current_user
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

# Creation/Update Schemas
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
async def create_syllabus(data: SyllabusCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Creates a new Syllabus. Admin only."""
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    
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

@router.get("/subjects", response_model=List[SubjectRead])
async def get_all_subjects(session: AsyncSession = Depends(get_session)):
    """Lists all subjects in the system."""
    statement = select(Subject)
    result = await session.exec(statement)
    return result.all()

# --- ROUTES: GRADES ---

@router.post("/grades", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(data: GradeCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Grade level. Admin only."""
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    
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
async def create_subject(data: SubjectCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Subject. Admin only."""
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    
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

# --- UPDATE/DELETE ROUTES ---

# SYLLABUS
@router.patch("/syllabuses/{id}", response_model=SyllabusRead)
async def update_syllabus(id: int, data: SyllabusCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(SyllabusMaster, id)
    if not item: raise HTTPException(404, "Not found")
    for key, val in data.model_dump().items(): setattr(item, key, val)
    await session.commit()
    return item

@router.delete("/syllabuses/{id}", status_code=204)
async def delete_syllabus(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(SyllabusMaster, id)
    if item: 
        await session.delete(item)
        await session.commit()
    return None

# GRADE
@router.patch("/grades/{id}", response_model=GradeRead)
async def update_grade(id: int, data: GradeCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(GradeConfig, id)
    if not item: raise HTTPException(404, "Not found")
    for key, val in data.model_dump().items(): setattr(item, key, val)
    await session.commit()
    return item

@router.delete("/grades/{id}", status_code=204)
async def delete_grade(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(GradeConfig, id)
    if item:
        await session.delete(item)
        await session.commit()
    return None

# SUBJECT
@router.patch("/subjects/{id}", response_model=SubjectRead)
async def update_subject(id: int, data: SubjectCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(Subject, id)
    if not item: raise HTTPException(404, "Not found")
    for key, val in data.model_dump().items(): setattr(item, key, val)
    await session.commit()
    return item

@router.delete("/subjects/{id}", status_code=204)
async def delete_subject(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    item = await session.get(Subject, id)
    if item:
        await session.delete(item)
        await session.commit()
    return None

# TOPIC
@router.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(data: TopicCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Adds a Topic. Admins or Assigned Teachers only."""
    assigned_ids = [s.subject_id for s in current_user.subjects]
    if not current_user.is_admin and data.subject_id not in assigned_ids:
        raise HTTPException(403, "You are not assigned to this subject")

    statement = select(Topic).where(Topic.subject_id == data.subject_id, Topic.topic_name == data.topic_name)
    result = await session.exec(statement)
    if result.first(): raise HTTPException(400, "Topic already exists")
    
    new_item = Topic(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item

@router.patch("/topics/{id}", response_model=TopicRead)
async def update_topic(id: int, data: TopicCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Topic, id)
    if not item: raise HTTPException(404, "Not found")
    
    assigned_ids = [s.subject_id for s in current_user.subjects]
    if not current_user.is_admin and item.subject_id not in assigned_ids:
        raise HTTPException(403, "You are not assigned to this subject")

    for key, val in data.model_dump().items(): setattr(item, key, val)
    await session.commit()
    return item

@router.delete("/topics/{id}", status_code=204)
async def delete_topic(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    item = await session.get(Topic, id)
    if not item: return None
    
    assigned_ids = [s.subject_id for s in current_user.subjects]
    if not current_user.is_admin and item.subject_id not in assigned_ids:
        raise HTTPException(403, "You are not assigned to this subject")

    await session.delete(item)
    await session.commit()
    return None

@router.get("/topics", response_model=List[TopicRead])
async def get_all_topics(session: AsyncSession = Depends(get_session)):
    """Lists every topic in the database."""
    statement = select(Topic)
    result = await session.exec(statement)
    return result.all()

@router.get("/topics/subject/{subject_id}", response_model=List[TopicRead])
async def get_topics_by_subject(subject_id: int, session: AsyncSession = Depends(get_session)):
    """Lists all topics for a specific subject."""
    statement = select(Topic).where(Topic.subject_id == subject_id)
    result = await session.exec(statement)
    return result.all()
