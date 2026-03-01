import asyncio
import random
from datetime import datetime, timedelta
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.db.main import async_engine
from src.db.models import (
    Users, SyllabusMaster, GradeConfig, Subject, Topic, QuestionBank,
    DifficultyLevel, QuestionType, UserSubjectLink, GradeCoordinatorLink, HODLink
)
from src.db.auth_utils import get_password_hash

# --- REALISTIC DATA COLLECTIONS ---

TEACHER_NAMES = [
    "Dr. Robert Miller", "Sarah Jenkins", "Michael Chen", "Emma Thompson",
    "David Rodriguez", "Linda Wu", "James Wilson", "Maria Garcia",
    "Christopher Lee", "Jessica Taylor", "Daniel Brown", "Sophia Davis"
]

DEPARTMENTS = ["Science", "Mathematics", "Humanities", "Languages", "Computer Science"]

CURRICULUM_DATA = {
    "Physics": {
        "Topics": ["Thermodynamics", "Quantum Mechanics", "Electromagnetism", "Optics", "Nuclear Physics"],
        "Questions": [
            "Explain the second law of thermodynamics in terms of entropy.",
            "What is the photoelectric effect and how does it support particle theory?",
            "Calculate the magnetic field at the center of a circular loop.",
            "Define the refractive index of a medium.",
            "Compare nuclear fission and nuclear fusion."
        ]
    },
    "Mathematics": {
        "Topics": ["Calculus", "Linear Algebra", "Trigonometry", "Probability", "Complex Numbers"],
        "Questions": [
            "Find the derivative of f(x) = sin(x^2) using the chain rule.",
            "Determine the eigenvalues of a 2x2 identity matrix.",
            "Prove the Pythagorean identity for all real theta.",
            "Calculate the probability of drawing an ace from a deck of 52 cards.",
            "Express (1 + i)^4 in polar form."
        ]
    },
    "Chemistry": {
        "Topics": ["Organic Chemistry", "Atomic Structure", "Chemical Bonding", "Equilibrium", "Electrochemistry"],
        "Questions": [
            "Describe the mechanism of nucleophilic substitution.",
            "What are the four quantum numbers of an electron?",
            "Explain the difference between ionic and covalent bonding.",
            "State Le Chatelier's principle.",
            "Calculate the standard cell potential for a zinc-copper cell."
        ]
    },
    "History": {
        "Topics": ["French Revolution", "Industrial Revolution", "World War II", "Cold War", "Ancient Civilizations"],
        "Questions": [
            "Discuss the primary causes of the fall of the Bastille.",
            "How did the steam engine change manufacturing in the 19th century?",
            "Analyze the impact of the D-Day landings.",
            "Explain the significance of the Berlin Wall.",
            "Compare the governance of Athens and Sparta."
        ]
    }
}

# --- GENERATION LOGIC ---

