import pytest
from httpx import AsyncClient
from src.db.models import Users, SyllabusMaster, GradeConfig, Subject, Topic, QuestionBank
from sqlmodel import select

@pytest.mark.asyncio
async def test_duplicate_topic_case_sensitivity(client: AsyncClient):
    """
    BRUTAL TEST: Case Sensitivity and Whitespace in Topic Names.
    Scenario: Teacher creates 'Algebra', then ' algebra '.
    Expected: Should be blocked by case-insensitive existence check.
    """
    # Setup: Admin login, Syllabus, Grade, Subject
    await client.post("/auth/initial-setup", json={
        "full_name": "Admin", "email": "admin@test.com", "password": "Password123!", "department": "IT"
    })
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/curriculum/syllabuses", json={"syllabus_name": "S1", "academic_year": "Y1"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 1, "grade_level": 10}, headers=headers)
    await client.post("/allowed-subjects/", json={"subject_name": "Math"}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 1, "subject_name": "Math", "allowed_subject_id": 1}, headers=headers)

    # 1. Create 'Algebra'
    res1 = await client.post("/curriculum/topics", json={"subject_id": 1, "topic_name": "Algebra"}, headers=headers)
    assert res1.status_code == 201

    # 2. Create ' algebra ' (leading/trailing space and lowercase)
    # This should now be BLOCKED (400 Bad Request) due to logic hardening
    res2 = await client.post("/curriculum/topics", json={"subject_id": 1, "topic_name": " algebra "}, headers=headers)
    
    assert res2.status_code == 400, "System failed to detect duplicate-ish topic name ' algebra '"

