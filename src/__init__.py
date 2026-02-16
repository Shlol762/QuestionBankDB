from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.db.main import init_db
from src.db.auth_routes import router as auth_router
from src.db.curriculum_routes import router as curriculum_router
from src.db.questions.routes import router as question_router
import os


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

# Configure CORS
# This allows our React frontend (running on localhost:5173) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for image support
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.include_router(auth_router)
app.include_router(curriculum_router)
app.include_router(question_router)


@app.get("/ping")
def ping():
    return {"message": "pong"}