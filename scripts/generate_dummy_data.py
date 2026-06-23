import asyncio
import random
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.db.main import async_engine
from src.db.models import (
    Users, SyllabusMaster, GradeConfig, Subject, Topic, QuestionBank,
    DifficultyLevel, QuestionType, QuestionStatus,
    UserSubjectLink, GradeCoordinatorLink, HODLink, AllowedSubject, AllowedGrade
)
from src.db.auth_utils import get_password_hash

# --- LOGGING SETUP ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- CONFIGURATION CONSTANTS (INDIAN LOCALE) ---
TEACHER_NAMES = [
    "Dr. Rajesh Hegde", "Sunita Gowda", "Amit Verma", "Priya Nair",
    "Dr. Srinivas Murthy", "Meera Bhat", "Vikram Rao", "Ananya Sen",
    "Karthik Subramanian", "Deepika Patil", "Sanjay Gowda", "Anjali Hegde"
]

DEPARTMENTS = ["Science", "Mathematics", "Humanities", "Languages", "Computer Science"]

CURRICULUM_DATA = {
    "Physics": {
        "Topics": ["Electrostatics", "Current Electricity", "Optics & Light", "Semiconductor Electronics", "Magnetism"],
        "Questions": [
            "Calculate the electric field due to an infinite line charge using Gauss's Law.",
            "State and explain Ohm's Law and its limitations under high temperature.",
            "Derive the lens maker's formula for a thin convex lens.",
            "Explain the working of a p-n junction diode in forward and reverse bias.",
            "What is electromagnetic induction? State Faraday's laws of EMI."
        ]
    },
    "Mathematics": {
        "Topics": ["Calculus & Limits", "Matrices & Determinants", "Probability", "Vectors & 3D Geometry", "Trigonometric Functions"],
        "Questions": [
            "Find the derivative of f(x) = sin(x^2) using the chain rule.",
            "Solve the system of linear equations using Cramer's rule.",
            "Calculate the probability of drawing an ace from a well-shuffled deck of 52 cards.",
            "Find the shortest distance between two skew lines in 3D space.",
            "Solve the trigonometric equation: sin(2x) - cos(x) = 0."
        ]
    },
    "Chemistry": {
        "Topics": ["Organic Chemistry", "Electrochemistry", "Chemical Kinetics", "Coordination Compounds", "Solutions & Colligative Properties"],
        "Questions": [
            "Describe the SN1 and SN2 reaction mechanisms and compare their rates.",
            "State Kohlrausch's law of independent migration of ions and its applications.",
            "Derive the integrated rate equation for a first-order chemical reaction.",
            "Explain Werner's theory of coordination compounds with examples.",
            "State Henry's law of gas solubility and explain its limitations."
        ]
    },
    "History": {
        "Topics": ["Indian National Movement", "Mughal Empire", "Revolt of 1857", "Maurya & Gupta Empires", "French & Industrial Revolutions"],
        "Questions": [
            "Analyze the role of Mahatma Gandhi in the Non-Cooperation Movement of 1920.",
            "Discuss the administrative and land revenue reforms introduced by Akbar.",
            "What were the immediate and socio-religious causes of the Revolt of 1857?",
            "Explain the administration of the Maurya Empire under Emperor Ashoka.",
            "Assess the social and economic impact of the Industrial Revolution in Europe."
        ]
    }
}

# --- MODULAR SEEDING FUNCTIONS ---

async def seed_allowed_grades_and_subjects(session: AsyncSession) -> Dict[str, Any]:
    """Seeds the master allowed grades and subjects tables."""
    logger.info("📋 Seeding Allowed Grades and Subjects...")
    
    # 1. Seed Allowed Grades (High school level 9 to 12)
    allowed_grades = []
    for level in range(9, 13):
        stmt = select(AllowedGrade).where(AllowedGrade.allowed_grade_id == level)
        grade = (await session.exec(stmt)).first()
        if not grade:
            grade = AllowedGrade(
                allowed_grade_id=level,
                grade_name=f"Grade {level}",
                recommendation_note="High School Grade"
            )
            session.add(grade)
        allowed_grades.append(grade)
    
    # 2. Seed Allowed Subjects (Master list based on curriculum keys)
    allowed_subjects = {}
    for sub_name in CURRICULUM_DATA.keys():
        stmt = select(AllowedSubject).where(AllowedSubject.subject_name == sub_name)
        subject = (await session.exec(stmt)).first()
        if not subject:
            subject = AllowedSubject(
                subject_name=sub_name,
                recommendation_note="Core high school curriculum subject"
            )
            session.add(subject)
            await session.flush()
        allowed_subjects[sub_name] = subject
        
    await session.flush()
    return {"grades": allowed_grades, "subjects": allowed_subjects}

