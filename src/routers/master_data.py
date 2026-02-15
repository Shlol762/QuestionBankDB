from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from src.db.main import get_session
from src.db.models import SyllabusMaster, GradeConfig, Subject, Topic
from src.schemas.master_data import (
    SyllabusCreate, SyllabusRead, SyllabusUpdate,
    GradeCreate, GradeRead, GradePublic, GradeUpdate,
    SubjectCreate, SubjectRead, SubjectPublic, SubjectUpdate,
    TopicCreate, TopicRead, TopicPublic, TopicUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["Master Data"])


# ==========================================
# SYLLABUS ENDPOINTS
# ==========================================
@router.post("/syllabus/", response_model=SyllabusRead)
async def create_syllabus(
    syllabus: SyllabusCreate,
    session: Session = Depends(get_session)
):
    """Create a new syllabus"""
    db_syllabus = SyllabusMaster(**syllabus.model_dump())
    session.add(db_syllabus)
    await session.commit()
    await session.refresh(db_syllabus)
    return db_syllabus


@router.get("/syllabus/", response_model=list[SyllabusRead])
async def list_syllabi(session: Session = Depends(get_session)):
    """List all syllabi"""
    syllabi = await session.exec(select(SyllabusMaster))
    return syllabi.all()


@router.get("/syllabus/{syllabus_id}", response_model=SyllabusRead)
async def get_syllabus(syllabus_id: int, session: Session = Depends(get_session)):
    """Get a specific syllabus"""
    syllabus = await session.get(SyllabusMaster, syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    return syllabus


@router.patch("/syllabus/{syllabus_id}", response_model=SyllabusRead)
async def update_syllabus(
    syllabus_id: int,
    syllabus_update: SyllabusUpdate,
    session: Session = Depends(get_session)
):
    """Update a syllabus"""
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
async def delete_syllabus(syllabus_id: int, session: Session = Depends(get_session)):
    """Delete a syllabus"""
    syllabus = await session.get(SyllabusMaster, syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=404, detail="Syllabus not found")
    
    await session.delete(syllabus)
    await session.commit()
    return {"deleted": True}


# ==========================================
# GRADE ENDPOINTS
# ==========================================
@router.post("/grades/", response_model=GradeRead)
async def create_grade(
    grade: GradeCreate,
    session: Session = Depends(get_session)
):
    """Create a new grade (validate syllabus_id exists)"""
    # Validate syllabus exists
    syllabus = await session.get(SyllabusMaster, grade.syllabus_id)
    if not syllabus:
        raise HTTPException(status_code=400, detail="Syllabus not found")
    
    db_grade = GradeConfig(**grade.model_dump())
    session.add(db_grade)
    await session.commit()
    await session.refresh(db_grade)
    return db_grade


@router.get("/grades/", response_model=list[GradeRead])
async def list_grades(
    syllabus_id: int | None = None,
    session: Session = Depends(get_session)
):
    """List all grades, optionally filter by syllabus_id"""
    query = select(GradeConfig)
    if syllabus_id:
        query = query.where(GradeConfig.syllabus_id == syllabus_id)
    grades = await session.exec(query)
    return grades.all()


@router.get("/grades/{config_id}", response_model=GradeRead)
async def get_grade(config_id: int, session: Session = Depends(get_session)):
    """Get a specific grade"""
    grade = await session.get(GradeConfig, config_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    return grade


@router.patch("/grades/{config_id}", response_model=GradeRead)
async def update_grade(
    config_id: int,
    grade_update: GradeUpdate,
    session: Session = Depends(get_session)
):
    """Update a grade"""
    grade = await session.get(GradeConfig, config_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    update_data = grade_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(grade, key, value)
    
    session.add(grade)
    await session.commit()
    await session.refresh(grade)
    return grade


@router.delete("/grades/{config_id}")
async def delete_grade(config_id: int, session: Session = Depends(get_session)):
    """Delete a grade"""
    grade = await session.get(GradeConfig, config_id)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    await session.delete(grade)
    await session.commit()
    return {"deleted": True}


# ==========================================
# SUBJECT ENDPOINTS
# ==========================================
@router.post("/subjects/", response_model=SubjectRead)
async def create_subject(
    subject: SubjectCreate,
    session: Session = Depends(get_session)
):
    """Create a new subject (validate config_id exists)"""
    # Validate grade config exists
    grade = await session.get(GradeConfig, subject.config_id)
    if not grade:
        raise HTTPException(status_code=400, detail="Grade config not found")
    
    db_subject = Subject(**subject.model_dump())
    session.add(db_subject)
    await session.commit()
    await session.refresh(db_subject)
    return db_subject


@router.get("/subjects/", response_model=list[SubjectRead])
async def list_subjects(
    config_id: int | None = None,
    session: Session = Depends(get_session)
):
    """List all subjects, optionally filter by config_id (grade)"""
    query = select(Subject)
    if config_id:
        query = query.where(Subject.config_id == config_id)
    subjects = await session.exec(query)
    return subjects.all()


@router.get("/subjects/{subject_id}", response_model=SubjectRead)
async def get_subject(subject_id: int, session: Session = Depends(get_session)):
    """Get a specific subject"""
    subject = await session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject


@router.patch("/subjects/{subject_id}", response_model=SubjectRead)
async def update_subject(
    subject_id: int,
    subject_update: SubjectUpdate,
    session: Session = Depends(get_session)
):
    """Update a subject"""
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


@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: int, session: Session = Depends(get_session)):
    """Delete a subject"""
    subject = await session.get(Subject, subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    await session.delete(subject)
    await session.commit()
    return {"deleted": True}


# ==========================================
# TOPIC ENDPOINTS
# ==========================================
@router.post("/topics/", response_model=TopicRead)
async def create_topic(
    topic: TopicCreate,
    session: Session = Depends(get_session)
):
    """Create a new topic (validate subject_id exists)"""
    # Validate subject exists
    subject = await session.get(Subject, topic.subject_id)
    if not subject:
        raise HTTPException(status_code=400, detail="Subject not found")
    
    db_topic = Topic(**topic.model_dump())
    session.add(db_topic)
    await session.commit()
    await session.refresh(db_topic)
    return db_topic


@router.get("/topics/", response_model=list[TopicRead])
async def list_topics(
    subject_id: int | None = None,
    session: Session = Depends(get_session)
):
    """List all topics, optionally filter by subject_id"""
    query = select(Topic)
    if subject_id:
        query = query.where(Topic.subject_id == subject_id)
    topics = await session.exec(query)
    return topics.all()


@router.get("/topics/{topic_id}", response_model=TopicRead)
async def get_topic(topic_id: int, session: Session = Depends(get_session)):
    """Get a specific topic"""
    topic = await session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/topics/{topic_id}", response_model=TopicRead)
async def update_topic(
    topic_id: int,
    topic_update: TopicUpdate,
    session: Session = Depends(get_session)
):
    """Update a topic"""
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


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: int, session: Session = Depends(get_session)):
    """Delete a topic"""
    topic = await session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    await session.delete(topic)
    await session.commit()
    return {"deleted": True}
