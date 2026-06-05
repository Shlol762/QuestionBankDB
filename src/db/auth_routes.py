from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select, delete, func
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional
import logging
from src.db.main import get_session
from src.db.models import Users, GradeCoordinatorLink, HODLink, UserSubjectLink, GradeConfig, Subject, Page, AllowedSubject
from src.db.auth_utils import get_password_hash, verify_password, create_access_token, get_current_user
from src.limiter import limiter
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
import re
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


# --- SCHEMAS ---

class BaseAuthModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

class SubjectSimple(BaseAuthModel):
    subject_id: int
    subject_name: str

class UserRead(BaseAuthModel):
    user_id: int
    full_name: str
    email: EmailStr
    department: str
    is_admin: bool
    subjects: List[SubjectSimple] = []
    grade_levels: List[int] = [] 
    hod_subject_names: List[str] = []
    hod_allowed_subject_ids: List[int] = []

class UserCreate(BaseAuthModel):
    full_name: str
    email: EmailStr
    password: str
    department: str
    is_admin: bool = False
    subject_ids: List[int] = [] 
    grade_levels: List[int] = []
    hod_allowed_subject_ids: List[int] = []



class UserUpdate(BaseAuthModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department: Optional[str] = None
    is_admin: Optional[bool] = None
    subject_ids: Optional[List[int]] = None
    grade_levels: Optional[List[int]] = None
    hod_allowed_subject_ids: Optional[List[int]] = None




class PasswordResetRequest(BaseAuthModel):
    new_password: str



class Token(BaseModel):
    access_token: str
    token_type: str

class SetupStatus(BaseModel):
    setup_required: bool

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str



# --- HELPERS ---

def validate_password_strength(password: str, is_admin: bool):
    min_len = 12 if is_admin else 8
    if len(password) < min_len:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"loc": ["body", "password"], "msg": f"Password must be at least {min_len} characters"}]
        )

async def validate_assignments(session: AsyncSession, grade_levels: List[int] = None, hod_allowed_subject_ids: List[int] = None):
    """
    Ensures assigned grades and allowed subjects exist.
    """
    if grade_levels:
        grade_stmt = select(func.count(GradeConfig.config_id)).where(
            GradeConfig.grade_level.in_(grade_levels)
        )
        found = (await session.exec(grade_stmt)).one()
        if found < len(set(grade_levels)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more grade levels do not exist in the curriculum",
            )

    if hod_allowed_subject_ids:
        sub_stmt = select(func.count(AllowedSubject.allowed_subject_id)).where(
            AllowedSubject.allowed_subject_id.in_(hod_allowed_subject_ids)
        )
        found = (await session.exec(sub_stmt)).one()
        if found < len(set(hod_allowed_subject_ids)):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more assigned HOD subjects are not in the allowed subjects list",
            )

def map_user_to_read(user: Users) -> dict:
    """
    Helper to transform a SQLModel Users object to a UserRead-compatible dictionary.
    """
    d = user.model_dump()
    d["subjects"] = [SubjectSimple(subject_id=s.subject_id, subject_name=s.subject_name) for s in user.subjects]
    d["grade_levels"] = [g.grade_level for g in user.grade_coordinating]
    
    # Fetch names from the Master List IDs
    d["hod_subject_names"] = []
    d["hod_allowed_subject_ids"] = []
    if hasattr(user, "hod_assignments") and user.hod_assignments:
        for h in user.hod_assignments:
            d["hod_allowed_subject_ids"].append(h.allowed_subject_id)
            # This relies on the relationship being eager-loaded (via selectinload)
            # or lazy-loaded if within a session.
            if hasattr(h, "allowed_subject") and h.allowed_subject:
                d["hod_subject_names"].append(h.allowed_subject.subject_name)
    return d

# --- ROUTES ---

@router.get("/setup-status", response_model=SetupStatus)
async def get_setup_status(session: AsyncSession = Depends(get_session)):
    """Checks if the system has any registered users."""
    statement = select(func.count(Users.user_id))
    result = await session.exec(statement)
    count = result.first()
    return {"setup_required": count == 0}

@router.post("/initial-setup", status_code=status.HTTP_201_CREATED)
async def initial_setup(user_data: UserCreate, session: AsyncSession = Depends(get_session)):
    """Performs one-time system initialization (registers first admin)."""
    count_stmt = select(func.count(Users.user_id))
    count = (await session.exec(count_stmt)).first()
    if count > 0:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Setup wizard is locked.")

    validate_password_strength(user_data.password, is_admin=True)

    new_admin = Users(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=True
    )
    session.add(new_admin)
    await session.commit()
    return {"message": "Primary administrator account created."}

