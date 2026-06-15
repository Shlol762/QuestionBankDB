import pytest
from httpx import AsyncClient
from src.db.models import Users, SyllabusMaster, GradeConfig, Subject, Topic, QuestionBank
from sqlmodel import select

STRONG_PASSWORD = "Password123!"

@pytest.mark.asyncio
async def test_question_view_and_modify_permissions(client: AsyncClient):
    """
    Test permissions for questions based on user roles (simple teacher vs HOD vs GC vs Admin).
    """
    # 1. Admin setup & initial login
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    admin_token = login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create new allowed subjects specifically for this test
    math_allowed_res = await client.post("/allowed-subjects/", json={"subject_name": "MathPermTest"}, headers=admin_headers)
    assert math_allowed_res.status_code in [201, 400]
    if math_allowed_res.status_code == 201:
        math_allowed_id = math_allowed_res.json()["allowed_subject_id"]
    else:
        # Fetch it
        all_allowed = await client.get("/allowed-subjects/", headers=admin_headers)
        math_allowed_id = next(s["allowed_subject_id"] for s in all_allowed.json()["items"] if s["subject_name"] == "MathPermTest")

    phys_allowed_res = await client.post("/allowed-subjects/", json={"subject_name": "PhysicsPermTest"}, headers=admin_headers)
    assert phys_allowed_res.status_code in [201, 400]
    if phys_allowed_res.status_code == 201:
        phys_allowed_id = phys_allowed_res.json()["allowed_subject_id"]
    else:
        all_allowed = await client.get("/allowed-subjects/", headers=admin_headers)
        phys_allowed_id = next(s["allowed_subject_id"] for s in all_allowed.json()["items"] if s["subject_name"] == "PhysicsPermTest")

    # 2. Setup curriculum (Syllabus, Grade 8, Grade 9, Subjects, Topics)
    # Syllabus
    syl_res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "PermSyllabus", "academic_year": "2026"}, headers=admin_headers)
    assert syl_res.status_code in [201, 400]
    if syl_res.status_code == 201:
        syllabus_id = syl_res.json()["syllabus_id"]
    else:
        all_syl = await client.get("/curriculum/syllabuses", headers=admin_headers)
        syllabus_id = next(s["syllabus_id"] for s in all_syl.json()["items"] if s["syllabus_name"] == "PermSyllabus")
    
    # Grade Configs (Grade 8 and Grade 9)
    g8_res = await client.post("/curriculum/grades", json={"syllabus_id": syllabus_id, "grade_level": 8}, headers=admin_headers)
    assert g8_res.status_code in [201, 400]
    if g8_res.status_code == 201:
        g8_config_id = g8_res.json()["config_id"]
    else:
        all_grades = await client.get("/curriculum/grades", headers=admin_headers)
        g8_config_id = next(g["config_id"] for g in all_grades.json()["items"] if g["grade_level"] == 8 and g["syllabus_id"] == syllabus_id)

    g9_res = await client.post("/curriculum/grades", json={"syllabus_id": syllabus_id, "grade_level": 9}, headers=admin_headers)
    assert g9_res.status_code in [201, 400]
    if g9_res.status_code == 201:
        g9_config_id = g9_res.json()["config_id"]
    else:
        all_grades = await client.get("/curriculum/grades", headers=admin_headers)
        g9_config_id = next(g["config_id"] for g in all_grades.json()["items"] if g["grade_level"] == 9 and g["syllabus_id"] == syllabus_id)

    # Subjects (MathPermTest in Grade 8, PhysicsPermTest in Grade 9)
    sub_math_res = await client.post("/curriculum/subjects", json={"config_id": g8_config_id, "subject_name": "MathPermTest", "allowed_subject_id": math_allowed_id}, headers=admin_headers)
    assert sub_math_res.status_code in [201, 400]
    if sub_math_res.status_code == 201:
        sub_math_id = sub_math_res.json()["subject_id"]
    else:
        all_subs = await client.get(f"/curriculum/subjects/{g8_config_id}", headers=admin_headers)
        sub_math_id = next(s["subject_id"] for s in all_subs.json()["items"] if s["subject_name"] == "MathPermTest")
    
    sub_phys_res = await client.post("/curriculum/subjects", json={"config_id": g9_config_id, "subject_name": "PhysicsPermTest", "allowed_subject_id": phys_allowed_id}, headers=admin_headers)
    assert sub_phys_res.status_code in [201, 400]
    if sub_phys_res.status_code == 201:
        sub_phys_id = sub_phys_res.json()["subject_id"]
    else:
        all_subs = await client.get(f"/curriculum/subjects/{g9_config_id}", headers=admin_headers)
        sub_phys_id = next(s["subject_id"] for s in all_subs.json()["items"] if s["subject_name"] == "PhysicsPermTest")

    # Topics (Algebra in MathPermTest, Mechanics in PhysicsPermTest)
    top_alg_res = await client.post("/curriculum/topics", json={"subject_id": sub_math_id, "topic_name": "AlgebraPermTest"}, headers=admin_headers)
    assert top_alg_res.status_code in [201, 400]
    if top_alg_res.status_code == 201:
        top_alg_id = top_alg_res.json()["topic_id"]
    else:
        all_tops = await client.get(f"/curriculum/topics/subject/{sub_math_id}", headers=admin_headers)
        top_alg_id = next(t["topic_id"] for t in all_tops.json()["items"] if t["topic_name"] == "AlgebraPermTest")
    
    top_mec_res = await client.post("/curriculum/topics", json={"subject_id": sub_phys_id, "topic_name": "MechanicsPermTest"}, headers=admin_headers)
    assert top_mec_res.status_code in [201, 400]
    if top_mec_res.status_code == 201:
        top_mec_id = top_mec_res.json()["topic_id"]
    else:
        all_tops = await client.get(f"/curriculum/topics/subject/{sub_phys_id}", headers=admin_headers)
        top_mec_id = next(t["topic_id"] for t in all_tops.json()["items"] if t["topic_name"] == "MechanicsPermTest")

    # 3. Create Users
    # Teacher A (teaches MathPermTest)
    await client.post("/auth/register", json={
        "full_name": "Teacher A", "email": "teachera@test.com", "password": STRONG_PASSWORD, "department": "Math", "subject_ids": [sub_math_id]
    }, headers=admin_headers)
    
    # Teacher B (teaches MathPermTest)
    await client.post("/auth/register", json={
        "full_name": "Teacher B", "email": "teacherb@test.com", "password": STRONG_PASSWORD, "department": "Math", "subject_ids": [sub_math_id]
    }, headers=admin_headers)

    # HOD Math (hod of allowed subject math_allowed_id, teaches MathPermTest and PhysicsPermTest)
    await client.post("/auth/register", json={
        "full_name": "HOD Math", "email": "hodmath@test.com", "password": STRONG_PASSWORD, "department": "Math", "hod_allowed_subject_ids": [math_allowed_id], "subject_ids": [sub_math_id, sub_phys_id]
    }, headers=admin_headers)

    # GC Grade 8 (coordinator of grade 8)
    await client.post("/auth/register", json={
        "full_name": "GC Grade 8", "email": "gc8@test.com", "password": STRONG_PASSWORD, "department": "Coordinators", "grade_levels": [8]
    }, headers=admin_headers)

    # 4. Login users and get tokens
    la = await client.post("/auth/login", data={"username": "teachera@test.com", "password": STRONG_PASSWORD})
    ta_headers = {"Authorization": f"Bearer {la.json()['access_token']}"}

    lb = await client.post("/auth/login", data={"username": "teacherb@test.com", "password": STRONG_PASSWORD})
    tb_headers = {"Authorization": f"Bearer {lb.json()['access_token']}"}

    lhod = await client.post("/auth/login", data={"username": "hodmath@test.com", "password": STRONG_PASSWORD})
    hod_headers = {"Authorization": f"Bearer {lhod.json()['access_token']}"}

    lgc = await client.post("/auth/login", data={"username": "gc8@test.com", "password": STRONG_PASSWORD})
    gc_headers = {"Authorization": f"Bearer {lgc.json()['access_token']}"}

    # 5. Teacher A and Teacher B create questions
    # Teacher A creates Q_A in MathPermTest (AlgebraPermTest)
    qa_res = await client.post("/questions/", json={
        "topic_ids": [top_alg_id], "question_text": "Question A by Teacher A", "answer_text": "Answer A", "marks": 5, "q_type": "Short Answer"
    }, headers=ta_headers)
    assert qa_res.status_code == 201
    qa_id = qa_res.json()["question_id"]

    # Teacher B creates Q_B in MathPermTest (AlgebraPermTest)
    qb_res = await client.post("/questions/", json={
        "topic_ids": [top_alg_id], "question_text": "Question B by Teacher B", "answer_text": "Answer B", "marks": 4, "q_type": "Short Answer"
    }, headers=tb_headers)
    assert qb_res.status_code == 201
    qb_id = qb_res.json()["question_id"]

    # Teacher B also tries to create Q_Phys in PhysicsPermTest (MechanicsPermTest) - should fail
    q_phys_fail = await client.post("/questions/", json={
        "topic_ids": [top_mec_id], "question_text": "Physics Question", "answer_text": "PhysAns", "marks": 5, "q_type": "Short Answer"
    }, headers=tb_headers)
    assert q_phys_fail.status_code == 403

    # HOD Math creates a Physics question
    q_phys_res = await client.post("/questions/", json={
        "topic_ids": [top_mec_id], "question_text": "Physics Question by HOD Math", "answer_text": "PhysAns", "marks": 5, "q_type": "Short Answer"
    }, headers=hod_headers)
    assert q_phys_res.status_code == 201
    q_phys_id = q_phys_res.json()["question_id"]

    # 6. Test list visibility
    # Simple Teacher A should only see Q_A in list
    list_ta = await client.get("/questions/", headers=ta_headers)
    ta_items = list_ta.json()["items"]
    assert any(q["question_id"] == qa_id for q in ta_items)
    assert not any(q["question_id"] == qb_id for q in ta_items)
    assert not any(q["question_id"] == q_phys_id for q in ta_items)

    # Simple Teacher B should only see Q_B in list
    list_tb = await client.get("/questions/", headers=tb_headers)
    tb_items = list_tb.json()["items"]
    assert any(q["question_id"] == qb_id for q in tb_items)
    assert not any(q["question_id"] == qa_id for q in tb_items)

    # HOD Math should see Math questions (Q_A and Q_B) because they are HOD of Math,
    # and their own Physics question (q_phys_id) because they authored it.
    list_hod = await client.get("/questions/", headers=hod_headers)
    hod_items = list_hod.json()["items"]
    assert any(q["question_id"] == qa_id for q in hod_items)
    assert any(q["question_id"] == qb_id for q in hod_items)
    assert any(q["question_id"] == q_phys_id for q in hod_items)

    # Grade Coordinator of Grade 8 should see Math questions (Q_A and Q_B) because they are under Grade 8,
    # but not Physics (q_phys_id) because Physics is Grade 9.
    list_gc = await client.get("/questions/", headers=gc_headers)
    gc_items = list_gc.json()["items"]
    assert any(q["question_id"] == qa_id for q in gc_items)
    assert any(q["question_id"] == qb_id for q in gc_items)
    assert not any(q["question_id"] == q_phys_id for q in gc_items)

    # 7. Test Get/Update/Delete permissions on specific questions
    # Teacher A gets own question -> 200
    get_own = await client.get(f"/questions/{qa_id}", headers=ta_headers)
    assert get_own.status_code == 200
    
    # Teacher A gets Teacher B's question -> 403
    get_other = await client.get(f"/questions/{qb_id}", headers=ta_headers)
    assert get_other.status_code == 403

    # Teacher A updates Teacher B's question -> 403
    patch_other = await client.patch(f"/questions/{qb_id}", json={"question_text": "Hacked"}, headers=ta_headers)
    assert patch_other.status_code == 403

    # Teacher A deletes Teacher B's question -> 403
    delete_other = await client.delete(f"/questions/{qb_id}", headers=ta_headers)
    assert delete_other.status_code == 403

    # HOD Math gets Teacher B's question -> 200
    get_hod = await client.get(f"/questions/{qb_id}", headers=hod_headers)
    assert get_hod.status_code == 200

    # HOD Math updates Teacher B's question -> 200
    patch_hod = await client.patch(f"/questions/{qb_id}", json={"question_text": "Updated by HOD"}, headers=hod_headers)
    assert patch_hod.status_code == 200

    # HOD Math gets HOD's own Physics question -> 200
    get_hod_phys = await client.get(f"/questions/{q_phys_id}", headers=hod_headers)
    assert get_hod_phys.status_code == 200

    # Grade Coordinator gets Teacher A's question -> 200
    get_gc = await client.get(f"/questions/{qa_id}", headers=gc_headers)
    assert get_gc.status_code == 200

    # Grade Coordinator updates Teacher A's question -> 200
    patch_gc = await client.patch(f"/questions/{qa_id}", json={"question_text": "Updated by GC"}, headers=gc_headers)
    assert patch_gc.status_code == 200

    # GC tries to get/update/delete Physics question (Grade 9, unassigned to GC) -> 403
    get_gc_phys = await client.get(f"/questions/{q_phys_id}", headers=gc_headers)
    assert get_gc_phys.status_code == 403
    
    patch_gc_phys = await client.patch(f"/questions/{q_phys_id}", json={"question_text": "GC hack"}, headers=gc_headers)
    assert patch_gc_phys.status_code == 403

    # 8. Test Dashboard Stats endpoint
    # Teacher A stats: should show total_questions = 1 (only Q_A)
    stats_ta = await client.get("/stats/", headers=ta_headers)
    assert stats_ta.status_code == 200
    assert stats_ta.json()["total_questions"] == 1

    # Teacher B stats: should show total_questions = 1 (only Q_B)
    stats_tb = await client.get("/stats/", headers=tb_headers)
    assert stats_tb.status_code == 200
    assert stats_tb.json()["total_questions"] == 1

    # HOD Math stats: should show total_questions = 3 (Q_A, Q_B, Q_Phys)
    stats_hod = await client.get("/stats/", headers=hod_headers)
    assert stats_hod.status_code == 200
    assert stats_hod.json()["total_questions"] == 3

    # GC stats: should show total_questions = 2 (Q_A, Q_B in Grade 8)
    stats_gc = await client.get("/stats/", headers=gc_headers)
    assert stats_gc.status_code == 200
    assert stats_gc.json()["total_questions"] == 2