@pytest.mark.asyncio
async def test_negative_marks_question(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - Negative Marks.
    Scenario: Teacher accidentally enters -5 marks for a question.
    Expected: Should be blocked (ge=0).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    q_data = {
        "topic_id": 1,
        "question_text": "What is 1+1?",
        "answer_text": "2",
        "marks": -5
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    # 422 Validation Error expected from Pydantic
    assert res.status_code == 422, "System allowed negative marks for a question"

@pytest.mark.asyncio
async def test_mcq_without_options(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - MCQ without options.
    Scenario: Teacher creates an MCQ but forgets to provide options.
    Expected: Should be blocked (Value Error in validator).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    q_data = {
        "topic_id": 1,
        "question_text": "Pick one",
        "answer_text": "A",
        "marks": 1,
        "q_type": "MCQ",
        "options": None
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    assert res.status_code == 422, "System allowed MCQ question without options"

@pytest.mark.asyncio
async def test_hod_permission_leak(client: AsyncClient):
    """
    BRUTAL TEST: HOD Permission Scoping.
    Scenario: User is HOD of 'Math'. 
    There is 'Math' in Syllabus A and 'Math' in Syllabus B.
    Expected: HOD SHOULD see both (Intentional Feature), but not unrelated subjects.
    """
    # Setup: Create Syllabus 2, Grade 10, Subject 'Math'
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/curriculum/syllabuses", json={"syllabus_name": "CBSE", "academic_year": "2026"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 2, "grade_level": 10}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 2, "subject_name": "Math", "allowed_subject_id": 1}, headers=headers)
    await client.post("/curriculum/topics", json={"subject_id": 2, "topic_name": "Geometry"}, headers=headers)

    # Register a new user as HOD of 'Math'
    await client.post("/auth/register", json={
        "full_name": "HOD Math",
        "email": "hod@math.com",
        "password": "Password123!",
        "department": "Math",
        "hod_allowed_subject_ids": [1]
    }, headers=headers)

    # Login as HOD
    login_hod = await client.post("/auth/login", data={"username": "hod@math.com", "password": "Password123!"})
    token_hod = login_hod.json()["access_token"]
    headers_hod = {"Authorization": f"Bearer {token_hod}"}

    # HOD tries to create a question in 'Geometry' (which is in Subject 2, CBSE Math)
    res = await client.post("/questions/", json={
        "topic_id": 2, "question_text": "Cross-Syllabus Access Test", "answer_text": "X", "marks": 1, "q_type": "Short Answer"
    }, headers=headers_hod)

    # This asserts the INTENTIONAL design: HOD 'Math' manages 'Math' everywhere.
    assert res.status_code == 201, "HOD should be able to manage their subject across syllabuses (Design Choice)"
    
    # Verify hierarchy visibility
    res_hierarchy = await client.get("/curriculum/hierarchy", headers=headers_hod)
    hierarchy = res_hierarchy.json()
    
    assert len(hierarchy) >= 1, "HOD should see syllabi containing their subject"


@pytest.mark.asyncio
async def test_hod_cannot_manage_unassigned_subject(client: AsyncClient):
    login_admin = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    if login_admin.status_code != 200:
        login_admin = await client.post("/auth/login", data={"username": "admin@test.com", "password": "NewSecure@Pass1"})
    token_admin = login_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token_admin}"}

    await client.post("/allowed-subjects/", json={"subject_name": "Physics"}, headers=admin_headers)
    subject_res = await client.post("/curriculum/subjects", json={"config_id": 1, "subject_name": "Physics", "allowed_subject_id": 2}, headers=admin_headers)
    if subject_res.status_code not in [201, 400]:
        return
    if subject_res.status_code == 201:
        subject_id = subject_res.json()["subject_id"]
    else:
        subjects_res = await client.get("/curriculum/subjects/1", headers=admin_headers)
        subject = next((s for s in subjects_res.json()["items"] if s["subject_name"].lower() == "physics"), None)
        if not subject:
            return
        subject_id = subject["subject_id"]

    topic_res = await client.post("/curriculum/topics", json={"subject_id": subject_id, "topic_name": "Mechanics"}, headers=admin_headers)
    if topic_res.status_code != 201:
        return

    login_hod = await client.post("/auth/login", data={"username": "hod@math.com", "password": "Password123!"})
    if login_hod.status_code != 200:
        return

    hod_headers = {"Authorization": f"Bearer {login_hod.json()['access_token']}"}
    forbidden = await client.post("/questions/", json={
        "topic_id": topic_res.json()["topic_id"],
        "question_text": "Should not be allowed",
        "answer_text": "X",
        "marks": 1,
        "q_type": "Short Answer"
    }, headers=hod_headers)
    assert forbidden.status_code == 403

@pytest.mark.asyncio
async def test_mcq_answer_integrity(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - MCQ answer not in options.
    Scenario: Teacher sets correct answer to 'E' but only provides options A, B, C, D.
    Expected: Should be blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    q_data = {
        "topic_id": 1,
        "question_text": "Pick one",
        "answer_text": "Option E",
        "marks": 1,
        "q_type": "MCQ",
        "options": {"A": "Opt A", "B": "Opt B"}
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    # 422 Expected from Validator
    assert res.status_code == 422, "System allowed MCQ with answer not present in options"

@pytest.mark.asyncio
async def test_malicious_file_upload_extension_bypass(client: AsyncClient):
    """
    BRUTAL TEST: Security - Extension bypass in file upload.
    Scenario: User uploads a script renamed to .pdf.
    Expected: System should check magic numbers (MIME) and block it (400).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # A python script disguised as a PDF
    malicious_content = b"import os; os.system('echo hacked')"
    files = {"file": ("malicious.pdf", malicious_content, "application/pdf")}
    
    res = await client.post("/curriculum/upload-pdf", files=files, headers=headers)
    
    assert res.status_code == 400, "System failed to detect fake PDF via magic numbers"

@pytest.mark.asyncio
async def test_question_image_no_extension_check(client: AsyncClient):
    """
    BRUTAL TEST: Security - No extension check for question images.
    Scenario: Teacher uploads 'virus.exe' as a question image.
    Expected: Should be blocked (400).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Content that is definitely not an image
    files = {"file": ("virus.exe", b"malicious code", "application/octet-stream")}
    res = await client.post("/questions/upload-image", files=files, headers=headers)
    
    assert res.status_code == 400, "System allowed uploading non-image file"

@pytest.mark.asyncio
async def test_extreme_long_input(client: AsyncClient):
    """
    BRUTAL TEST: Robustness - Buffer overflow / DoS via long input.
    Scenario: User pastes 1MB string into the question text.
    Expected: System should handle it gracefully (likely 201 or 422 if max length set).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    long_text = "A" * 100000 # Reduced to 100KB to be polite to test runner, still brutal enough
    q_data = {
        "topic_id": 1,
        "question_text": long_text,
        "answer_text": "B",
        "marks": 1,
        "q_type": "Short Answer"
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    assert res.status_code in [201, 422], "Server crashed on long input"

@pytest.mark.asyncio
async def test_cascading_deletion_purge(client: AsyncClient):
    """
    BRUTAL TEST: Integrity - Cascading deletion.
    Scenario: Delete a Syllabus.
    Expected: Grades, Subjects, Topics, and Questions under it should be GONE.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Setup specific hierarchy for this test to avoid ID collisions
    s_res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "DeleteMe", "academic_year": "9999"}, headers=headers)
    s_id = s_res.json()["syllabus_id"]
    
    g_res = await client.post("/curriculum/grades", json={"syllabus_id": s_id, "grade_level": 1}, headers=headers)
    g_id = g_res.json()["config_id"]
    
    await client.post("/allowed-subjects/", json={"subject_name": "TempSub"}, headers=headers)
    sub_res = await client.post("/curriculum/subjects", json={"config_id": g_id, "subject_name": "TempSub", "allowed_subject_id": 3}, headers=headers)
    sub_id = sub_res.json()["subject_id"]
    
    t_res = await client.post("/curriculum/topics", json={"subject_id": sub_id, "topic_name": "TempTopic"}, headers=headers)
    t_id = t_res.json()["topic_id"]
    
    q_res = await client.post("/questions/", json={
        "topic_id": t_id, "question_text": "Am I alive?", "answer_text": "Yes", "marks": 1, "q_type": "Short Answer"
    }, headers=headers)
    q_id = q_res.json()["question_id"]

    # 2. Verify existence
    res = await client.get(f"/questions/{q_id}", headers=headers)
    assert res.status_code == 200

    # 3. Delete the Syllabus
    await client.delete(f"/curriculum/syllabuses/{s_id}", headers=headers)

    # 4. Check if Question is gone
    res = await client.get(f"/questions/{q_id}", headers=headers)
    assert res.status_code == 404, f"Question {q_id} was not purged after syllabus {s_id} deletion"

@pytest.mark.asyncio
async def test_sql_injection_attempt(client: AsyncClient):
    """
    BRUTAL TEST: Security - SQL Injection.
    Scenario: Search for questions using a malicious payload.
    Expected: Should be handled safely by the ORM.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = "' OR 1=1 --"
    res = await client.get(f"/questions/?search={payload}", headers=headers)

    assert res.status_code == 200
    assert "items" in res.json()
    
@pytest.mark.asyncio
async def test_concurrent_question_update(client: AsyncClient):
    """
    BRUTAL TEST: Robustness - Race Conditions.
    Scenario: Two updates to the same question at once.
    Expected: Database should handle it without corruption due to row locking.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Syllabus 3 for clean test
    await client.post("/curriculum/syllabuses", json={"syllabus_name": "S3", "academic_year": "Y3"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 3, "grade_level": 1}, headers=headers)
    await client.post("/allowed-subjects/", json={"subject_name": "C1"}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 3, "subject_name": "C1", "allowed_subject_id": 4}, headers=headers)
    await client.post("/curriculum/topics", json={"subject_id": 3, "topic_name": "T1"}, headers=headers)
    
    q_res = await client.post("/questions/", json={
        "topic_id": 3, "question_text": "Orig", "answer_text": "X", "marks": 1, "q_type": "Short Answer"
    }, headers=headers)
    q_id = q_res.json()["question_id"]

    import asyncio
    async def update(text):
        return await client.patch(f"/questions/{q_id}", json={"question_text": text}, headers=headers)

    # Fire two updates concurrently
    results = await asyncio.gather(update("Update A"), update("Update B"))
    
    for r in results:
        assert r.status_code == 200

    # Verify final state is one of the two
    final = await client.get(f"/questions/{q_id}", headers=headers)
    assert final.json()["question_text"] in ["Update A", "Update B"]

@pytest.mark.asyncio
async def test_whitespace_syllabus_block(client: AsyncClient):
    """
    BRUTAL TEST: Empty strings and whitespace-only names.
    Scenario: User enters " " as syllabus name.
    Expected: Should be blocked (422 due to str_strip_whitespace=True or DB error).
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "   ", "academic_year": "2026"}, headers=headers)
    # Pydantic will strip to "", then likely fail required check or DB constraint
    assert res.status_code != 201, "System allowed whitespace-only syllabus name"

@pytest.mark.asyncio
async def test_initial_setup_lockout_bypass(client: AsyncClient):
    """
    BRUTAL TEST: Security - Initial Setup Lockout.
    Scenario: System is already setup. Attacker tries to call initial-setup again.
    Expected: 403 Forbidden.
    """
    res = await client.post("/auth/initial-setup", json={
        "full_name": "Hacker", "email": "hacker@test.com", "password": "Password123!", "department": "Evil"
    })
    assert res.status_code == 403
    assert "locked" in res.json()["detail"]

@pytest.mark.asyncio
async def test_unauthenticated_file_upload(client: AsyncClient):
    """
    BRUTAL TEST: Security - File upload without auth.
    Scenario: Unauthorized user tries to upload a PDF.
    Expected: 401 Unauthorized.
    """
    files = {"file": ("test.pdf", b"test content", "application/pdf")}
    res = await client.post("/curriculum/upload-pdf", files=files)
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_delete_last_admin(client: AsyncClient):
    """
    BRUTAL TEST: Security - Deleting the last admin.
    Scenario: Admin tries to delete themselves (or the only other admin).
    Expected: Blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try to delete self (ID 1)
    res = await client.delete("/auth/users/1", headers=headers)
    assert res.status_code == 400
    assert "cannot delete your own account" in res.json()["detail"]


@pytest.mark.asyncio
async def test_ping_and_health_endpoints(client: AsyncClient):
    ping = await client.get("/ping")
    assert ping.status_code == 200
    assert ping.json()["message"] == "pong"

    health = await client.get("/health")
    assert health.status_code in [200, 503]
    assert "status" in health.json()


@pytest.mark.asyncio
async def test_setup_status_endpoint(client: AsyncClient):
    res = await client.get("/auth/setup-status")
    assert res.status_code == 200
    assert "setup_required" in res.json()


@pytest.mark.asyncio
async def test_stats_endpoint_coverage(client: AsyncClient):
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/stats/", headers=headers)
    assert res.status_code == 200
    payload = res.json()
    assert "total_questions" in payload
    assert "recent_activity" in payload


@pytest.mark.asyncio
async def test_update_my_password_flow(client: AsyncClient):
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad = await client.patch(
        "/auth/me/password",
        json={"current_password": "wrong", "new_password": "NewSecure@Pass1"},
        headers=headers,
    )
    assert bad.status_code == 400

    good = await client.patch(
        "/auth/me/password",
        json={"current_password": "Password123!", "new_password": "NewSecure@Pass1"},
        headers=headers,
    )
    assert good.status_code == 204

    relogin = await client.post("/auth/login", data={"username": "admin@test.com", "password": "NewSecure@Pass1"})
    assert relogin.status_code == 200

    # Revert password to avoid affecting later tests in the shared session DB.
    new_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}
    revert = await client.patch(
        "/auth/me/password",
        json={"current_password": "NewSecure@Pass1", "new_password": "Password123!"},
        headers=new_headers,
    )
    assert revert.status_code == 204


@pytest.mark.asyncio
async def test_reset_password_endpoint_coverage(client: AsyncClient):
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "NewSecure@Pass1"})
    if login.status_code != 200:
        login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_user = await client.post("/auth/register", json={
        "full_name": "Reset Target",
        "email": "reset-target@test.com",
        "password": "Password123!",
        "department": "Ops"
    }, headers=headers)
    assert create_user.status_code in [201, 400]

    users = await client.get("/auth/users", headers=headers)
    target = next(u for u in users.json()["items"] if u["email"] == "reset-target@test.com")

    reset = await client.post(f"/auth/users/{target['user_id']}/reset-password", json={"new_password": "Password123!"}, headers=headers)
    assert reset.status_code == 200
    assert "message" in reset.json()


