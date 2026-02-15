from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from src.db.main import get_session
from src.db.models import Users
from src.schemas.users import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/api/v1", tags=["Users"])


# ==========================================
# USER ENDPOINTS
# ==========================================
@router.post("/users/", response_model=UserRead)
async def create_user(
    user: UserCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new user (teacher).
    Email must be unique.
    """
    # Check if email already exists
    existing_user = await session.exec(
        select(Users).where(Users.email == user.email)
    )
    if existing_user.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = Users(**user.model_dump())
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)
    return db_user


@router.get("/users/", response_model=list[UserRead])
async def list_users(
    department: Optional[str] = Query(None, description="Filter by department"),
    is_admin: Optional[bool] = Query(None, description="Filter by admin status"),
    session: Session = Depends(get_session)
):
    """
    List all users with optional filtering by:
    - department: Filter users by department
    - is_admin: Filter by admin status
    """
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
    session: Session = Depends(get_session)
):
    """Get a specific user by ID"""
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/email/{email}", response_model=UserRead)
async def get_user_by_email(
    email: str,
    session: Session = Depends(get_session)
):
    """Get a user by email address"""
    user = await session.exec(
        select(Users).where(Users.email == email)
    )
    found_user = user.first()
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    return found_user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    session: Session = Depends(get_session)
):
    """
    Update a user with partial fields.
    Email uniqueness is validated if email is being updated.
    """
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # If email is being updated, check uniqueness
    if "email" in update_data:
        existing_user = await session.exec(
            select(Users).where(
                (Users.email == update_data["email"]) & (Users.user_id != user_id)
            )
        )
        if existing_user.first():
            raise HTTPException(status_code=400, detail="Email already in use")
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Delete a user"""
    user = await session.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await session.delete(user)
    await session.commit()
    return {"deleted": True}
