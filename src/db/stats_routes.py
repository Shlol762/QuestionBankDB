from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.db.models import Users, QuestionBank, Subject, Topic
from src.db.auth_utils import get_current_user
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/stats", tags=["Analytics"])

@router.get("/")
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Returns real-time statistics for the dashboard."""
    
    # 1. Base Counts
    # Admin sees total school stats, Teachers see their own
    if current_user.is_admin:
        q_count_stmt = select(func.count(QuestionBank.question_id))
        user_count_stmt = select(func.count(Users.user_id))
        subject_count_stmt = select(func.count(Subject.subject_id))
    else:
        q_count_stmt = select(func.count(QuestionBank.question_id)).where(QuestionBank.teacher_id == current_user.user_id)
        user_count_stmt = None # Teachers don't need this
        subject_count_stmt = select(func.count(Subject.subject_id)).join(Users.subjects).where(Users.user_id == current_user.user_id)

    q_count = (await session.exec(q_count_stmt)).first()
    sub_count = (await session.exec(subject_count_stmt)).first()
    u_count = (await session.exec(user_count_stmt)).first() if user_count_stmt is not None else None

    # 2. Difficulty Distribution
    diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id))
    if not current_user.is_admin:
        diff_stmt = diff_stmt.where(QuestionBank.teacher_id == current_user.user_id)
    diff_stmt = diff_stmt.group_by(QuestionBank.difficulty)
    diff_results = (await session.exec(diff_stmt)).all()
    
    difficulty_map = {row[0]: row[1] for row in diff_results}

    # 3. Recent Activity (Last 5 Questions)
    recent_stmt = select(QuestionBank).options(selectinload(QuestionBank.teacher), selectinload(QuestionBank.topic))
    if not current_user.is_admin:
        recent_stmt = recent_stmt.where(QuestionBank.teacher_id == current_user.user_id)
    recent_stmt = recent_stmt.order_by(QuestionBank.created_at.desc()).limit(5)
    
    recent_questions = (await session.exec(recent_stmt)).all()

    return {
        "total_questions": q_count,
        "total_subjects": sub_count,
        "total_users": u_count,
        "difficulty_distribution": difficulty_map,
        "recent_activity": [
            {
                "id": q.question_id,
                "text": q.question_text[:100],
                "author": q.teacher.full_name,
                "topic": q.topic.topic_name,
                "created_at": q.created_at
            } for q in recent_questions
        ]
    }
