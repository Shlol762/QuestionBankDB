import asyncio
from sqlmodel import SQLModel
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
