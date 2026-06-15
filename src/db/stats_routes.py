from fastapi import APIRouter, Depends
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.db.models import Users, QuestionBank, Subject, Topic, GradeConfig, QuestionStatus, QuestionTopicLink
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
    is_hod = bool(current_user.hod_assignments)
    
    # 1. Base Counts
    if current_user.is_admin:
        q_count_stmt = select(func.count(QuestionBank.question_id)).where(
            QuestionBank.status != STATUS_ARCHIVED
        )
        user_count_stmt = select(func.count(Users.user_id))
        subject_count_stmt = select(func.count(Subject.subject_id))
        topic_count_stmt = select(func.count(Topic.topic_id))
    else:
        # Non-admin user: scope by their roles (HOD, Coordinator) and authorship.
        hod_subject_names = [h.allowed_subject.subject_name for h in current_user.hod_assignments]
        coordinator_grade_levels = [g.grade_level for g in current_user.grade_coordinating]
        
        # Build the OR filters for questions
        filters = []
        if hod_subject_names:
            filters.append(Subject.subject_name.in_(hod_subject_names))
        if coordinator_grade_levels:
            filters.append(GradeConfig.grade_level.in_(coordinator_grade_levels))
            
        if filters:
            question_visibility_cond = or_(
                or_(*filters),
                QuestionBank.teacher_id == current_user.user_id
            )
        else:
            question_visibility_cond = QuestionBank.teacher_id == current_user.user_id
            
        q_count_stmt = select(func.count(QuestionBank.question_id.distinct())).join(
            QuestionTopicLink, QuestionTopicLink.question_id == QuestionBank.question_id
        ).join(Topic, Topic.topic_id == QuestionTopicLink.topic_id).join(Subject).join(GradeConfig).where(
            and_(
                question_visibility_cond,
                QuestionBank.status != STATUS_ARCHIVED
            )
        )
        
        user_count_stmt = select(func.count(Users.user_id)) if is_coordinator else None
        
        # Scope subjects / topics visible to the user:
        # They can see subjects they teach, or subjects they manage as HOD, or subjects under grades they coordinate.
        subject_filters = []
        subject_ids = [s.subject_id for s in current_user.subjects]
        if subject_ids:
            subject_filters.append(Subject.subject_id.in_(subject_ids))
        if hod_subject_names:
            subject_filters.append(Subject.subject_name.in_(hod_subject_names))
        if coordinator_grade_levels:
            subject_filters.append(GradeConfig.grade_level.in_(coordinator_grade_levels))
            
        if subject_filters:
            subject_count_stmt = select(func.count(Subject.subject_id.distinct())).join(GradeConfig).where(
                or_(*subject_filters)
            )
            topic_count_stmt = select(func.count(Topic.topic_id.distinct())).join(Subject).join(GradeConfig).where(
                or_(*subject_filters)
            )
        else:
            subject_count_stmt = select(func.count(Subject.subject_id)).where(False)
            topic_count_stmt = select(func.count(Topic.topic_id)).where(False)

    q_count = (await session.exec(q_count_stmt)).first() or 0
    sub_count = (await session.exec(subject_count_stmt)).first() or 0
    u_count = (await session.exec(user_count_stmt)).first() if user_count_stmt is not None else None
    topic_count = (await session.exec(topic_count_stmt)).first() or 0

    # 2. Difficulty Distribution
    if current_user.is_admin:
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id)).where(
            QuestionBank.status != STATUS_ARCHIVED
        ).group_by(QuestionBank.difficulty)
    else:
        diff_stmt = select(QuestionBank.difficulty, func.count(QuestionBank.question_id.distinct())).join(
            QuestionTopicLink, QuestionTopicLink.question_id == QuestionBank.question_id
        ).join(Topic, Topic.topic_id == QuestionTopicLink.topic_id).join(Subject).join(GradeConfig).where(
            and_(
                question_visibility_cond,
                QuestionBank.status != STATUS_ARCHIVED
            )
        ).group_by(QuestionBank.difficulty)
    
    diff_results = (await session.exec(diff_stmt)).all()
    difficulty_map = {}
    for row in diff_results:
        key = row[0]
        if key is not None:
            if hasattr(key, "value"):
                key_str = str(key.value).lower()
            else:
                key_str = str(key).lower()
            if key_str.startswith("difficultylevel."):
                key_str = key_str.split(".")[-1]
            difficulty_map[key_str] = row[1]

    # 3. Recent Activity (Last 5 Published Questions)
    if current_user.is_admin:
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            func.string_agg(Topic.topic_name, ', ').label("topic_name"),
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            QuestionTopicLink, QuestionTopicLink.question_id == QuestionBank.question_id
        ).join(Topic, Topic.topic_id == QuestionTopicLink.topic_id).where(
            QuestionBank.status == STATUS_PUBLISHED
        ).group_by(
            QuestionBank.question_id, Users.full_name
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    else:
        recent_stmt = select(
            QuestionBank.question_id,
            func.substr(QuestionBank.question_text, 1, 100).label("short_text"),
            QuestionBank.created_at,
            Users.full_name,
            func.string_agg(Topic.topic_name, ', ').label("topic_name"),
        ).join(Users, Users.user_id == QuestionBank.teacher_id).join(
            QuestionTopicLink, QuestionTopicLink.question_id == QuestionBank.question_id
        ).join(Topic, Topic.topic_id == QuestionTopicLink.topic_id).join(Subject, Subject.subject_id == Topic.subject_id).join(
            GradeConfig, GradeConfig.config_id == Subject.config_id
        ).where(
            and_(
                question_visibility_cond,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).group_by(
            QuestionBank.question_id, Users.full_name
        ).order_by(
            QuestionBank.created_at.desc(), QuestionBank.question_id.desc()
        ).limit(5)
    
    recent_questions = (await session.exec(recent_stmt)).all()

    # 4. Coverage Gaps (Topics with zero published questions)
    if current_user.is_admin:
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).outerjoin(
            QuestionTopicLink, QuestionTopicLink.topic_id == Topic.topic_id
        ).outerjoin(
            QuestionBank, and_(
                QuestionBank.question_id == QuestionTopicLink.question_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            QuestionBank.question_id.is_(None)
        ).limit(10)
    else:
        coverage_stmt = select(Topic.topic_id, Topic.topic_name, Subject.subject_name).join(
            Subject
        ).join(GradeConfig).outerjoin(
            QuestionTopicLink, QuestionTopicLink.topic_id == Topic.topic_id
        ).outerjoin(
            QuestionBank, and_(
                QuestionBank.question_id == QuestionTopicLink.question_id,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).where(
            and_(
                or_(*subject_filters) if subject_filters else False,
                QuestionBank.question_id.is_(None)
            )
        ).limit(10)
    
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
    elif not is_coordinator and not is_hod:
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
    else:
        leaderboard_stmt = select(
            Users.full_name,
            func.count(QuestionBank.question_id.distinct()).label("count")
        ).join(QuestionBank).join(
            QuestionTopicLink, QuestionTopicLink.question_id == QuestionBank.question_id
        ).join(Topic, Topic.topic_id == QuestionTopicLink.topic_id).join(Subject).join(GradeConfig).where(
            and_(
                question_visibility_cond,
                QuestionBank.status == STATUS_PUBLISHED
            )
        ).group_by(Users.user_id).order_by(
            func.count(QuestionBank.question_id.distinct()).desc()
        ).limit(10)
    
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
