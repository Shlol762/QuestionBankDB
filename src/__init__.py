from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from src.db.main import init_db
from src.db.auth_routes import router as auth_router
from src.db.curriculum_routes import router as curriculum_router
from src.db.questions.routes import router as question_router
from src.db.stats_routes import router as stats_router
from src.db.main import async_engine
from src.config import settings
from src.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from fastapi.responses import JSONResponse
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
# This allows our React frontend (running on localhost:5173) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.FORCE_HTTPS:
    app.add_middleware(HTTPSRedirectMiddleware)


@app.middleware("http")
async def add_security_and_cache_headers(request, call_next):
    response = await call_next(request)

    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if settings.FORCE_HTTPS:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=86400, immutable"

    return response

# Mount static files for image support
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.include_router(auth_router)
app.include_router(curriculum_router)
app.include_router(question_router)
app.include_router(stats_router)


@app.get("/ping")
def ping():
    return {"message": "pong"}


@app.get("/health")
async def health_check():
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable"},
        )