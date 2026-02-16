from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from src.db.main import get_session
from src.db.models import Users
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

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department: str
    is_admin: bool = False
    subject_ids: List[int] = [] # List of real Subject IDs from the DB

class Token(BaseModel):
    access_token: str
    token_type: str

# --- ROUTES ---

@router.get("/me", response_model=UserRead)
async def get_me(current_user: Users = Depends(get_current_user)):
    """Returns the profile of the currently logged-in user, including their assigned subjects."""
    return current_user

@router.get("/users", response_model=List[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Lists all users. Restricted to Admins."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can access the staff list")
    
    # Load users with their subjects attached
    from sqlalchemy.orm import selectinload
    statement = select(Users).options(selectinload(Users.subjects))
    result = await session.exec(statement)
    return result.all()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate, 
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Registers staff and assigns them to subjects properly."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can register staff")

    statement = select(Users).where(Users.email == user_data.email)
    result = await session.exec(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    new_user = Users(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=user_data.is_admin
    )
    session.add(new_user)
    await session.flush() # Get the new user_id without committing yet

    # Assign Subjects
    if user_data.subject_ids:
        from src.db.models import UserSubjectLink
        for s_id in user_data.subject_ids:
            link = UserSubjectLink(user_id=new_user.user_id, subject_id=s_id)
            session.add(link)
    
    await session.commit()
    return {"message": "Staff member registered successfully"}

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    """Logs in a user and returns a JWT access token."""
    # Find user by email
    statement = select(Users).where(Users.email == form_data.username)
    result = await session.exec(statement)
    user = result.first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
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
    
    # Update fields
    user.full_name = data.full_name
    user.email = data.email
    user.department = data.department
    user.is_admin = data.is_admin
    if data.password: user.password_hash = get_password_hash(data.password)
    
    # Sync Subjects
    from src.db.models import UserSubjectLink
    # Clear old links
    from sqlmodel import delete
    await session.exec(delete(UserSubjectLink).where(UserSubjectLink.user_id == id))
    # Add new ones
    if data.subject_ids:
        for s_id in data.subject_ids:
            session.add(UserSubjectLink(user_id=id, subject_id=s_id))
            
    await session.commit()
    await session.refresh(user)
    return user
