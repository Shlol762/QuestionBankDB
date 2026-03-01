import asyncio
from sqlmodel import select
from src.db.main import async_engine
from src.db.models import Users
from src.db.auth_utils import get_password_hash

async def create_initial_admin():
    print("🚀 Initializing Admin Creation...")
    
    # We create a local session manually for the script
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    async_session = sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # 1. Check if admin already exists
        email = "admin@school.edu"
        statement = select(Users).where(Users.email == email)
        result = await session.execute(statement)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"✅ Admin with email {email} already exists.")
            return

        # 2. Create the Admin
        print(f"Creating admin account for {email}...")
        admin_user = Users(
            full_name="System Administrator",
            email=email,
            password_hash=get_password_hash("admin123"), # Default password
            department="IT / Administration",
            is_admin=True,
            grade_coordinating=[],
            hod_subjects=[]
        )

        session.add(admin_user)
        await session.commit()
        print("✨ Admin account created successfully!")
        print(f"Login with: \nEmail: {email}\nPassword: admin123")

if __name__ == "__main__":
    asyncio.run(create_initial_admin())
