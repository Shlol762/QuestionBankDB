import asyncio
import getpass
from sqlmodel import select
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
        print("Please provide admin account details.")
        full_name = input("Full name [System Administrator]: ").strip() or "System Administrator"
        email = input("Email [admin@school.edu]: ").strip() or "admin@school.edu"
        department = input("Department [IT / Administration]: ").strip() or "IT / Administration"

        password = getpass.getpass("Enter initial admin password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("❌ Passwords do not match. Aborting.")
            return
        if len(password) < 12:
            print("❌ Password must be at least 12 characters.")
            return

        # 1. Check if admin already exists
        statement = select(Users).where(Users.email == email)
        result = await session.execute(statement)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"✅ Admin with email {email} already exists.")
            return

        # 2. Create the Admin
        print(f"Creating admin account for {email}...")
        admin_user = Users(
            full_name=full_name,
            email=email,
            password_hash=get_password_hash(password),
            department=department,
            is_admin=True,
            grade_coordinating=[],
            hod_assignments=[]
        )

        session.add(admin_user)
        await session.commit()
        print("✨ Admin account created successfully!")
        print(f"Login with: {email}")

if __name__ == "__main__":
    asyncio.run(create_initial_admin())
