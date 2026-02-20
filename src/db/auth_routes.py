from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.db.main import get_session
from src.db.models import Users, GradeCoordinatorLink, HODLink, UserSubjectLink
from src.db.auth_utils import get_password_hash, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr

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
    grade_levels: List[int] = [] # For Grade Coordinator
    hod_subject_names: List[str] = [] # For HOD

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department: str
    is_admin: bool = False
    subject_ids: List[int] = [] 
    grade_levels: List[int] = []
    hod_subject_names: List[str] = []

class Token(BaseModel):
    access_token: str
    token_type: str

# --- ROUTES ---

@router.get("/me", response_model=UserRead)
async def get_me(current_user: Users = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user, including their roles and assignments."""
    # current_user is already loaded with subjects, grade_coordinating, and hod_subjects in auth_utils
    user_dict = current_user.model_dump()
    user_dict["subjects"] = [SubjectSimple(subject_id=s.subject_id, subject_name=s.subject_name) for s in current_user.subjects]
    user_dict["grade_levels"] = [g.grade_level for g in current_user.grade_coordinating]
    user_dict["hod_subject_names"] = [h.subject_name for h in current_user.hod_subjects]
    return user_dict

@router.get("/users", response_model=List[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Lists all users. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can access the staff list")
    
    from sqlalchemy.orm import selectinload
    statement = select(Users).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_subjects)
    )
    result = await session.exec(statement)
    users = result.all()
    
    # Map to schema
    output = []
    for u in users:
        d = u.model_dump()
        d["subjects"] = u.subjects
        d["grade_levels"] = [g.grade_level for g in u.grade_coordinating]
        d["hod_subject_names"] = [h.subject_name for h in u.hod_subjects]
        output.append(d)
    return output

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Registers staff and assigns them roles and subjects."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can register staff")

    statement = select(Users).where(Users.email == user_data.email)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # --- VALIDATION ---
    from src.db.models import GradeConfig, Subject
    
    # Validate Grade Levels
    if user_data.grade_levels:
        for gl in user_data.grade_levels:
            grade_stmt = select(GradeConfig).where(GradeConfig.grade_level == gl)
            grade_res = await session.exec(grade_stmt)
            if not grade_res.first():
                raise HTTPException(400, f"Grade level {gl} does not exist in curriculum")
    
    # Validate HOD Subject Names
    if user_data.hod_subject_names:
        for sn in user_data.hod_subject_names:
            sub_stmt = select(Subject).where(Subject.subject_name == sn)
            sub_res = await session.exec(sub_stmt)
            if not sub_res.first():
                raise HTTPException(400, f"Subject '{sn}' does not exist in curriculum")
    # --- END VALIDATION ---

    new_user = Users(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=user_data.is_admin
    )
    session.add(new_user)
    await session.flush() 

    # Assign Subjects
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
    return {"message": "Staff member registered successfully"}

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
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "id": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.delete("/users/{id}", status_code=204)
async def delete_user(id: int, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    if id == current_user.user_id: raise HTTPException(400, "You cannot delete yourself")
    user = await session.get(Users, id)
    if user:
        await session.delete(user)
        await session.commit()
    return None

@router.patch("/users/{id}", response_model=UserRead)
async def update_user(id: int, data: UserCreate, session: AsyncSession = Depends(get_session), current_user: Users = Depends(get_current_user)):
    if not current_user.is_admin: raise HTTPException(403, "Admin only")
    user = await session.get(Users, id)
    if not user: raise HTTPException(404, "User not found")
    
    # --- VALIDATION ---
    from src.db.models import GradeConfig, Subject
    
    # Validate Grade Levels
    if data.grade_levels:
        for gl in data.grade_levels:
            grade_stmt = select(GradeConfig).where(GradeConfig.grade_level == gl)
            grade_res = await session.exec(grade_stmt)
            if not grade_res.first():
                raise HTTPException(400, f"Grade level {gl} does not exist in curriculum")
    
    # Validate HOD Subject Names
    if data.hod_subject_names:
        for sn in data.hod_subject_names:
            sub_stmt = select(Subject).where(Subject.subject_name == sn)
            sub_res = await session.exec(sub_stmt)
            if not sub_res.first():
                raise HTTPException(400, f"Subject '{sn}' does not exist in curriculum")
    # --- END VALIDATION ---

    user.full_name = data.full_name
    user.email = data.email
    user.department = data.department
    user.is_admin = data.is_admin
    if data.password: user.password_hash = get_password_hash(data.password)
    
    from sqlmodel import delete
    # Sync Subjects
    await session.exec(delete(UserSubjectLink).where(UserSubjectLink.user_id == id))
    if data.subject_ids:
        for s_id in data.subject_ids:
            session.add(UserSubjectLink(user_id=id, subject_id=s_id))
            
    # Sync Grade Coordinator Roles
    await session.exec(delete(GradeCoordinatorLink).where(GradeCoordinatorLink.user_id == id))
    if data.grade_levels:
        for gl in data.grade_levels:
            session.add(GradeCoordinatorLink(user_id=id, grade_level=gl))
            
    # Sync HOD Roles
    await session.exec(delete(HODLink).where(HODLink.user_id == id))
    if data.hod_subject_names:
        for sn in data.hod_subject_names:
            session.add(HODLink(user_id=id, subject_name=sn))
            
    await session.commit()
    
    from sqlalchemy.orm import selectinload
    statement = select(Users).options(
        selectinload(Users.subjects),
        selectinload(Users.grade_coordinating),
        selectinload(Users.hod_subjects)
    ).where(Users.user_id == id)
    result = await session.exec(statement)
    user = result.first()
    
    d = user.model_dump()
    d["subjects"] = user.subjects
    d["grade_levels"] = [g.grade_level for g in user.grade_coordinating]
    d["hod_subject_names"] = [h.subject_name for h in user.hod_subjects]
    return d