async def seed_users(session: AsyncSession) -> List[Users]:
    """Seeds administrators and faculty members with Indian names."""
    logger.info("👤 Provisioning Faculty and Administrators...")
    teachers = []
    
    # 1. Create Faculty Users
    for name in TEACHER_NAMES:
        email = name.lower().replace(" ", ".").replace(".", "", 1) + "@school.edu"
        dept = random.choice(DEPARTMENTS)
        
        stmt = select(Users).where(Users.email == email)
        user = (await session.exec(stmt)).first()
        
        if not user:
            user = Users(
                full_name=name,
                email=email,
                password_hash=get_password_hash("Password123!"),
                department=dept,
                is_admin=False
            )
            session.add(user)
        teachers.append(user)
        
    # 2. Ensure at least one system admin account
    stmt = select(Users).where(Users.email == "admin@school.edu")
    admin = (await session.exec(stmt)).first()
    if not admin:
        admin = Users(
            full_name="System Administrator",
            email="admin@school.edu",
            password_hash=get_password_hash("Admin1234!@#"),
            department="Administration",
            is_admin=True
        )
        session.add(admin)
        
    await session.flush()
    return teachers

async def seed_curriculum_hierarchy(
    session: AsyncSession, 
    allowed_grades: List[AllowedGrade], 
    allowed_subjects: Dict[str, AllowedSubject]
) -> List[Topic]:
    """Seeds the multi-year curriculum tree: Syllabus -> Grade -> Subject -> Topic."""
    logger.info("📚 Constructing Multi-Year Curriculum Hierarchy...")
    academic_years = ["2023-24", "2024-25", "2025-26"]
    all_topics = []

    for year in academic_years:
        syllabus = SyllabusMaster(syllabus_name="Standard National Curriculum", academic_year=year)
        session.add(syllabus)
        await session.flush()

        for grade_obj in allowed_grades:
            grade_config = GradeConfig(syllabus_id=syllabus.syllabus_id, grade_level=grade_obj.allowed_grade_id)
            session.add(grade_config)
            await session.flush()

            for sub_name, allowed_sub in allowed_subjects.items():
                subject = Subject(
                    subject_name=sub_name,
                    config_id=grade_config.config_id,
                    allowed_subject_id=allowed_sub.allowed_subject_id
                )
                session.add(subject)
                await session.flush()

                for topic_name in CURRICULUM_DATA[sub_name]["Topics"]:
                    topic = Topic(topic_name=topic_name, subject_id=subject.subject_id)
                    session.add(topic)
                    all_topics.append(topic)
                    
    await session.flush()
    return all_topics

async def seed_user_relations(
    session: AsyncSession, 
    teachers: List[Users], 
    allowed_subjects: Dict[str, AllowedSubject]
):
    """Assigns security roles (HODs, Coordinators) and links teachers to subjects."""
    logger.info("🔑 Setting up HOD, Coordinator, and Teaching Subject mappings...")
    
    # 1. Assign HOD Links (3 HODs)
    hod_candidates = random.sample(teachers, 3)
    subject_names = list(allowed_subjects.keys())
    for i in range(3):
        sub_name = subject_names[i]
        allowed_sub = allowed_subjects[sub_name]
        session.add(HODLink(
            user_id=hod_candidates[i].user_id,
            allowed_subject_id=allowed_sub.allowed_subject_id
        ))

    # 2. Assign Grade Coordinator Links (2 Coordinators)
    coord_candidates = random.sample(teachers, 2)
    session.add(GradeCoordinatorLink(user_id=coord_candidates[0].user_id, grade_level=10))
    session.add(GradeCoordinatorLink(user_id=coord_candidates[1].user_id, grade_level=12))

    # 3. Random Subject Teaching Assignments
    all_subjects = (await session.exec(select(Subject))).all()
    for teacher in teachers:
        assigned = random.sample(all_subjects, k=random.randint(2, 5))
        for sub in assigned:
            session.add(UserSubjectLink(user_id=teacher.user_id, subject_id=sub.subject_id))

    await session.flush()

