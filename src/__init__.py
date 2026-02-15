from fastapi import FastAPI
from contextlib import asynccontextmanager
from src.db.main import init_db
from src.routers import master_data, questions, users
from src.routers import auth  # <-- Ensure auth router is imported

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    await init_db()
    yield
    print("Shutting down...")

app = FastAPI(
    title="Question Bank API",
    description="API for managing a hierarchical question bank with syllabi, grades, subjects, topics, questions, and users",
    version="1.0.0",
    lifespan=lifespan
)

# Include routers
app.include_router(auth.router)  # <-- Register the auth router
app.include_router(master_data.router)
app.include_router(questions.router)
app.include_router(users.router)

@app.get("/ping")
def ping():
    return {"message": "pong"}