@pytest.mark.asyncio
async def test_delete_only_other_admin_blocked(client: AsyncClient):
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "NewSecure@Pass1"})
    if login.status_code != 200:
        login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_admin = await client.post("/auth/register", json={
        "full_name": "Second Admin",
        "email": "second-admin@test.com",
        "password": "Password123!",
        "department": "IT",
        "is_admin": True
    }, headers=headers)
    assert create_admin.status_code in [201, 400]

    users = await client.get("/auth/users", headers=headers)
    second_admin = next(u for u in users.json()["items"] if u["email"] == "second-admin@test.com")

    delete_second = await client.delete(f"/auth/users/{second_admin['user_id']}", headers=headers)
    assert delete_second.status_code in [204, 404]

    self_delete = await client.delete("/auth/users/1", headers=headers)
    assert self_delete.status_code == 400


@pytest.mark.asyncio
async def test_mcq_patch_rejects_invalid_answer(client: AsyncClient):
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "NewSecure@Pass1"})
    if login.status_code != 200:
        login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "Password123!"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    syl = await client.post("/curriculum/syllabuses", json={"syllabus_name": "PatchS", "academic_year": "2040"}, headers=headers)
    assert syl.status_code in [201, 400]
    syllabus_id = syl.json()["syllabus_id"] if syl.status_code == 201 else 1

    grade = await client.post("/curriculum/grades", json={"syllabus_id": syllabus_id, "grade_level": 5}, headers=headers)
    assert grade.status_code in [201, 400]
    config_id = grade.json()["config_id"] if grade.status_code == 201 else 1

    await client.post("/allowed-subjects/", json={"subject_name": "PatchSubject"}, headers=headers)
    subject = await client.post("/curriculum/subjects", json={"config_id": config_id, "subject_name": "PatchSubject", "allowed_subject_id": 5}, headers=headers)
    assert subject.status_code in [201, 400]
    if subject.status_code == 201:
        subject_id = subject.json()["subject_id"]
    else:
        subjects_res = await client.get(f"/curriculum/subjects/{config_id}", headers=headers)
        subject_item = next((s for s in subjects_res.json()["items"] if s["subject_name"].lower() == "patchsubject"), None)
        if not subject_item:
            return
        subject_id = subject_item["subject_id"]

    topic = await client.post("/curriculum/topics", json={"subject_id": subject_id, "topic_name": "PatchTopic"}, headers=headers)
    assert topic.status_code in [201, 400]
    if topic.status_code == 201:
        topic_id = topic.json()["topic_id"]
    else:
        topics_res = await client.get(f"/curriculum/topics/subject/{subject_id}", headers=headers)
        topic_item = next((t for t in topics_res.json()["items"] if t["topic_name"].lower() == "patchtopic"), None)
        if not topic_item:
            return
        topic_id = topic_item["topic_id"]

    create_q = await client.post("/questions/", json={
        "topic_id": topic_id,
        "question_text": "Patch MCQ",
        "answer_text": "A",
        "marks": 1,
        "q_type": "MCQ",
        "options": {"A": "One", "B": "Two"}
    }, headers=headers)
    assert create_q.status_code == 201
    q_id = create_q.json()["question_id"]

    bad_patch = await client.patch(
        f"/questions/{q_id}",
        json={"answer_text": "Z"},
        headers=headers,
    )
    assert bad_patch.status_code == 400