async def seed_questions(
    session: AsyncSession, 
    topics: List[Topic], 
    teachers: List[Users]
) -> int:
    """Generates bulk questions mapped to topics via a many-to-many relationship."""
    logger.info("❓ Generating Assessment Content (Questions)...")
    question_count = 0
    
    for topic in topics:
        stmt = select(Subject).where(Subject.subject_id == topic.subject_id)
        sub = (await session.exec(stmt)).first()
        
        base_data = CURRICULUM_DATA.get(sub.subject_name)
        if not base_data:
            continue
            
        # Generate 2-4 questions per topic
        for _ in range(random.randint(2, 4)):
            q_type = random.choice(list(QuestionType))
            difficulty = random.choice(list(DifficultyLevel))
            teacher = random.choice(teachers)
            
            q_text = random.choice(base_data["Questions"])
            
            options = None
            ans_text = "Standard Solution provided in marking scheme."
            
            if q_type == QuestionType.MCQ:
                options = {
                    "A": "First plausible answer",
                    "B": "Correct Answer",
                    "C": "Common misconception",
                    "D": "Distractor"
                }
                ans_text = "B"
            elif q_type == QuestionType.TRUE_FALSE:
                ans_text = random.choice(["True", "False"])
            elif q_type == QuestionType.MATCH_THE_FOLLOWING:
                options = {
                    "pairs": [
                        {"left": "Term A", "right": "Definition A"},
                        {"left": "Term B", "right": "Definition B"}
                    ]
                }
                ans_text = "Pairs matched"

            created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 730))
            updated_at = created_at + timedelta(days=random.randint(0, 365))

            q = QuestionBank(
                teacher_id=teacher.user_id,
                question_text=f"{q_text} [Topic: {topic.topic_name}]",
                answer_text=ans_text,
                options=options,
                marks=random.choice([2, 5, 10]),
                difficulty=difficulty,
                q_type=q_type,
                status=random.choice([QuestionStatus.PUBLISHED, QuestionStatus.ARCHIVED]),
                created_at=created_at,
                updated_at=updated_at,
                topics=[topic] # Establish relationship link in DB mapping
            )
            session.add(q)
            question_count += 1
            
    await session.flush()
    return question_count

# --- COORDINATOR PIPELINE ---

async def generate_data():
    """Main coordinator that drops and rebuilds database content within a single transaction."""
    logger.info("🚀 Starting database seeding pipeline...")
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Pre-check database status
        user_count = (await session.exec(select(func.count(Users.user_id)))).first()
        if user_count > 0:
            logger.warning("Database contains existing records. Purging first...")
            await session.execute(text(
                "TRUNCATE users, syllabus_master, grade_config, subjects, topics, question_bank, "
                "allowed_subjects, allowed_grades, hod_link, grade_coordinator_link, "
                "user_subject_link, question_topic_link CASCADE"
            ))
            await session.commit()

        # Run all updates under a single transaction
        try:
            # 1. Master allowed configurations
            allowed_data = await seed_allowed_grades_and_subjects(session)
            
            # 2. Staff accounts
            teachers = await seed_users(session)
            
            # 3. Curriculum tree
            topics = await seed_curriculum_hierarchy(session, allowed_data["grades"], allowed_data["subjects"])
            
            # 4. Staff-subject/coordinator relations
            await seed_user_relations(session, teachers, allowed_data["subjects"])
            
            # 5. Assessment questions
            question_count = await seed_questions(session, topics, teachers)
            
            # Commit the entire transaction
            await session.commit()
            
            logger.info(
                f"✨ SUCCESS: Generated {len(teachers)} staff, "
                f"{len(allowed_data['grades'])} grades, "
                f"{len(topics)} topics, and {question_count} questions."
            )
        except Exception as e:
            logger.error(f"❌ Transaction failed, rolling back: {e}")
            await session.rollback()
            raise e

if __name__ == "__main__":
    try:
        asyncio.run(generate_data())
    except KeyboardInterrupt:
        logger.warning("🛑 Generation aborted by user.")
