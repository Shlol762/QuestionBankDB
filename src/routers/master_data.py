from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from src.db.main import get_session
from src.db.models import SyllabusMaster, GradeConfig, Subject, Topic
from src.schemas.master_data import (
    SyllabusCreate, SyllabusRead, SyllabusUpdate,
    GradeCreate, GradeRead, GradeUpdate,
    SubjectCreate, SubjectRead, SubjectUpdate,
    TopicCreate, TopicRead, TopicUpdate,
)
from src.auth.deps import get_current_user

router = APIRouter(prefix="/api/v1", tags=["Master Data"])

@router.post("/syllabus/", response_model=SyllabusRead, status_code=status.HTTP_201_CREATED)
async def create_syllabus(
    syllabus: SyllabusCreate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    db_syllabus = SyllabusMaster(**syllabus.model_dump())
    session.add(db_syllabus)
    await session.commit()
    await session.refresh(db_syllabus)
    return db_syllabus

@router.get("/syllabus/", response_model=list[SyllabusRead])
async def list_syllabi(session: AsyncSession = Depends(get_session)):
    syllabi = await session.exec(select(SyllabusMaster))
    return syllabi.all()

@router.get("/syllabus/{syllabus_id}", response_model=SyllabusRead)
async def get_syllabus(syllabus_id: int, session: AsyncSession = Depends(get_session)):
    syllabus = await session.get(SyllabusMaster, syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus

@router.patch("/syllabus/{syllabus_id}", response_model=SyllabusRead)
async def update_syllabus(
    syllabus_id: int,
    syllabus_update: SyllabusUpdate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    syllabus = await session.get(SyllabusMaster, syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    update_data = syllabus_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(syllabus, key, value)
    session.add(syllabus)
    await session.commit()
    await session.refresh(syllabus)
    return syllabus

@router.delete("/syllabus/{syllabus_id}")
async def delete_syllabus(
    syllabus_id: int,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    syllabus = await session.get(SyllabusMaster, syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    await session.delete(syllabus)
    await session.commit()
    return {"deleted": True}


# --- GRADE ENDPOINTS ---
@router.post("/grade/", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(
    grade: GradeCreate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    db_grade = GradeConfig(**grade.model_dump())
    session.add(db_grade)
    await session.commit()
    await session.refresh(db_grade)
    return db_grade

@router.patch("/grade/{grade_id}", response_model=GradeRead)
async def update_grade(
    grade_id: int,
    grade_update: GradeUpdate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    grade = await session.get(GradeConfig, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    update_data = grade_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(grade, key, value)
    session.add(grade)
    await session.commit()
    await session.refresh(grade)
    return grade

@router.delete("/grade/{grade_id}")
async def delete_grade(
    grade_id: int,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    grade = await session.get(GradeConfig, grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    await session.delete(grade)
    await session.commit()
    return {"deleted": True}

# --- SUBJECT ENDPOINTS ---
@router.post("/subject/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject: SubjectCreate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    db_subject = Subject(**subject.model_dump())
    session.add(db_subject)
    await session.commit()
    await session.refresh(db_subject)
    return db_subject

@router.patch("/subject/{subject_id}", response_model=SubjectRead)
async def update_subject(
    subject_id: int,
    subject_update: SubjectUpdate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    subject = await session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    update_data = subject_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)
    session.add(subject)
    await session.commit()
    await session.refresh(subject)
    return subject

@router.delete("/subject/{subject_id}")
async def delete_subject(
    subject_id: int,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    subject = await session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    await session.delete(subject)
    await session.commit()
    return {"deleted": True}

# --- TOPIC ENDPOINTS ---
@router.post("/topic/", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic: TopicCreate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    db_topic = Topic(**topic.model_dump())
    session.add(db_topic)
    await session.commit()
    await session.refresh(db_topic)
    return db_topic

@router.patch("/topic/{topic_id}", response_model=TopicRead)
async def update_topic(
    topic_id: int,
    topic_update: TopicUpdate,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    topic = await session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    update_data = topic_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(topic, key, value)
    session.add(topic)
    await session.commit()
    await session.refresh(topic)
    return topic

@router.delete("/topic/{topic_id}")
async def delete_topic(
    topic_id: int,
    session: AsyncSession = Depends(get_session),
    user = Depends(get_current_user)
):
    topic = await session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    await session.delete(topic)
    await session.commit()
    return {"deleted": True}