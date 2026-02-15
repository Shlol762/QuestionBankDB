from typing import Optional
from sqlmodel import SQLModel, Field


# ==========================================
# USER SCHEMAS
# ==========================================
class UserBase(SQLModel):
    """Base schema for User (Teacher)"""
    full_name: str = Field(..., description="Full name of the user")
    email: str = Field(..., description="Unique email address")
    department: str = Field(..., description="Department (e.g., Science, Commerce)")
    is_admin: bool = Field(default=False, description="Admin status")


class UserCreate(UserBase):
    """Schema for creating a new User"""
    password: str  # Plain password for registration (write-only)


class Token(SQLModel):
    access_token: str
    token_type: str


class UserUpdate(SQLModel):
    """Schema for updating a User"""
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    is_admin: Optional[bool] = None


class UserRead(UserBase):
    """Schema for reading User (includes ID)"""
    user_id: int
