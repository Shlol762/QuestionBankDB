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

# Repeat the same pattern for Grade, Subject, Topic endpoints:
# All POST/PATCH/DELETE endpoints require user: Users = Depends(get_current_user)
# All GET endpoints remain public.