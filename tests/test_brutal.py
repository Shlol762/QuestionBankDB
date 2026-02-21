import pytest
from httpx import AsyncClient
from src.db.models import Users, SyllabusMaster, GradeConfig, Subject, Topic, QuestionBank
from sqlmodel import select

@pytest.mark.asyncio
async def test_duplicate_topic_case_sensitivity(client: AsyncClient):
    """
    BRUTAL TEST: Case Sensitivity and Whitespace in Topic Names.
    Scenario: Teacher creates 'Algebra', then ' algebra '.
    Expected: Should probably be blocked to prevent messy data.
    """
    # Setup: Admin login, Syllabus, Grade, Subject
    await client.post("/auth/initial-setup", json={
        "full_name": "Admin", "email": "admin@test.com", "password": "pass", "department": "IT"
    })
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/curriculum/syllabuses", json={"syllabus_name": "S1", "academic_year": "Y1"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 1, "grade_level": 10}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 1, "subject_name": "Math"}, headers=headers)

    # 1. Create 'Algebra'
    res1 = await client.post("/curriculum/topics", json={"subject_id": 1, "topic_name": "Algebra"}, headers=headers)
    assert res1.status_code == 201

    # 2. Create ' algebra ' (leading/trailing space and lowercase)
    res2 = await client.post("/curriculum/topics", json={"subject_id": 1, "topic_name": " algebra "}, headers=headers)
    
    # If this passes (201), it's a 'logical error' in our book because it creates duplicate-ish data.
    # A robust system should trim and case-fold.
    assert res2.status_code != 201, "System allowed duplicate-ish topic name ' algebra '"

