import pytest
from httpx import AsyncClient
from src.db.auth_utils import create_access_token

STRONG_PASSWORD = "Password123!"

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
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid email format
    bad_data = {
        "full_name": "John Doe",
        "email": "not-an-email",
        "password": STRONG_PASSWORD,
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
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user_data = {
        "full_name": "Test User",
        "email": "duplicate@test.com",
        "password": STRONG_PASSWORD,
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
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    token = login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 1. Register Teacher A and Teacher B
    await client.post("/auth/register", json={
        "full_name": "Teacher A", "email": "a@test.com", "password": STRONG_PASSWORD, "department": "X"
    }, headers=admin_headers)
    await client.post("/auth/register", json={
        "full_name": "Teacher B", "email": "b@test.com", "password": STRONG_PASSWORD, "department": "X"
    }, headers=admin_headers)

    # 2. Get tokens
    login_a = await client.post("/auth/login", data={"username": "a@test.com", "password": STRONG_PASSWORD})
    token_a = login_a.json()["access_token"]
    
    login_b = await client.post("/auth/login", data={"username": "b@test.com", "password": STRONG_PASSWORD})
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
    await client.post("/allowed-subjects/", json={"subject_name": "Math_Sec"}, headers=admin_headers)
    sub_res = await client.post("/curriculum/subjects", json={"config_id": g_id, "subject_name": "Math_Sec", "allowed_subject_id": 1}, headers=admin_headers)
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
        "topic_ids": [t_id], "question_text": "Q1", "answer_text": "A1", "marks": 5, "q_type": "Short Answer"
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


@pytest.mark.asyncio
async def test_invalid_subject_assignments(client: AsyncClient):
    """Scenario: Trying to register or update a user with non-existent subject_ids."""
    # Authenticate as Admin first
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Register with a non-existent subject ID (e.g. 99999)
    bad_register_data = {
        "full_name": "Bad Subject Teacher",
        "email": "badsubject@test.com",
        "password": STRONG_PASSWORD,
        "department": "Science",
        "subject_ids": [99999]
    }
    response = await client.post("/auth/register", json=bad_register_data, headers=headers)
    assert response.status_code == 400
    assert "teaching subject assignments do not exist" in response.json()["detail"]

    # Register successfully with no subject IDs
    good_register_data = {
        "full_name": "Good Teacher",
        "email": "goodteacher@test.com",
        "password": STRONG_PASSWORD,
        "department": "Science",
        "subject_ids": []
    }
    res = await client.post("/auth/register", json=good_register_data, headers=headers)
    assert res.status_code == 201

    # Find the user's ID
    users_res = await client.get("/auth/users", headers=headers)
    users = users_res.json()["items"]
    user = next(u for u in users if u["email"] == "goodteacher@test.com")
    user_id = user["user_id"]

    # Try to update the user with a non-existent subject ID
    update_data = {
        "subject_ids": [99999]
    }
    response = await client.patch(f"/auth/users/{user_id}", json=update_data, headers=headers)
    assert response.status_code == 400
    assert "teaching subject assignments do not exist" in response.json()["detail"]


@pytest.mark.asyncio
async def test_deactivated_user_security_constraints(client: AsyncClient):
    """Scenario: Deactivated users are blocked from logging in or using their session; admins cannot self-deactivate or disable the last admin."""
    # 1. Setup/Login as Admin
    try:
        await client.post("/auth/initial-setup", json={
            "full_name": "Admin", "email": "admin@test.com", "password": STRONG_PASSWORD, "department": "IT"
        })
    except Exception:
        pass
    login = await client.post("/auth/login", data={"username": "admin@test.com", "password": STRONG_PASSWORD})
    admin_token = login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register faculty user
    faculty_data = {
        "full_name": "Faculty User",
        "email": "faculty@test.com",
        "password": STRONG_PASSWORD,
        "department": "Science",
        "is_active": True
    }
    res = await client.post("/auth/register", json=faculty_data, headers=admin_headers)
    assert res.status_code == 201

    # Get faculty user ID
    users_res = await client.get("/auth/users", headers=admin_headers)
    users = users_res.json()["items"]
    faculty_user = next(u for u in users if u["email"] == "faculty@test.com")
    faculty_id = faculty_user["user_id"]

    # Verify faculty user can log in
    fac_login = await client.post("/auth/login", data={"username": "faculty@test.com", "password": STRONG_PASSWORD})
    assert fac_login.status_code == 200
    fac_token = fac_login.json()["access_token"]
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    # Verify active session works
    me_res = await client.get("/auth/me", headers=fac_headers)
    assert me_res.status_code == 200

    # 3. Admin disables faculty user
    deactivate_res = await client.patch(f"/auth/users/{faculty_id}", json={"is_active": False}, headers=admin_headers)
    assert deactivate_res.status_code == 200
    assert deactivate_res.json()["is_active"] is False

    # 4. Verify deactivated user's active session is blocked immediately
    me_res_blocked = await client.get("/auth/me", headers=fac_headers)
    assert me_res_blocked.status_code == 403
    assert "disabled" in me_res_blocked.json()["detail"]

    # 5. Verify deactivated user cannot log in again
    fac_login_retry = await client.post("/auth/login", data={"username": "faculty@test.com", "password": STRONG_PASSWORD})
    assert fac_login_retry.status_code == 403
    assert "disabled" in fac_login_retry.json()["detail"]

    # 6. Admin tries to deactivate themselves
    # Get Admin user ID
    admin_user = next(u for u in users if u["email"] == "admin@test.com")
    admin_id = admin_user["user_id"]
    self_deactivate_res = await client.patch(f"/auth/users/{admin_id}", json={"is_active": False}, headers=admin_headers)
    assert self_deactivate_res.status_code == 400
    assert "cannot disable your own account" in self_deactivate_res.json()["detail"]

    # 7. Admin tries to deactivate the last admin (which is indeed themselves, but we check is_admin target lockout too)
    # Let's create another admin
    admin2_data = {
        "full_name": "Admin Two",
        "email": "admin2@test.com",
        "password": STRONG_PASSWORD,
        "department": "IT",
        "is_admin": True,
        "is_active": True
    }
    await client.post("/auth/register", json=admin2_data, headers=admin_headers)
    
    users_res = await client.get("/auth/users", headers=admin_headers)
    users = users_res.json()["items"]
    admin2_user = next(u for u in users if u["email"] == "admin2@test.com")
    admin2_id = admin2_user["user_id"]

    # Deactivating admin2 should succeed because admin1 is also active
    deactivate_admin2 = await client.patch(f"/auth/users/{admin2_id}", json={"is_active": False}, headers=admin_headers)
    assert deactivate_admin2.status_code == 200

    # Try to deactivate admin1 (since admin2 is deactivated, admin1 is the only active admin left)
    self_deactivate_last_admin = await client.patch(f"/auth/users/{admin_id}", json={"is_active": False}, headers=admin_headers)
    assert self_deactivate_last_admin.status_code == 400 # blocked by self-deactivation first

    # Wait, let's login as admin2, activate admin2, then admin2 tries to deactivate admin1
    # But admin2 is deactivated, so admin2 cannot login or make requests! Perfect!
    # Let's log in as admin1, activate admin2
    await client.patch(f"/auth/users/{admin2_id}", json={"is_active": True}, headers=admin_headers)
    # Now log in as admin2
    login2 = await client.post("/auth/login", data={"username": "admin2@test.com", "password": STRONG_PASSWORD})
    admin2_token = login2.json()["access_token"]
    admin2_headers = {"Authorization": f"Bearer {admin2_token}"}
    # admin2 deactivates admin1 (succeeds because admin2 is active admin)
    deactivate_admin1 = await client.patch(f"/auth/users/{admin_id}", json={"is_active": False}, headers=admin2_headers)
    assert deactivate_admin1.status_code == 200

    # Now admin2 is the last active admin. admin2 tries to deactivate admin2 (blocked by self-deactivation)
    self_deactivate_admin2 = await client.patch(f"/auth/users/{admin2_id}", json={"is_active": False}, headers=admin2_headers)
    assert self_deactivate_admin2.status_code == 400


