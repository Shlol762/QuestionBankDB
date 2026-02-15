from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.db.main import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    await init_db()

    yield

    print("Shutting down...")


app = FastAPI(
    title="Question Bank API",
    description="API for managing a question bank",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/ping")
def ping():
    return {"message": "pong"}