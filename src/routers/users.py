from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import Optional
from src.db.main import get_session
from src.db.models import Users
from src.schemas.users import UserCreate, UserRead, UserUpdate
from src.auth.security import get_password_hash

router = APIRouter(prefix="/api/v1", tags=["Users"])

@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    # Check if email already exists
    existing_user = await session.exec(select(Users).where(Users.email == user.email))
    if existing_user.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = user.model_dump(exclude={"password"})
    hashed_password = get_password_hash(user.password)
    db_user = Users(**user_dict, hashed_password=hashed_password)
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user

@router.get("/users/", response_model=list[UserRead])
async def list_users(
    department: Optional[str] = Query(None, description="Filter by department"),
    is_admin: Optional[bool] = Query(None, description="Filter by admin status"),
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    query = select(Users)
    if department is not None:
        query = query.where(Users.department == department)
    if is_admin is not None:
        query = query.where(Users.is_admin == is_admin)
    users = await session.exec(query)
    return users.all()

@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/users/email/{email}", response_model=UserRead)
async def get_user_by_email(
    email: str,
    session: AsyncSession = Depends(get_session)
):
    user = await session.exec(select(Users).where(Users.email == email))
    found_user = user.first()
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return found_user

@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    session: AsyncSession = Depends(get_session)
):
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user_update.model_dump(exclude_unset=True)
    if "email" in update_data:
        existing_user = await session.exec(
            select(Users).where(
                (Users.email == update_data["email"]) & (Users.user_id != user_id)
            )
        )
        if existing_user.first():
            raise HTTPException(status_code=400, detail="Email already in use")
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    for key, value in update_data.items():
        setattr(user, key, value)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    await session.delete(user)
    await session.commit()
    return {"deleted": True}