async def generate_data():
    print("🚀 Initializing Realistic Data Generation...")
    
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. CLEANUP (Optional)
        user_count = (await session.exec(select(func.count(Users.user_id)))).first()
        if user_count > 0:
            print("⚠️ Database already contains data.")
            confirm = input("Do you want to purge all existing data first? (y/N): ")
            if confirm.lower() == 'y':
                print("🧹 Purging existing records...")
                from sqlalchemy import text
                await session.execute(text("TRUNCATE users, syllabus_master, grade_config, subjects, topics, question_bank CASCADE"))
                await session.commit()
            else:
                print("⏩ Skipping cleanup. Data will be appended.")

        # 2. CREATE STAFF (Users)
        print("👤 Provisioning Faculty and Administrators...")
        staff_members = []
        for name in TEACHER_NAMES:
            email = name.lower().replace(" ", ".").replace(".", "", 1) + "@school.edu"
            dept = random.choice(DEPARTMENTS)
            user = Users(
                full_name=name,
                email=email,
                password_hash=get_password_hash("password123"),
                department=dept,
                is_admin=False
            )
            session.add(user)
            staff_members.append(user)
        
        # Ensure at least one system admin
        stmt = select(Users).where(Users.email == "admin@school.edu")
        existing_admin = (await session.exec(stmt)).first()
        
        if not existing_admin:
            admin = Users(
                full_name="Head of IT",
                email="admin@school.edu",
                password_hash=get_password_hash("admin123"),
                department="Administration",
                is_admin=True
            )
            session.add(admin)
        else:
            admin = existing_admin
            
        await session.flush()

        # 3. CREATE CURRICULUM (Multi-Year)
        print("📚 Constructing Multi-Year Curriculum Hierarchy...")
        academic_years = ["2023-24", "2024-25", "2025-26"]
        all_topics = []
        all_subjects = []

        for year in academic_years:
            syllabus = SyllabusMaster(syllabus_name="Standard National Curriculum", academic_year=year)
            session.add(syllabus)
            await session.flush()

            # Grades 9-12 for each year
            for level in range(9, 13):
                grade = GradeConfig(syllabus_id=syllabus.syllabus_id, grade_level=level)
                session.add(grade)
                await session.flush()

                # Add subjects from our pool
                for sub_name, data in CURRICULUM_DATA.items():
                    subject = Subject(subject_name=sub_name, config_id=grade.config_id)
                    session.add(subject)
                    all_subjects.append(subject)
                    await session.flush()

                    # Add topics
                    for topic_name in data["Topics"]:
                        topic = Topic(topic_name=topic_name, subject_id=subject.subject_id)
                        session.add(topic)
                        all_topics.append(topic)
        
        await session.flush()

        # 4. ASSIGN ROLES (HODs & Coordinators)
        print("🔑 Assigning Security Roles and Hooks...")
        # Assign 3 HODs
        hod_candidates = random.sample(staff_members, 3)
        for i, sub_name in enumerate(list(CURRICULUM_DATA.keys())[:3]):
            session.add(HODLink(user_id=hod_candidates[i].user_id, subject_name=sub_name))
        
        # Assign 2 Grade Coordinators
        coord_candidates = random.sample(staff_members, 2)
        session.add(GradeCoordinatorLink(user_id=coord_candidates[0].user_id, grade_level=10))
        session.add(GradeCoordinatorLink(user_id=coord_candidates[1].user_id, grade_level=12))

        # Random Subject Assignments for all teachers
        for teacher in staff_members:
            assigned = random.sample(all_subjects, k=random.randint(2, 5))
            for sub in assigned:
                session.add(UserSubjectLink(user_id=teacher.user_id, subject_id=sub.subject_id))

        # 5. GENERATE QUESTIONS (Bulk)
        print("❓ Generating Assessment Content (Questions)...")
        question_count = 0
        for topic in all_topics:
            # Find matching subject data for realistic questions
            stmt = select(Subject).where(Subject.subject_id == topic.subject_id)
            sub_res = await session.exec(stmt)
            sub = sub_res.first()
            
            base_data = CURRICULUM_DATA.get(sub.subject_name, CURRICULUM_DATA["Physics"])
            
            # Generate 2-4 questions per topic
            for _ in range(random.randint(2, 4)):
                q_type = random.choice(list(QuestionType))
                difficulty = random.choice(list(DifficultyLevel))
                teacher = random.choice(staff_members)
                
                q_text = random.choice(base_data["Questions"])
                
                options = None
                ans_text = "Standard Solution provided in marking scheme."
                
                if q_type == QuestionType.MCQ:
                    options = {"A": "First plausible answer", "B": "Correct Answer", "C": "Common misconception", "D": "Distractor"}
                    ans_text = "B"
                elif q_type == QuestionType.TRUE_FALSE:
                    ans_text = random.choice(["True", "False"])
                elif q_type == QuestionType.MATCH_THE_FOLLOWING:
                    options = {"pairs": [{"left": "Term A", "right": "Definition A"}, {"left": "Term B", "right": "Definition B"}]}
                    ans_text = "Pairs matched"

                q = QuestionBank(
                    topic_id=topic.topic_id,
                    teacher_id=teacher.user_id,
                    question_text=f"{q_text} [Topic Ref: {topic.topic_name}]",
                    answer_text=ans_text,
                    options=options,
                    marks=random.choice([2, 5, 10]),
                    difficulty=difficulty,
                    q_type=q_type,
                    created_at=datetime.now() - timedelta(days=random.randint(0, 730))
                )
                session.add(q)
                question_count += 1

        await session.commit()
        print(f"✨ SUCCESS: Generated {len(staff_members)} staff, {len(academic_years)} years of curriculum, and {question_count} questions.")

if __name__ == "__main__":
    try:
        asyncio.run(generate_data())
    except KeyboardInterrupt:
        print("🛑 Generation aborted by user.")
