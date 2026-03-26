from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.db.models import Users, QuestionBank, Subject, Topic, GradeConfig, QuestionStatus
from src.db.auth_utils import get_current_user
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_

router = APIRouter(prefix="/stats", tags=["Analytics"])

STATUS_ARCHIVED = QuestionStatus.ARCHIVED.value
STATUS_PUBLISHED = QuestionStatus.PUBLISHED.value

@router.get("/")
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_session),
    current_user: Users = Depends(get_current_user)
):
    """Returns role-scoped statistics for the dashboard."""
    
    # Determine user role scopes
    is_coordinator = bool(current_user.grade_coordinating)
    is_hod = bool(current_user.hod_subjects)
    
    # 1. Base Counts
    if current_user.is_admin:
        q_count_stmt = select(func.count(QuestionBank.question_id)).where(
            QuestionBank.status != STATUS_ARCHIVED
        )
        user_count_stmt = select(func.count(Users.user_id))
        subject_count_stmt = select(func.count(Subject.subject_id))
        topic_count_stmt = select(func.count(Topic.topic_id))
    elif is_coordinator:
        # Coordinator: count by grade level
        grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        q_count_stmt = select(func.count(QuestionBank.question_id)).join(
            Topic
        ).join(Subject).join(GradeConfig).where(
            and_(
                GradeConfig.grade_level.in_(grade_levels),
                QuestionBank.status != STATUS_ARCHIVED
            )
        )
        user_count_stmt = select(func.count(Users.user_id))
        subject_count_stmt = select(func.count(Subject.subject_id)).join(GradeConfig).where(
            GradeConfig.grade_level.in_(grade_levels)
        )
        topic_count_stmt = select(func.count(Topic.topic_id)).join(Subject).join(GradeConfig).where(
            GradeConfig.grade_level.in_(grade_levels)
        )
    elif is_hod:
        # HOD: count by subject name
        subject_names = [h.subject_name for h in current_user.hod_subjects]
        q_count_stmt = select(func.count(QuestionBank.question_id)).join(
            Topic
        ).join(Subject).where(
            and_(
                Subject.subject_name.in_(subject_names),
                QuestionBank.status != STATUS_ARCHIVED
            )
        )
        user_count_stmt = None
        subject_count_stmt = select(func.count(Subject.subject_id)).where(
            Subject.subject_name.in_(subject_names)
        )
        topic_count_stmt = select(func.count(Topic.topic_id)).join(Subject).where(
            Subject.subject_name.in_(subject_names)
        )
    else:
        # Teacher: personal stats only
        q_count_stmt = select(func.count(QuestionBank.question_id)).where(
            and_(
                QuestionBank.teacher_id == current_user.user_id,
                QuestionBank.status != STATUS_ARCHIVED
            )
        )
        user_count_stmt = None
        subject_count_stmt = select(func.count(Subject.subject_id)).join(Users.subjects).where(
            Users.user_id == current_user.user_id
        )
        topic_count_stmt = select(func.count(Topic.topic_id)).join(Subject).join(Users.subjects).where(
            Users.user_id == current_user.user_id
        )

    q_count = (await session.exec(q_count_stmt)).first() or 0
    sub_count = (await session.exec(subject_count_stmt)).first() or 0
    u_count = (await session.exec(user_count_stmt)).first() if user_count_stmt is not None else None
    topic_count = (await session.exec(topic_count_stmt)).first() or 0

    # 2. Difficulty Distribution
    if current_user.is_admin:
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id)).where(
            QuestionBank.status != STATUS_ARCHIVED
        ).group_by(QuestionBank.difficulty)
    elif is_coordinator:
        grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id)).join(
            Topic
        ).join(Subject).join(GradeConfig).where(
            and_(
                GradeConfig.grade_level.in_(grade_levels),
                QuestionBank.status != STATUS_ARCHIVED
            )
        ).group_by(QuestionBank.difficulty)
    elif is_hod:
        subject_names = [h.subject_name for h in current_user.hod_subjects]
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id)).join(
            Topic
        ).join(Subject).where(
            and_(
                Subject.subject_name.in_(subject_names),
                QuestionBank.status != STATUS_ARCHIVED
            )
        ).group_by(QuestionBank.difficulty)
    else:
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id)).where(
            and_(
                QuestionBank.teacher_id == current_user.user_id,
                QuestionBank.status != STATUS_ARCHIVED
            )
        ).group_by(QuestionBank.difficulty)
    
    diff_results = (await session.exec(diff_stmt)).all()
    difficulty_map = {str(row[0]): row[1] for row in diff_results}

    # 3. Recent Activity (Last 5 Published Questions)
    if current_user.is_admin:
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            Topic.topic_name,
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            Topic, Topic.topic_id == QuestionBank.topic_id
        ).where(
            QuestionBank.status == STATUS_PUBLISHED
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    elif is_coordinator:
        grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            Topic.topic_name,
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            Topic, Topic.topic_id == QuestionBank.topic_id
        ).join(Subject, Subject.subject_id == Topic.subject_id).join(
            GradeConfig, GradeConfig.config_id == Subject.config_id
        ).where(
            and_(
                GradeConfig.grade_level.in_(grade_levels),
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    elif is_hod:
        subject_names = [h.subject_name for h in current_user.hod_subjects]
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            Topic.topic_name,
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            Topic, Topic.topic_id == QuestionBank.topic_id
        ).join(Subject, Subject.subject_id == Topic.subject_id).where(
            and_(
                Subject.subject_name.in_(subject_names),
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    else:
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            Topic.topic_name,
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            Topic, Topic.topic_id == QuestionBank.topic_id
        ).where(
            and_(
                QuestionBank.teacher_id == current_user.user_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    
    recent_questions = (await session.exec(recent_stmt)).all()

    # 4. Coverage Gaps (Topics with zero published questions)
    if current_user.is_admin:
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).outerjoin(
            QuestionBank, and_(
                QuestionBank.topic_id == Topic.topic_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            QuestionBank.question_id.is_(None)
        ).limit(10)
    elif is_coordinator:
        grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).join(GradeConfig).outerjoin(
            QuestionBank, and_(
                QuestionBank.topic_id == Topic.topic_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            and_(
                GradeConfig.grade_level.in_(grade_levels),
                QuestionBank.question_id.is_(None)
            )
        ).limit(10)
    elif is_hod:
        subject_names = [h.subject_name for h in current_user.hod_subjects]
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).outerjoin(
            QuestionBank, and_(
                QuestionBank.topic_id == Topic.topic_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            and_(
                Subject.subject_name.in_(subject_names),
                QuestionBank.question_id.is_(None)
            )
        ).limit(10)
    else:
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).outerjoin(
            QuestionBank, and_(
                QuestionBank.topic_id == Topic.topic_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            and_(
                Subject.subject_id.in_([s.subject_id for s in current_user.subjects]) if current_user.subjects else False,
                QuestionBank.question_id.is_(None)
            )
        ).limit(10) if current_user.subjects else select(Topic)
    
    coverage_gaps = (await session.exec(coverage_stmt)).all()

    # 5. Contribution Leaderboard (top contributors, role-scoped)
    if current_user.is_admin:
        leaderboard_stmt = select(
            Users.full_name,
            func.count(QuestionBank.question_id).label("count")
        ).join(QuestionBank).where(
            QuestionBank.status == STATUS_PUBLISHED
        ).group_by(Users.user_id).order_by(
            func.count(QuestionBank.question_id).desc()
        ).limit(10)
    elif is_coordinator:
        grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        leaderboard_stmt = select(
            Users.full_name,
            func.count(QuestionBank.question_id).label("count")
        ).join(QuestionBank).join(
            Topic
        ).join(Subject).join(GradeConfig).where(
            and_(
                GradeConfig.grade_level.in_(grade_levels),
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).group_by(Users.user_id).order_by(
            func.count(QuestionBank.question_id).desc()
        ).limit(10)
    elif is_hod:
        subject_names = [h.subject_name for h in current_user.hod_subjects]
        leaderboard_stmt = select(
            Users.full_name,
            func.count(QuestionBank.question_id).label("count")
        ).join(QuestionBank).join(
            Topic
        ).join(Subject).where(
            and_(
                Subject.subject_name.in_(subject_names),
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).group_by(Users.user_id).order_by(
            func.count(QuestionBank.question_id).desc()
        ).limit(10)
    else:
        # Teachers see only their own contribution
        leaderboard_stmt = select(
            Users.full_name,
            func.count(QuestionBank.question_id).label("count")
        ).join(QuestionBank).where(
            and_(
                Users.user_id == current_user.user_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).group_by(Users.user_id)
    
    leaderboard = (await session.exec(leaderboard_stmt)).all()

    return {
        "total_questions": q_count,
        "total_subjects": sub_count,
        "total_topics": topic_count,
        "total_users": u_count,
        "difficulty_distribution": difficulty_map,
        "recent_activity": [
            {
                "id": row[0],
                "text": row[1],
                "author": row[3],
                "topic": row[4],
                "created_at": row[2],
            }
            for row in recent_questions
        ],
        "coverage_gaps": [
            {
                "topic_id": row[0],
                "topic_name": row[1],
                "subject_name": row[2],
            }
            for row in coverage_gaps
        ],
        "leaderboard": [
            {
                "name": row[0],
                "count": row[1],
            }
            for row in leaderboard
        ]
    }
