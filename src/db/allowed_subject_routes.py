from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.auth_utils import get_current_user
from src.db.main import get_session
from src.db.models import AllowedSubject, Page, Users

router = APIRouter(prefix="/allowed-subjects", tags=["Allowed Subjects"])


class BaseAllowedSubjectModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class AllowedSubjectRead(BaseAllowedSubjectModel):
    allowed_subject_id: int
    subject_name: str
    recommendation_note: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AllowedSubjectCreate(BaseAllowedSubjectModel):
    subject_name: str = Field(min_length=1)
    recommendation_note: Optional[str] = None
    is_active: bool = True


class AllowedSubjectUpdate(BaseAllowedSubjectModel):
    subject_name: Optional[str] = Field(default=None, min_length=1)
    recommendation_note: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=Page[AllowedSubjectRead])
async def list_allowed_subjects(
    active_only: bool = Query(default=False),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
):
    base_stmt = select(AllowedSubject)

    if active_only:
        base_stmt = base_stmt.where(AllowedSubject.is_active == True)

    if search:
        base_stmt = base_stmt.where(
            func.lower(AllowedSubject.subject_name).contains(search.lower())
        )

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = (await session.exec(count_stmt)).one()

    data_stmt = base_stmt.order_by(
        AllowedSubject.subject_name.asc()
    ).offset(offset).limit(limit)
    items = (await session.exec(data_stmt)).all()

    return Page(items=items, total=total)


@router.post("/", response_model=AllowedSubjectRead, status_code=status.HTTP_201_CREATED)
async def create_allowed_subject(
    data: AllowedSubjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can manage allowed subjects")

    duplicate_stmt = select(AllowedSubject).where(
        func.lower(AllowedSubject.subject_name) == data.subject_name.lower()
    )
    if (await session.exec(duplicate_stmt)).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This allowed subject already exists")

    new_item = AllowedSubject(**data.model_dump())
    session.add(new_item)
    await session.commit()
    await session.refresh(new_item)
    return new_item


@router.patch("/{allowed_subject_id}", response_model=AllowedSubjectRead)
async def update_allowed_subject(
    allowed_subject_id: int,
    data: AllowedSubjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can manage allowed subjects")

    item = await session.get(AllowedSubject, allowed_subject_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Allowed subject not found")

    update_data = data.model_dump(exclude_unset=True)
    if "subject_name" in update_data and update_data["subject_name"]:
        duplicate_stmt = select(AllowedSubject).where(
            func.lower(AllowedSubject.subject_name) == update_data["subject_name"].lower(),
            AllowedSubject.allowed_subject_id != allowed_subject_id,
        )
        if (await session.exec(duplicate_stmt)).first():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Another allowed subject already uses this name")

    for key, value in update_data.items():
        setattr(item, key, value)

    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{allowed_subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allowed_subject(
    allowed_subject_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can manage allowed subjects")

    item = await session.get(AllowedSubject, allowed_subject_id)
    if item:
        await session.delete(item)
        await session.commit()

    return None