@router.get("/me", response_model=UserRead)
async def get_me(current_user: Users = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user."""
    return map_user_to_read(current_user)

@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_my_password(
    data: PasswordUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Updates the current user's password."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect current password")
    
    validate_password_strength(data.new_password, current_user.is_admin)
    current_user.password_hash = get_password_hash(data.new_password)
    session.add(current_user)
    await session.commit()
    return None

@router.get("/users", response_model=Page[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Lists all users with pagination. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can access the staff directory")
    
    data_stmt = select(
        Users,
        func.count(Users.user_id).over().label("total_count")
    ).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_assignments).selectinload(HODLink.allowed_subject)
    ).order_by(Users.full_name).offset(offset).limit(limit)
    rows = (await session.exec(data_stmt)).all()
    total = rows[0][1] if rows else 0
    items = [map_user_to_read(row[0]) for row in rows]
    return Page(items=items, total=total)

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register_user(
    request: Request,
    user_data: UserCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Registers a new staff member and assigns roles. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can register new staff")

    normalized_email = user_data.email.strip().lower()
    statement = select(Users).where(func.lower(Users.email) == normalized_email)
    if (await session.exec(statement)).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User already registered")
    
    await validate_assignments(session, user_data.grade_levels, user_data.hod_allowed_subject_ids)

    validate_password_strength(user_data.password, user_data.is_admin)

    new_user = Users(
        full_name=user_data.full_name,
        email=normalized_email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=user_data.is_admin
    )
    session.add(new_user)
    await session.flush()

    if user_data.subject_ids:
        for s_id in user_data.subject_ids:
            session.add(UserSubjectLink(user_id=new_user.user_id, subject_id=s_id))
    if user_data.grade_levels:
        for gl in user_data.grade_levels:
            session.add(GradeCoordinatorLink(user_id=new_user.user_id, grade_level=gl))
    if user_data.hod_allowed_subject_ids:
        for as_id in user_data.hod_allowed_subject_ids:
            session.add(HODLink(user_id=new_user.user_id, allowed_subject_id=as_id))
    
    await session.commit()
    return {"message": "Staff member registered successfully"}

@router.patch("/users/{id}", response_model=UserRead)
async def update_user(
    id: int, 
    data: UserUpdate, 
    session: AsyncSession = Depends(get_session), 
    current_user: Users = Depends(get_current_user)
):
    """Updates user profile and roles. Restricted to Admins."""
    if not current_user.is_admin: 
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    
    user = await session.get(Users, id)
    if not user: 
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    
    await validate_assignments(session, data.grade_levels, data.hod_allowed_subject_ids)

    update_data = data.model_dump(exclude_unset=True)
    is_admin_check = update_data.get("is_admin", user.is_admin)
    if "password" in update_data and update_data["password"]:
        validate_password_strength(update_data["password"], is_admin_check)
        user.password_hash = get_password_hash(update_data.pop("password"))
    
    subject_ids = update_data.pop("subject_ids", None)
    grade_levels = update_data.pop("grade_levels", None)
    hod_allowed_subject_ids = update_data.pop("hod_allowed_subject_ids", None)

    for key, val in update_data.items():
        if key == "email" and isinstance(val, str):
            val = val.strip().lower()
        setattr(user, key, val)
    
    if subject_ids is not None:
        await session.exec(delete(UserSubjectLink).where(UserSubjectLink.user_id == id))
        for s_id in subject_ids: session.add(UserSubjectLink(user_id=id, subject_id=s_id))
    if grade_levels is not None:
        await session.exec(delete(GradeCoordinatorLink).where(GradeCoordinatorLink.user_id == id))
        for gl in grade_levels: session.add(GradeCoordinatorLink(user_id=id, grade_level=gl))
    if hod_allowed_subject_ids is not None:
        await session.exec(delete(HODLink).where(HODLink.user_id == id))
        for as_id in hod_allowed_subject_ids: session.add(HODLink(user_id=id, allowed_subject_id=as_id))
            
    await session.commit()
    
    statement = select(Users).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_assignments).selectinload(HODLink.allowed_subject)
    ).where(Users.user_id == id)
    updated_user = (await session.exec(statement)).first()
    return map_user_to_read(updated_user)

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    normalized_email = form_data.username.strip().lower()
    user = (await session.exec(select(Users).where(func.lower(Users.email) == normalized_email))).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return {"access_token": create_access_token(data={"sub": user.email, "id": user.user_id}), "token_type": "bearer"}

@router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    """Deletes a user account. Restricted to Admins. Safety Lock: Prevents deleting self and the system's final administrator."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators can delete staff accounts")

    if id == current_user.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Security Protocol: You cannot delete your own account.")

    target_user = await session.get(Users, id)
    if not target_user:
        return None

    # Safety Lock: Prevent deletion of the final system administrator
    if target_user.is_admin:
        admin_count_stmt = select(func.count(Users.user_id)).where(Users.is_admin == True)
        admin_count = (await session.exec(admin_count_stmt)).first()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Security Lock: This is the system's final administrator. Deletion is blocked to prevent permanent lockout."
            )

    await session.delete(target_user)
    await session.commit()
    return None

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(user_id: int, payload: PasswordResetRequest, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    user = await session.get(Users, user_id)
    if user:
        validate_password_strength(payload.new_password, user.is_admin)
        user.password_hash = get_password_hash(payload.new_password)
        session.add(user)
        await session.commit()
    return {"message": "Reset successful"}
