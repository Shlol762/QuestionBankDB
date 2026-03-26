from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import text, SQLModel
from src.config import settings


async_engine = create_async_engine(
    url=settings.POSTGRES_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
)


async def init_db():
    async with async_engine.begin() as conn:
        # Import models so SQLModel metadata contains the full current schema.
        from . import models  # noqa: F401
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        bind = async_engine, 
        class_=AsyncSession,
        expire_on_commit=False, 
    )

    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        