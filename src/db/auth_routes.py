from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.db.models import Users
from src.db.auth_utils import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- SCHEMAS ---
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    department: str
    is_admin: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

# --- ROUTES ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, session: AsyncSession = Depends(get_session)):
    """Registers a new user in the system."""
    # Check if user already exists
    statement = select(Users).where(Users.email == user_data.email)
    result = await session.exec(statement)
    existing_user = result.first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    new_user = Users(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        department=user_data.department,
        is_admin=user_data.is_admin
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    return {"message": "User created successfully", "user_id": new_user.user_id}

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    """Logs in a user and returns a JWT access token."""
    # Find user by email (OAuth2 uses 'username' field for the login identifier)
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
