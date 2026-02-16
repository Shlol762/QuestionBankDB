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
    # 1. Invalid email format
    bad_data = {
        "full_name": "John Doe",
        "email": "not-an-email",
        "password": "password123",
        "department": "Science"
    }
    response = await client.post("/auth/register", json=bad_data)
    assert response.status_code == 422 # Unprocessable Entity (Validation failed)

@pytest.mark.asyncio
async def test_duplicate_registration_attempt(client: AsyncClient):
    """Scenario: Trying to register with an email that already exists."""
    user_data = {
        "full_name": "Test User",
        "email": "duplicate@test.com",
        "password": "short_password",
        "department": "IT"
    }
    # First time success
    await client.post("/auth/register", json=user_data)
    # Second time failure
    response = await client.post("/auth/register", json=user_data)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_unauthorized_data_modification(client: AsyncClient):
    """Scenario: Teacher A tries to delete a question created by Teacher B."""
    # 1. Register Teacher A and Teacher B
    await client.post("/auth/register", json={
        "full_name": "Teacher A", "email": "a@test.com", "password": "pass", "department": "X"
    })
    await client.post("/auth/register", json={
        "full_name": "Teacher B", "email": "b@test.com", "password": "pass", "department": "X"
    })

    # 2. Get tokens
    login_a = await client.post("/auth/login", data={"username": "a@test.com", "password": "pass"})
    token_a = login_a.json()["access_token"]
    
    login_b = await client.post("/auth/login", data={"username": "b@test.com", "password": "pass"})
    token_b = login_b.json()["access_token"]

    # 3. Teacher A creates a Syllabus and Topic (needed for question)
    await client.post("/curriculum/syllabuses", json={"syllabus_name": "S1", "academic_year": "Y1"})
    await client.post("/curriculum/grades", json={"syllabus_id": 1, "grade_level": 10})
    await client.post("/curriculum/subjects", json={"config_id": 1, "subject_name": "Math"})
    await client.post("/curriculum/topics", json={"subject_id": 1, "topic_name": "Algebra"})

    # 4. Teacher A creates a question
    q_data = {
        "topic_id": 1, "question_text": "Q1", "answer_text": "A1", "marks": 5
    }
    await client.post("/questions/", json=q_data, headers={"Authorization": f"Bearer {token_a}"})

    # 5. Teacher B tries to delete Teacher A's question (ID 1)
    response = await client.delete(
        "/questions/1", 
        headers={"Authorization": f"Bearer {token_b}"}
    )
    
    assert response.status_code == 403 # Forbidden
    assert "Not authorized" in response.json()["detail"]
