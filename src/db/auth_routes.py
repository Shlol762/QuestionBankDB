from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select, delete
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
from src.db.main import get_session
from src.db.models import Users, GradeCoordinatorLink, HODLink, UserSubjectLink, GradeConfig, Subject
from src.db.auth_utils import get_password_hash, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- SCHEMAS ---

class SubjectSimple(BaseModel):
    subject_id: int
    subject_name: str

class UserRead(BaseModel):
    user_id: int
    full_name: str
    email: EmailStr
    department: str
    is_admin: bool
    subjects: List[SubjectSimple] = []
    grade_levels: List[int] = [] 
    hod_subject_names: List[str] = []

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department: str
    is_admin: bool = False
    subject_ids: List[int] = [] 
    grade_levels: List[int] = []
    hod_subject_names: List[str] = []

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department: Optional[str] = None
    is_admin: Optional[bool] = None
    subject_ids: Optional[List[int]] = None
    grade_levels: Optional[List[int]] = None
    hod_subject_names: Optional[List[str]] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# --- HELPERS ---

async def validate_assignments(session: AsyncSession, grade_levels: List[int] = None, hod_subject_names: List[str] = None):
    """Ensures assigned grades and subjects exist in the curriculum."""
    if grade_levels:
        for gl in grade_levels:
            grade_stmt = select(GradeConfig).where(GradeConfig.grade_level == gl)
            grade_res = await session.exec(grade_stmt)
            if not grade_res.first():
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Grade level {gl} does not exist in the curriculum")
    
    if hod_subject_names:
        for sn in hod_subject_names:
            sub_stmt = select(Subject).where(Subject.subject_name == sn)
            sub_res = await session.exec(sub_stmt)
            if not sub_res.first():
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Subject '{sn}' does not exist in the curriculum")

def map_user_to_read(user: Users) -> dict:
    """Helper to transform User model to UserRead-compatible dict."""
    d = user.model_dump()
    d["subjects"] = [SubjectSimple(subject_id=s.subject_id, subject_name=s.subject_name) for s in user.subjects]
    d["grade_levels"] = [g.grade_level for g in user.grade_coordinating]
    d["hod_subject_names"] = [h.subject_name for h in user.hod_subjects]
    return d

# --- ROUTES ---

@router.get("/me", response_model=UserRead)
async def get_me(current_user: Users = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user."""
    return map_user_to_read(current_user)

@router.get("/users", response_model=List[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Lists all users. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can access the staff directory")
    
    statement = select(Users).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_subjects)
    ).order_by(Users.full_name)
    
    result = await session.exec(statement)
    users = result.all()
    return [map_user_to_read(u) for u in users]

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Registers a new staff member and assigns roles. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can register new staff")

    # Check if user already exists
    statement = select(Users).where(Users.email == user_data.email)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"A user with email {user_data.email} is already registered")
    
    # Validate Grade/HOD assignments
    await validate_assignments(session, user_data.grade_levels, user_data.hod_subject_names)

    new_user = Users(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=user_data.is_admin
    )
    session.add(new_user)
    await session.flush() # Get the new_user.user_id

    # Assign Teacher Subjects
    if user_data.subject_ids:
        for s_id in user_data.subject_ids:
            session.add(UserSubjectLink(user_id=new_user.user_id, subject_id=s_id))
    
    # Assign Grade Coordinator roles
    if user_data.grade_levels:
        for gl in user_data.grade_levels:
            session.add(GradeCoordinatorLink(user_id=new_user.user_id, grade_level=gl))
            
    # Assign HOD roles
    if user_data.hod_subject_names:
        for sn in user_data.hod_subject_names:
            session.add(HODLink(user_id=new_user.user_id, subject_name=sn))
    
    await session.commit()
    return {"message": f"Staff member '{user_data.full_name}' registered successfully"}

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    """Logs in a user and returns a JWT access token."""
    statement = select(Users).where(Users.email == form_data.username)
    result = await session.exec(statement)
    user = result.first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "id": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.patch("/users/{id}", response_model=UserRead)
async def update_user(
    id: int, 
    data: UserUpdate, 
    session: AsyncSession = Depends(get_session), 
    current_user: Users = Depends(get_current_user)
):
    """Updates user profile and roles. Restricted to Admins."""
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can update staff profiles")
    
    user = await session.get(Users, id)
    if not user: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")
    
    # Validate Grade/HOD assignments if they are being updated
    await validate_assignments(session, data.grade_levels, data.hod_subject_names)

    # Update basic info
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.password_hash = get_password_hash(update_data.pop("password"))
    
    # Extract role-specific fields for separate sync
    subject_ids = update_data.pop("subject_ids", None)
    grade_levels = update_data.pop("grade_levels", None)
    hod_subject_names = update_data.pop("hod_subject_names", None)

    for key, val in update_data.items():
        setattr(user, key, val)
    
    # Sync Subjects
    if subject_ids is not None:
        await session.exec(delete(UserSubjectLink).where(UserSubjectLink.user_id == id))
        for s_id in subject_ids:
            session.add(UserSubjectLink(user_id=id, subject_id=s_id))
            
    # Sync Grade Coordinator Roles
    if grade_levels is not None:
        await session.exec(delete(GradeCoordinatorLink).where(GradeCoordinatorLink.user_id == id))
        for gl in grade_levels:
            session.add(GradeCoordinatorLink(user_id=id, grade_level=gl))
            
    # Sync HOD Roles
    if hod_subject_names is not None:
        await session.exec(delete(HODLink).where(HODLink.user_id == id))
        for sn in hod_subject_names:
            session.add(HODLink(user_id=id, subject_name=sn))
            
    await session.commit()
    
    # Reload with relations for the response
    statement = select(Users).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_subjects)
    ).where(Users.user_id == id)
    result = await session.exec(statement)
    updated_user = result.first()
    return map_user_to_read(updated_user)

@router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Deletes a user account. Restricted to Admins. Cannot delete self."""
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can delete staff accounts")
    
    if id == current_user.user_id: 
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot delete your own account")
    
    user = await session.get(Users, id)
    if user:
        await session.delete(user)
        await session.commit()
    return None
