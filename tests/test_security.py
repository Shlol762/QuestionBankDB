import pytest
from httpx import AsyncClient
from src.db.auth_utils import create_access_token

@pytest.mark.asyncio
async def test_access_protected_route_without_token(client: AsyncClient):
    """Scenario: Unauthorized user tries to access question bank."""
    response = await client.get("/questions/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

@pytest.mark.asyncio
async def test_access_with_invalid_token(client: AsyncClient):
    """Scenario: Hacker tries to use a fake/tampered token."""
    response = await client.get(
        "/questions/", 
        headers={"Authorization": "Bearer not_a_real_token"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"

@pytest.mark.asyncio
async def test_erroneous_registration_data(client: AsyncClient):
    """Scenario: User provides invalid data during registration."""
    # Authenticate as Admin first
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": "pass", "department": "IT"
        })
    except:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid email format
    bad_data = {
        "full_name": "John Doe",
        "email": "not-an-email",
        "password": "password123",
        "department": "Science"
    }
    response = await client.post("/auth/register", json=bad_data, headers=headers)
    assert response.status_code == 422 # Unprocessable Entity (Validation failed)

@pytest.mark.asyncio
async def test_duplicate_registration_attempt(client: AsyncClient):
    """Scenario: Trying to register with an email that already exists."""
    # Authenticate as Admin first
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": "pass", "department": "IT"
        })
    except:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user_data = {
        "full_name": "Test User",
        "email": "duplicate@test.com",
        "password": "short_password",
        "department": "IT"
    }
    # First time success
    res = await client.post("/auth/register", json=user_data, headers=headers)
    assert res.status_code == 201

    # Second time failure
    response = await client.post("/auth/register", json=user_data, headers=headers)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_unauthorized_data_modification(client: AsyncClient):
    """Scenario: Teacher A tries to delete a question created by Teacher B."""
    # Authenticate as Admin first
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": "pass", "department": "IT"
        })
    except:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": "pass"})
    token = login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 1. Register Teacher A and Teacher B
    await client.post("/auth/register", json={
        "full_name": "Teacher A", "email": "a@test.com", "password": "pass", "department": "X"
    }, headers=admin_headers)
    await client.post("/auth/register", json={
        "full_name": "Teacher B", "email": "b@test.com", "password": "pass", "department": "X"
    }, headers=admin_headers)

    # 2. Get tokens
    login_a = await client.post("/auth/login", data={"username": "a@test.com", "password": "pass"})
    token_a = login_a.json()["access_token"]
    
    login_b = await client.post("/auth/login", data={"username": "b@test.com", "password": "pass"})
    token_b = login_b.json()["access_token"]

    # 3. Teacher A creates a Syllabus and Topic (needed for question)
    # Teacher A needs to be assigned subjects/grades to create questions?
    # Or creating syllabus requires Admin?
    # Usually Admin creates curriculum.
    
    # Admin creates curriculum structure
    s_res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "Syllabus_Sec_Test", "academic_year": "Y_Sec"}, headers=admin_headers)
    # Check if failed due to duplicate (if test re-run)
    if s_res.status_code == 400:
        # Try to find it? Or just use a random suffix?
        # Let's use random suffix if possible, but for now unique static name might be enough if session is clean.
        # But wait, session is shared across tests?
        # conftest init_db drops all at start of session.
        # So collisions only happen if previous tests created it.
        pass
        
    s_id = s_res.json()["syllabus_id"]
    g_res = await client.post("/curriculum/grades", json={"syllabus_id": s_id, "grade_level": 11}, headers=admin_headers)
    g_id = g_res.json()["config_id"]
    sub_res = await client.post("/curriculum/subjects", json={"config_id": g_id, "subject_name": "Math_Sec"}, headers=admin_headers)
    sub_id = sub_res.json()["subject_id"]
    
    # Let's have Admin create Topic too.
    t_res = await client.post("/curriculum/topics", json={"subject_id": sub_id, "topic_name": "Algebra_Sec"}, headers=admin_headers)
    t_id = t_res.json()["topic_id"]

    # 4. Teacher A creates a question
    # Teacher A needs to be linked to subject?
    # Let's update Teacher A to have subject access.
    # Assuming `UserUpdate` allows assigning subjects.
    # Admin updates Teacher A.
    # We need Teacher A's ID.
    # The register response didn't return ID?
    # We can get it from `me` endpoint or list users.
    
            # Login as Admin to list users (already logged in)
    users_res = await client.get("/auth/users", headers=admin_headers)
    users = users_res.json()["items"]
    user_a = next(u for u in users if u["email"] == "a@test.com")    
    # Update Teacher A to assign subject
    await client.patch(f"/auth/users/{user_a['user_id']}", json={"subject_ids": [sub_id]}, headers=admin_headers)

    # Now Teacher A creates a question
    q_data = {
        "topic_id": t_id, "question_text": "Q1", "answer_text": "A1", "marks": 5, "q_type": "Short Answer"
    }
    # Re-login A to refresh claims if needed (though DB check is real-time usually)
    res = await client.post("/questions/", json=q_data, headers={"Authorization": f"Bearer {token_a}"})
    assert res.status_code == 201
    q_id = res.json()["question_id"]

    # 5. Teacher B tries to delete Teacher A's question (ID 1)
    response = await client.delete(
        f"/questions/{q_id}", 
        headers={"Authorization": f"Bearer {token_b}"}
    )
    
    assert response.status_code == 403 # Forbidden
    assert "permission" in response.json()["detail"] or "authorized" in response.json()["detail"]
