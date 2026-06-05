# Production Readiness & Technical Debt Analysis

A detailed analysis of the current state of the development branch (`development`) of the **Question Bank Platform** has been conducted to identify blockers and pending work required before the codebase is ready for production.

---

## 1. Executive Summary

The current code on the `development` branch contains **major regressions, half-completed refactorings, and broken tests** that prevent it from being production-ready. 

### Critical Status Indicators
* **Backend Pytest Suite:** 🔴 **23 Failed, 7 Passed** (due to password strength and missing API parameters).
* **Frontend Build Status:** 🟢 **Passing** (compiles successfully).
* **Frontend Lint Status:** 🔴 **51 Problems (47 Errors, 4 Warnings)**.
* **Security & Access Control:** ⚠️ **Critical Regression** (Safety locks protecting against final-admin deletion were removed).
* **Feature Completeness:** ⚠️ **Broken Refactoring** (HOD role permission mapping using master allowed subjects is incomplete, causing runtime `AttributeError`s and API payload mismatches).

---

## 2. Detailed Gaps & Gaps Matrix

Below is a matrix of the gaps identified across the system layers, detailing the root causes and business impact.

| Component | Issue | Root Cause | Severity | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** | Uncaught `AttributeError` on analytics, questions, and curriculum endpoints | Legacy name-based HOD checks (`h.subject_name`) were not refactored to ID-based checks after the DB schema migration. | **Blocker (High)** | HOD users cannot load their dashboard, view stats, or manage/filter questions. |
| **Backend API** | Inconsistent Subject Creation | `SubjectCreate` now requires `allowed_subject_id`, but the endpoint doesn't validate if that ID actually exists, and the frontend/tests do not pass it. | **Blocker (High)** | Subject creation is entirely broken from the UI and in unit tests (fails with 422). |
| **Security** | Admin Self-Deletion & Last-Admin Lockout | Safety checks in [auth_routes.py](file:///home/shlok/QDBDev/src/db/auth_routes.py#L353-L361) were stripped, allowing the deletion of the last system administrator. | **Critical** | Permanent administrative lockout if the last admin is deleted. |
| **Test Suite** | Comprehensive Auth Failure | Test passwords (`password123`) fail the new 12-char validation policy, causing setup/login hooks to fail. | **Medium** | Unit tests cannot run, making automated verification impossible. |
| **Frontend UI** | Missing Allowed Subject Integration | [CurriculumManager.tsx](file:///home/shlok/QDBDev/frontend/src/components/CurriculumManager.tsx) has no dropdown for selecting allowed subjects; it still uses free-text inputs. | **Blocker (High)** | Subject creation from the UI always crashes or violates database foreign keys. |
| **Database** | Legacy Data Deletion / Integrity Risk | Alembic migration [20260603...py](file:///home/shlok/QDBDev/src/db/migrations/versions/20260603_c9c56d699e66_refactor_hodlink_and_subject_to_use_id_.py) drops columns without a data-migration routine. | **Medium** | Upgrading a live database will permanently destroy existing HOD and Subject links. |

---

## 3. Deep-Dive Findings

### Finding A: Incomplete HOD & Subject ID Refactoring
The backend database models in [models.py](file:///home/shlok/QDBDev/src/db/models.py) were refactored to transition the HOD mapping from a name-based text comparison to a master `AllowedSubject` ID link:
```diff
class HODLink(BaseSQLModel, table=True):
     __tablename__ = "hod_link"
     user_id: int = Field(foreign_key="users.user_id", primary_key=True, ondelete="CASCADE")
-    subject_name: str = Field(primary_key=True)
+    allowed_subject_id: int = Field(foreign_key="allowed_subjects.allowed_subject_id", primary_key=True, ondelete="CASCADE")
+    allowed_subject: "AllowedSubject" = Relationship()
```
However, the refactoring was only partially completed:
1. **Attribute Errors:** The rest of the routes file code still references `current_user.hod_subjects` instead of `current_user.hod_assignments`, and calls `.subject_name` on it:
   * [curriculum_routes.py:237](file:///home/shlok/QDBDev/src/db/curriculum_routes.py#L237)
   * [routes.py:226](file:///home/shlok/QDBDev/src/db/questions/routes.py#L226)
   * [stats_routes.py:24](file:///home/shlok/QDBDev/src/db/stats_routes.py#L24)
2. **Missing Preloads:** The `get_current_user` auth dependency in [auth_utils.py](file:///home/shlok/QDBDev/src/db/auth_utils.py#L67) does not eager-load the nested `allowed_subject` relationship, which will trigger lazy-loading crashes outside of database sessions.

### Finding B: Security Check Degradation
In [auth_routes.py](file:///home/shlok/QDBDev/src/db/auth_routes.py#L353-L361), the `delete_user` safety guards were modified to omit:
1. An explicit check preventing the final system admin from being deleted.
2. Explanatory error details, returning a generic `403 Forbidden` instead.

### Finding C: Password Validation Policy vs. Tests
A new strict password policy was introduced in [auth_routes.py](file:///home/shlok/QDBDev/src/db/auth_routes.py#L51):
* Minimum length of 12 characters.
* Requires at least one uppercase letter, one digit, and one special character.

While this is a strong production practice, **neither the backend tests** ([test_brutal.py](file:///home/shlok/QDBDev/tests/test_brutal.py) and [test_curriculum.py](file:///home/shlok/QDBDev/tests/test_curriculum.py)) **nor the mock seeding scripts** were updated. They still use `password123` or `admin123`. This triggers a `422 Unprocessable Entity` error during initial mock setups, causing almost the entire test suite to fail on login initialization.

---

## 4. Frontend Lint and Quality Gaps
Running `npm run lint` exposes 51 problems. Key architectural warnings:
1. **Implicit `any` Types:** 47 errors due to `@typescript-eslint/no-explicit-any`, primarily in [CurriculumManager.tsx](file:///home/shlok/QDBDev/frontend/src/components/CurriculumManager.tsx).
2. **State Sync in Effects:** [Dashboard.tsx:149](file:///home/shlok/QDBDev/frontend/src/pages/Dashboard.tsx#L149) triggers cascading renders by calling `setPage(0)` synchronously inside a `useEffect` hook.
3. **Invalid Fast Refresh Exports:** [themeStore.tsx](file:///home/shlok/QDBDev/frontend/src/store/themeStore.tsx#L14) exports non-component elements, which breaks Vite HMR features.

---

## 5. Remediation Plan

To bring this feature set to production readiness, the following sequenced actions should be taken:

### Phase 1: Backend Auth & Test Alignment
* [ ] **Update Test Passwords:** Modify all test cases in [test_brutal.py](file:///home/shlok/QDBDev/tests/test_brutal.py) and [test_curriculum.py](file:///home/shlok/QDBDev/tests/test_curriculum.py) to use a conforming password like `Password123!`.
* [ ] **Update Seeding Passwords:** Modify [generate_dummy_data.py](file:///home/shlok/QDBDev/generate_dummy_data.py#L118) and [seed_admin.py](file:///home/shlok/QDBDev/seed_admin.py) to generate valid passwords.
* [ ] **Restore Safety Locks:** Restore the admin self-deletion prevention and final-admin preservation checks in the user deletion route of [auth_routes.py](file:///home/shlok/QDBDev/src/db/auth_routes.py).

### Phase 2: Complete the HOD / Allowed Subjects Refactoring
* [ ] **Fix Backend HOD references:** Replace all instances of `hod_subjects` with `hod_assignments` and reference names via `allowed_subject.subject_name`.
* [ ] **Fix Dependency Loading:** Update `get_current_user` in [auth_utils.py](file:///home/shlok/QDBDev/src/db/auth_utils.py) to eager-load `hod_assignments.allowed_subject`.
* [ ] **Fix Subject Creation Payload in Tests:** Update the test suites to first register master `AllowedSubject` entries and pass their IDs during `Subject` creation requests.
* [ ] **Integrate UI Dropdown:** Refactor the Subject creation form modal in [CurriculumManager.tsx](file:///home/shlok/QDBDev/frontend/src/components/CurriculumManager.tsx):
  1. Fetch active Allowed Subjects using `GET /allowed-subjects/?active_only=true`.
  2. Replace the free-text name input with a select dropdown.
  3. Include `allowed_subject_id` in the API payload during creation.

### Phase 3: Migration Safety & Quality Polish
* [ ] **Safe Alembic Script:** Enhance the Alembic migration script to copy existing name mappings from `hod_link` and `subjects` into corresponding IDs, rather than dropping the data columns directly.
* [ ] **Frontend Lint Resolution:** Fix type signatures in the React codebase to eliminate implicit `any`s and resolve the react-hook dependencies.
