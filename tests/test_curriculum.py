import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_read_curriculum_hierarchy(client: AsyncClient):
    """Industry Test: Verify the full hierarchy can be built and retrieved."""
    
    # 1. Create Syllabus
    res = await client.post("/curriculum/syllabuses", json={"syllabus_name": "ICSE", "academic_year": "2026"})
    assert res.status_code == 201
    s_id = res.json()["syllabus_id"]

    # 2. Create Grade
    res = await client.post("/curriculum/grades", json={"syllabus_id": s_id, "grade_level": 12})
    assert res.status_code == 201
    g_id = res.json()["config_id"]

    # 3. Create Subject
    res = await client.post("/curriculum/subjects", json={"config_id": g_id, "subject_name": "Physics"})
    assert res.status_code == 201
    sub_id = res.json()["subject_id"]

    # 4. Create Topic
    res = await client.post("/curriculum/topics", json={"subject_id": sub_id, "topic_name": "Quantum Mechanics"})
    assert res.status_code == 201

    # 5. Read back and verify
    res = await client.get(f"/curriculum/topics/{sub_id}")
    assert len(res.json()) == 1
    assert res.json()[0]["topic_name"] == "Quantum Mechanics"

@pytest.mark.asyncio
async def test_create_orphaned_grade(client: AsyncClient):
    """Worst Case: Attempting to link a grade to a non-existent syllabus."""
    res = await client.post("/curriculum/grades", json={"syllabus_id": 9999, "grade_level": 10})
    assert res.status_code == 404
    assert "Syllabus not found" in res.json()["detail"]
