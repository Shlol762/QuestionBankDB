import asyncio
from sqlmodel import SQLModel
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.db.main import async_engine
import src.db.models

async def reset_db():
    print("Dropping all tables...")
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        print("Recreating tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Database reset complete.")

if __name__ == "__main__":
    asyncio.run(reset_db())