@pytest.mark.asyncio
async def test_negative_marks_question(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - Negative Marks.
    Scenario: Teacher accidentally enters -5 marks for a question.
    Expected: Should be blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    q_data = {
        "topic_id": 1,
        "question_text": "What is 1+1?",
        "answer_text": "2",
        "marks": -5
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    assert res.status_code != 201, "System allowed negative marks for a question"

@pytest.mark.asyncio
async def test_mcq_without_options(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - MCQ without options.
    Scenario: Teacher creates an MCQ but forgets to provide options.
    Expected: Should be blocked if q_type is MCQ.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
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
    
    assert res.status_code != 201, "System allowed MCQ question without options"

@pytest.mark.asyncio
async def test_hod_permission_leak(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - HOD Permission Leak across Syllabuses.
    Scenario: User is HOD of 'Math'. 
    There is 'Math' in ICSE 2026 and 'Math' in CBSE 2026.
    Expected: HOD should only see what they are assigned to, 
    but current logic uses 'subject_name' string matching.
    """
    # Setup: Create Syllabus 2, Grade 10, Subject 'Math'
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/curriculum/syllabuses", json={"syllabus_name": "CBSE", "academic_year": "2026"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 2, "grade_level": 10}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 2, "subject_name": "Math"}, headers=headers)
    await client.post("/curriculum/topics", json={"subject_id": 2, "topic_name": "Geometry"}, headers=headers)

    # Register a new user as HOD of 'Math'
    # NOTE: The current system allows assigning HOD by subject name.
    await client.post("/auth/register", json={
        "full_name": "HOD Math",
        "email": "hod@math.com",
        "password": "pass",
        "department": "Math",
        "hod_subject_names": ["Math"]
    }, headers=headers)

    # Login as HOD
    login_hod = await client.post("/auth/login", data={"username": "hod@math.com", "password": "pass"})
    token_hod = login_hod.json()["access_token"]
    headers_hod = {"Authorization": f"Bearer {token_hod}"}

    # HOD tries to create a question in 'Geometry' (which is in Subject 2, CBSE Math)
    # If they were intended to be HOD of ALL Math, this passes.
    # But usually, HODs are per-curriculum. Our current model uses subject_name.
    # Let's see if they can access it.
    res = await client.post("/questions/", json={
        "topic_id": 2, "question_text": "Leak test", "answer_text": "X", "marks": 1
    }, headers=headers_hod)

    # In this project, 'subject_name' matching is used. 
    # If the user intended HOD to be global for a name, this is 'correct' but dangerous.
    # If they intended it to be specific, it's a leak. 
    # Let's flag it if it's too broad.
    assert res.status_code == 201, "HOD should be able to manage their subject"
    
    # Now the BRUTAL part: Does HOD Math see CBSE Math (Subject 2) when they were maybe intended for ICSE (Subject 1)?
    res_hierarchy = await client.get("/curriculum/hierarchy", headers=headers_hod)
    hierarchy = res_hierarchy.json()
    
    # If they see both Syllabuses, it's a leak if the intention was curriculum-specific.
    assert len(hierarchy) == 2, "HOD of 'Math' name automatically got access to all 'Math' subjects in all syllabuses"

@pytest.mark.asyncio
async def test_mcq_answer_integrity(client: AsyncClient):
    """
    BRUTAL TEST: Logical Error - MCQ answer not in options.
    Scenario: Teacher sets correct answer to 'E' but only provides options A, B, C, D.
    Expected: Should be blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
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
    
    assert res.status_code != 201, "System allowed MCQ with answer not present in options"

@pytest.mark.asyncio
async def test_malicious_file_upload_extension_bypass(client: AsyncClient):
    """
    BRUTAL TEST: Security - Extension bypass in file upload.
    Scenario: User uploads a script renamed to .pdf.
    Expected: System should check content, not just extension.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # A python script disguised as a PDF
    malicious_content = b"import os; os.system('echo hacked')"
    files = {"file": ("malicious.pdf", malicious_content, "application/pdf")}
    
    res = await client.post("/curriculum/upload-pdf", files=files, headers=headers)
    
    # This might pass if only extension is checked. 
    # In a school, kids are smart; they will try this.
    # We expect a failure if the system is truly brutal.
    assert res.status_code != 200, "System allowed non-PDF content disguised as PDF"

@pytest.mark.asyncio
async def test_question_image_no_extension_check(client: AsyncClient):
    """
    BRUTAL TEST: Security - No extension check for question images.
    Scenario: Teacher uploads 'virus.exe' as a question image.
    Expected: Should be blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    files = {"file": ("virus.exe", b"malicious code", "application/octet-stream")}
    res = await client.post("/questions/upload-image", files=files, headers=headers)
    
    assert res.status_code != 200, "System allowed uploading .exe as question image"

@pytest.mark.asyncio
async def test_extreme_long_input(client: AsyncClient):
    """
    BRUTAL TEST: Robustness - Buffer overflow / DoS via long input.
    Scenario: User pastes the entire works of Shakespeare into the question text.
    Expected: System should handle it or have a limit.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    long_text = "A" * 1000000 # 1MB string
    q_data = {
        "topic_id": 1,
        "question_text": long_text,
        "answer_text": "B",
        "marks": 1
    }
    res = await client.post("/questions/", json=q_data, headers=headers)
    
    # If it takes 201, it's 'fine' for functionality but maybe bad for DB performance.
    # We check if it crashes the server.
    assert res.status_code in [201, 400, 413], "Server crashed or failed to handle large input"

@pytest.mark.asyncio
async def test_cascading_deletion_purge(client: AsyncClient):
    """
    BRUTAL TEST: Integrity - Cascading deletion.
    Scenario: Delete a Syllabus.
    Expected: Grades, Subjects, Topics, and Questions under it should be GONE.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Verify existence (assuming IDs from previous tests)
    res = await client.get("/questions/1", headers=headers)
    assert res.status_code == 200

    # 2. Delete Syllabus 1
    await client.delete("/curriculum/syllabuses/1", headers=headers)

    # 3. Check if Question 1 is gone
    res = await client.get("/questions/1", headers=headers)
    assert res.status_code == 404, "Question was not purged after syllabus deletion"

@pytest.mark.asyncio
async def test_sql_injection_attempt(client: AsyncClient):
    """
    BRUTAL TEST: Security - SQL Injection.
    Scenario: Search for questions using a malicious payload.
    Expected: Should be handled safely by the ORM.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = "' OR 1=1 --"
    res = await client.get(f"/questions/?search={payload}", headers=headers)
    
    # If it returns all questions (more than it should), it's a leak.
    # We just ensure it doesn't crash and returns a valid (likely empty) list.
    assert res.status_code == 200
    assert isinstance(res.json(), list)

@pytest.mark.asyncio
async def test_concurrent_question_update(client: AsyncClient):
    """
    BRUTAL TEST: Robustness - Race Conditions.
    Scenario: Two updates to the same question at once.
    Expected: Database should handle it without corruption.
    """
    # Create a fresh question first
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Syllabus 3 etc for clean test
    await client.post("/curriculum/syllabuses", json={"syllabus_name": "S3", "academic_year": "Y3"}, headers=headers)
    await client.post("/curriculum/grades", json={"syllabus_id": 3, "grade_level": 1}, headers=headers)
    await client.post("/curriculum/subjects", json={"config_id": 3, "subject_name": "C1"}, headers=headers)
    await client.post("/curriculum/topics", json={"subject_id": 3, "topic_name": "T1"}, headers=headers)
    
    q_res = await client.post("/questions/", json={
        "topic_id": 3, "question_text": "Orig", "answer_text": "X", "marks": 1
    }, headers=headers)
    q_id = q_res.json()["question_id"]

    import asyncio
    # Fire two updates simultaneously
    async def update(text):
        return await client.patch(f"/questions/{q_id}", json={"question_text": text}, headers=headers)

    results = await asyncio.gather(update("Update A"), update("Update B"))
    
    for r in results:
        assert r.status_code == 200

    # Verify final state is one of the two
    final = await client.get(f"/questions/{q_id}", headers=headers)
    assert final.json()["question_text"] in ["Update A", "Update B"]

    """
    BRUTAL TEST: Empty strings and whitespace-only names.
    Scenario: User enters " " as syllabus name.
    Expected: Should be blocked.
    """
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "   ", "academic_year": "2026"}, headers=headers)
    assert res.status_code != 201, "System allowed whitespace-only syllabus name"

@pytest.mark.asyncio
async def test_initial_setup_lockout_bypass(client: AsyncClient):
    """
    BRUTAL TEST: Security - Initial Setup Lockout.
    Scenario: System is already setup. Attacker tries to call initial-setup again.
    Expected: 403 Forbidden.
    """
    res = await client.post("/auth/initial-setup", json={
        "full_name": "Hacker", "email": "hacker@test.com", "password": "pass", "department": "Evil"
    })
    assert res.status_code == 403
    assert "already configured" in res.json()["detail"]

@pytest.mark.asyncio
async def test_unauthenticated_file_upload(client: AsyncClient):
    """
    BRUTAL TEST: Security - File upload without auth.
    Scenario: Unauthorized user tries to upload a PDF.
    Expected: 401 Unauthorized.
    """
    # Simulating a file upload
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
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Try to delete self (ID 1)
    res = await client.delete("/auth/users/1", headers=headers)
    assert res.status_code == 400
    assert "cannot delete your own account" in res.json()["detail"]
