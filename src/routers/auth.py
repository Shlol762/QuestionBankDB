from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi.security import OAuth2PasswordRequestForm
from src.db.main import get_session
from src.db.models import Users
from src.schemas.users import Token
from src.auth.security import verify_password, create_access_token

router = APIRouter(prefix="/api/v1", tags=["Auth"])

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    result = await session.exec(select(Users).where(Users.email == form_data.username))
    user = result.first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.user_id), "role": "admin" if user.is_admin else "teacher"})
    return {"access_token": access_token, "token_type": "bearer"}
