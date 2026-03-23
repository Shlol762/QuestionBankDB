# Implementation Plan: QuestionBankDB Refinement

This document outlines the step-by-step actions required to elevate QuestionBankDB from a solid prototype to a production-ready enterprise application. Tasks are prioritized by impact and stability.

> **Audit note (added):** A full static code review was performed against the live codebase. Phases 3–6 were added as a result. 23 of 25 identified issues were not tracked in the original plan. Two existing entries (rate limiting, XSS hardening) were present but lacked the specificity needed to guide implementation.

---

## Phase 1: Critical Security & Foundations — **COMPLETED**
*Goal: Secure the application, enforce code quality, and stabilize the environment.*

### 1.1 Secure Authentication & Rate Limiting (Completed)
*   **Step 1: Verify Password Hashing** (Done)
*   **Step 2: Enforce JWT Expiration** (Done)
*   **Step 3: Implement Rate Limiting** (Done — but see Phase 3.3 for specific endpoint gaps that were missed)
*   **Step 4: Frontend 401 Handling** (Verified)

### 1.2 CI/CD Quality Gates (Completed)
*   **Step 1: Create Linting Workflow** (Done)

### 1.3 Environment Isolation (Completed)
*   **Step 1: Strict Config Validation** (Done)
*   **Step 2: Documentation** (Done)

---

## Phase 2: Architectural Refinement — **COMPLETED**
*Goal: Standardize deployment and improve frontend maintainability.*

### 2.1 Containerization (Completed)

*   **Step 1: Backend Dockerfile** — Multi-stage build using `python:3.11-slim`. (Done)
*   **Step 2: Frontend Dockerfile** — React build via `node:18`, served with `nginx:alpine`. (Done)
*   **Step 3: Orchestration** — `docker-compose.yml` with `db`, `backend`, and `frontend` services. (Done)

### 2.2 Frontend State Management & Forms (Completed)

*   **Step 1: Adopt TanStack Query** — Installed. `UserManagement.tsx` and `CurriculumManager.tsx` refactored. (Done)
*   **Step 2: Global Client State** — `zustand` installed. `useAuthStore` created and integrated. (Done)
*   **Step 3: Robust Forms** — `react-hook-form` + `zod` installed. `QuestionForm.tsx` rewritten. (Done)

---

## Phase 3: Critical Security Gaps — **TODO (Highest Priority)**
*Goal: Address vulnerabilities found during code audit that were missed in Phase 1.*

> These issues were present in the codebase at the time Phase 1 was marked complete. They must be resolved before any further development.

### 3.1 Hardcoded JWT Secret Key

**Problem:** `src/db/auth_utils.py` lines 11–13 contain a hardcoded fallback secret:
```python
SECRET_KEY = "DEVELOPMENT_SECRET_KEY_REPLACE_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
```
This value is used in production if the `.env` file is missing. Any JWT signed with it is trivially forgeable.

*   **Step 1: Delete hardcoded values.**
    Delete those three lines from `src/db/auth_utils.py`.

*   **Step 2: Wire in settings.**
    Add these three lines in their place:
    ```python
    from src.config import settings
    SECRET_KEY = settings.SECRET_KEY
    ALGORITHM = settings.ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    ```
    `src/config.py` already reads all three from `.env` via Pydantic Settings — this just connects them.

*   **Step 3: Verify.**
    Run `grep -rn "DEVELOPMENT_SECRET_KEY" src/` and confirm no output.

---

### 3.2 Token Stored in `localStorage` (XSS Risk)

**Problem:** `frontend/src/store/authStore.ts` and `frontend/src/api/client.ts` use `localStorage` to store the JWT. Any injected script can read `localStorage`, exfiltrating the token silently.

*   **Step 1: Replace all `localStorage` references with `sessionStorage`.**
    There are four locations:
    -   `authStore.ts` — `login()` function: `localStorage.setItem('token', token)` → `sessionStorage.setItem`
    -   `authStore.ts` — `isAuthenticated` initial value: `!!localStorage.getItem('token')` → `sessionStorage.getItem`
    -   `authStore.ts` — `logout()` function: `localStorage.removeItem('token')` → `sessionStorage.removeItem`
    -   `client.ts` — request interceptor: `localStorage.getItem('token')` → `sessionStorage.getItem`

*   **Step 2: Update Dashboard.tsx logout handler.**
    `handleLogout` calls `localStorage.removeItem('token')` directly. Change to `sessionStorage.removeItem('token')`.

*   **Note:** `sessionStorage` limits the attack window to the open tab. A full mitigation (httpOnly cookie + `/auth/refresh` endpoint) is a future architecture task. `sessionStorage` is the pragmatic step that eliminates the cross-tab and persistent-XSS vectors today.

---

### 3.3 Debug File Writes Left in Production Code

**Problem:** `src/db/curriculum_routes.py` writes to `upload_debug.log` on every PDF upload:
```python
with open("upload_debug.log", "a") as f:
    f.write(f"--- Upload Attempt ---\n")
    f.write(f"Filename: {file.filename}\n")
    f.write(f"Size: {file_size} bytes\n")
    f.write(f"Content Start (hex): {content[:20].hex()}\n")
    f.write(f"Content Start (text): {str(content[:20])}\n")
```
This is both an information disclosure risk (file contents are logged) and a disk exhaustion vector on a busy server.

*   **Step 1: Delete the entire `# DEBUG LOGGING` block** from the `upload_syllabus_pdf` function (approximately 8 lines starting with the comment).

*   **Step 2: Add `upload_debug.log` to `.gitignore`** to prevent accidental future commits of the file if it was already generated.

*   **Step 3: If logging is needed for upload debugging**, replace it with structured logging via Python's `logging` module at `DEBUG` level, which can be toggled off in production via `LOG_LEVEL=INFO` in `.env`.

---

### 3.4 No Server-Side Password Strength Validation

**Problem:** `src/db/auth_routes.py` accepts any non-empty string as a password in both `UserCreate` (the `register` endpoint) and `initial-setup`. The frontend enforces an 8-character minimum on the setup page, but this is entirely bypassable via a direct API call.

*   **Step 1: Add a Pydantic field validator to `UserCreate`.**
    After the existing field declarations in the `UserCreate` class:
    ```python
    from pydantic import field_validator

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    ```

*   **Step 2: Apply the same validator to `UserUpdate`** for the optional `password` field. In `UserUpdate`, the field is `Optional[str]`, so the validator must handle `None`:
    ```python
    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str | None) -> str | None:
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
    ```

*   **Step 3: The `initial_setup` endpoint** uses `UserCreate` directly, so it is covered automatically by Step 1.

---

## Phase 4: High-Priority Backend Fixes — **TODO**
*Goal: Fix a runtime crash, two query correctness bugs, three missing infrastructure pieces, and a permission logic flaw.*

### 4.1 Deprecated `pydantic.generics.GenericModel` (Runtime Crash Risk)

**Problem:** `src/db/models.py` bottom section:
```python
from pydantic.generics import GenericModel
class Page(GenericModel, Generic[T]):
```
`pydantic.generics` was removed in Pydantic v2. This import succeeds on Pydantic v1 shims but crashes on a clean Pydantic v2 install. Every paginated API endpoint depends on `Page`.

*   **Step 1: Delete the old import and base class.**
    Remove `from pydantic.generics import GenericModel` from the imports at the bottom of `src/db/models.py`.

*   **Step 2: Replace the class definition.**
    ```python
    from typing import TypeVar, Generic
    from pydantic import BaseModel

    T = TypeVar('T')

    class Page(BaseModel, Generic[T]):
        items: List[T]
        total: int
        model_config = ConfigDict(arbitrary_types_allowed=True)
    ```
    In Pydantic v2, `BaseModel` natively supports `Generic[T]`.

*   **Step 3: Run the test suite** (`pytest tests/ -v`) to confirm all paginated endpoints still serialize correctly.

---

### 4.2 N+1 Query in `validate_assignments`

**Problem:** `src/db/auth_routes.py` — `validate_assignments` fires one database query per grade level and one per subject name in a Python loop. Assigning a user to 10 grade levels and 5 subjects executes 15 sequential queries.

*   **Step 1: Replace the entire function** with two bulk queries:
    ```python
    async def validate_assignments(
        session: AsyncSession,
        grade_levels: list[int] = None,
        hod_subject_names: list[str] = None
    ):
        if grade_levels:
            stmt = select(func.count(GradeConfig.config_id)).where(
                GradeConfig.grade_level.in_(grade_levels)
            )
            found = (await session.exec(stmt)).one()
            if found < len(set(grade_levels)):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "One or more grade levels do not exist in the curriculum"
                )

        if hod_subject_names:
            normalized = [n.lower() for n in hod_subject_names]
            stmt = select(Subject.subject_name).where(
                func.lower(Subject.subject_name).in_(normalized)
            )
            found_names = {r.lower() for r in (await session.exec(stmt)).all()}
            missing = [n for n in hod_subject_names if n.lower() not in found_names]
            if missing:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Subjects not found in curriculum: {', '.join(missing)}"
                )
    ```
    This reduces the query count to exactly 2 regardless of input size.

---

### 4.3 `is_active` Flag Ignored in Question Listing

**Problem:** `QuestionBank` has an `is_active: bool` field intended for soft deletion, but `list_questions` in `src/db/questions/routes.py` never filters on it. Deactivated questions appear in all listings.

*   **Step 1: Add the filter to `list_questions`.** After the standard filters block (the `if topic_id / if difficulty / if q_type / if search` section), add:
    ```python
    base_stmt = base_stmt.where(QuestionBank.is_active == True)
    ```

*   **Step 2: Update `get_question`** to return 404 for inactive questions when the caller is not an admin:
    ```python
    if not question.is_active and not current_user.is_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    ```
    Admins can still retrieve inactive questions by ID for audit purposes.

---

### 4.4 No Database Migrations (Raw `create_all` on Startup)

**Problem:** `src/db/main.py` calls `SQLModel.metadata.create_all` inside `init_db`, which silently no-ops on existing tables. Any column addition, index creation, or constraint change requires manual intervention or wiping the database. This is incompatible with production deployments.

*   **Step 1: Install Alembic.**
    ```
    pip install alembic
    ```
    Add `alembic` to `requirements.txt`.

*   **Step 2: Initialize Alembic.**
    From the project root: `alembic init src/db/migrations`

*   **Step 3: Configure `alembic.ini`.**
    Set `script_location = src/db/migrations`.

*   **Step 4: Configure `src/db/migrations/env.py`.**
    Replace the target metadata block and database URL:
    ```python
    from src.config import settings
    from src.db.models import SQLModel

    config.set_main_option(
        "sqlalchemy.url",
        settings.POSTGRES_URL.replace("+asyncpg", "")
    )
    target_metadata = SQLModel.metadata
    ```

*   **Step 5: Generate the initial migration.**
    `alembic revision --autogenerate -m "initial_schema"`
    Review the generated file in `src/db/migrations/versions/`.

*   **Step 6: Gate `create_all` to the test environment only.**
    In `src/db/main.py`:
    ```python
    async def init_db():
        if settings.TESTING:
            async with async_engine.begin() as conn:
                await conn.run_sync(SQLModel.metadata.create_all)
        # Production schema is managed by: alembic upgrade head
    ```

*   **Step 7: Update deployment docs and `docker-compose.yml`** to run `alembic upgrade head` before starting the backend container.

---

### 4.5 `get_session` Missing Cleanup on Exception

**Problem:** `src/db/main.py` — `get_session` is a simple `async with` context manager, but if a downstream exception bubbles up and the session is never explicitly closed by the ORM, some async drivers can leak connections. The generator should guarantee cleanup.

*   **Step 1: Add explicit rollback on error** to `get_session`:
    ```python
    async def get_session() -> AsyncSession:
        async_session = sessionmaker(
            bind=async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with async_session() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    ```

---

### 4.6 Rate Limiting Gaps on `/register` and Upload Endpoints

**Problem:** Phase 1 marked rate limiting as done, but only `POST /auth/login` has `@limiter.limit("5/minute")`. The `register`, `upload-pdf`, and `upload-image` endpoints are unprotected, allowing bulk account creation and disk-filling upload floods.

*   **Step 1: Add `request: Request` parameter and limit decorator to `/auth/register`** in `src/db/auth_routes.py`:
    ```python
    @router.post("/register", status_code=status.HTTP_201_CREATED)
    @limiter.limit("10/minute")
    async def register_user(
        request: Request,
        user_data: UserCreate,
        ...
    ):
    ```

*   **Step 2: Add the same to `upload_syllabus_pdf`** in `src/db/curriculum_routes.py`:
    ```python
    @router.post("/upload-pdf")
    @limiter.limit("20/minute")
    async def upload_syllabus_pdf(
        request: Request,
        file: UploadFile = File(...),
        ...
    ):
    ```

*   **Step 3: Add the same to `upload_question_image`** in `src/db/questions/routes.py`:
    ```python
    @router.post("/upload-image")
    @limiter.limit("20/minute")
    async def upload_question_image(
        request: Request,
        file: UploadFile = File(...),
        ...
    ):
    ```

---

### 4.7 Missing `/health` Endpoint

**Problem:** There is no endpoint that verifies database connectivity. Load balancers, Kubernetes liveness probes, and uptime monitors have no way to distinguish "app process is running" from "app can serve requests."

*   **Step 1: Add to `src/__init__.py`** after the existing `/ping` route:
    ```python
    from sqlalchemy import text
    from src.db.main import async_engine

    @app.get("/health")
    async def health_check():
        try:
            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return {"status": "ok", "database": "reachable"}
        except Exception:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=503,
                content={"status": "error", "database": "unreachable"}
            )
    ```
    This endpoint must **not** require authentication. Add it to the excluded paths list in any middleware.

*   **Step 2: Update `docker-compose.yml`** to use it as a healthcheck:
    ```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    ```

---

### 4.8 `GET /curriculum/hierarchy` Has No Pagination

**Problem:** `src/db/curriculum_routes.py` — the `get_full_hierarchy` endpoint loads the entire curriculum tree (all syllabuses → all grades → all subjects → all topics) into memory in a single query with `selectinload`. On a production database with years of content this is an unbounded memory allocation.

*   **Step 1: Add `syllabus_id` filter parameter** so callers can request one syllabus at a time:
    ```python
    @router.get("/hierarchy", response_model=List[SyllabusHierarchyRead])
    async def get_full_hierarchy(
        syllabus_id: Optional[int] = None,
        session: AsyncSession = Depends(get_session),
        current_user: Users = Depends(get_current_user)
    ):
        statement = select(SyllabusMaster).options(...)
        if syllabus_id:
            statement = statement.where(SyllabusMaster.syllabus_id == syllabus_id)
    ```

*   **Step 2: Update the frontend.** `QuestionForm.tsx` and `UserManagement.tsx` both call `/curriculum/hierarchy` with no parameters and load the full tree to build dropdowns. Lazy-load subjects and topics via the existing `/curriculum/subjects/{config_id}` and `/curriculum/topics/subject/{subject_id}` endpoints instead, matching the pattern already used in `CurriculumManager.tsx`.

---

### 4.9 `can_manage_grade` Excludes Grade Coordinators

**Problem:** `src/db/models.py` — the `can_manage_grade` method on the `Users` model:
```python
def can_manage_grade(self) -> bool:
    return self.is_admin
```
Only admins can manage grades. But `can_manage_subject` already grants grade coordinators the ability to manage subjects within their grade. The asymmetry means a coordinator can add subjects to a grade they cannot themselves create, edit, or delete — an inconsistent permission boundary.

*   **Step 1: Update `can_manage_grade`** to also return `True` for coordinators:
    ```python
    def can_manage_grade(self) -> bool:
        if self.is_admin:
            return True
        return len(self.grade_coordinating) > 0
    ```
    This is intentionally broad — a coordinator can manage (edit/delete) any grade they coordinate, matching the existing subject-management logic. If you want coordinators scoped to only their own grades, pass `grade_level` as a parameter and check `any(g.grade_level == grade_level for g in self.grade_coordinating)`.

---

## Phase 5: Medium-Priority Frontend Fixes — **TODO**
*Goal: Fix five bugs found in audit and two structural issues that will cause problems at scale.*

### 5.1 `QuestionForm.tsx` — `useEffect` Clears Options on Initial Render

**Problem:** The `useEffect` that resets options when `currentQType` changes runs on the initial mount. When editing an existing MCQ, `currentQType` is read from `initialData` and triggers the effect, which overwrites the loaded options with empty defaults before the user sees anything.

*   **Step 1: Add a `useRef` skip-flag** at the top of the component (add `useRef` to the React import):
    ```typescript
    const isFirstRender = useRef(true);
    ```

*   **Step 2: Gate the effect** to skip the first run:
    ```typescript
    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      if (currentQType === 'MCQ') setValue('options', defaultOptions);
      else if (currentQType === 'Match the Following') setValue('options', { pairs: defaultPairs });
      else setValue('options', null);
      if (currentQType !== 'Match the Following') setValue('answer_text', '');
    }, [currentQType]);
    ```

*   **Step 3: Verify** by opening an existing MCQ question in the edit form and confirming the four option fields are pre-filled.

---

### 5.2 Image URL Doubles the Base URL in `Dashboard.tsx`

**Problem:** `Dashboard.tsx` renders question thumbnails with:
```typescript
src={`${import.meta.env.VITE_API_BASE_URL}${q.image_url}`}
```
Without the `|| ''` fallback. When `VITE_API_BASE_URL` is `undefined` (not set in `.env`), this produces `undefined/static/...`. `QuestionForm.tsx` handles this correctly with `|| ''` — `Dashboard.tsx` does not.

*   **Step 1: Add the fallback** to every `VITE_API_BASE_URL` usage in `Dashboard.tsx`:
    ```typescript
    src={`${import.meta.env.VITE_API_BASE_URL || ''}${q.image_url}`}
    ```
    Search for all occurrences of `VITE_API_BASE_URL` in the file (there are two image `src` attributes).

---

### 5.3 No React Error Boundary

**Problem:** Any unhandled render error in a child component (`QuestionForm`, `CurriculumManager`, `UserManagement`) crashes the entire application with a blank white screen. There is no fallback UI.

*   **Step 1: Create `frontend/src/components/ErrorBoundary.tsx`:**
    ```typescript
    import React from 'react';

    interface State { hasError: boolean; error: Error | null; }

    export class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      State
    > {
      state: State = { hasError: false, error: null };

      static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
      }

      render() {
        if (this.state.hasError) {
          return (
            <div className="h-screen flex flex-col items-center justify-center
                            bg-gray-50 dark:bg-gray-950 text-center p-8">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-500 mb-8 max-w-md">
                {this.state.error?.message}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-academy-700 text-white px-8 py-3 rounded-2xl
                           font-black text-xs uppercase tracking-widest"
              >
                Reload Application
              </button>
            </div>
          );
        }
        return this.props.children;
      }
    }
    ```

*   **Step 2: Wrap the app** in `frontend/src/main.tsx`:
    ```typescript
    import { ErrorBoundary } from './components/ErrorBoundary';
    // ...
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
    ```

---

### 5.4 `queryClient.invalidateQueries()` Called Without Arguments

**Problem:** `CurriculumManager.tsx` mutation `onSuccess` handlers call `queryClient.invalidateQueries()` with no arguments. This invalidates every cached query in the application — questions, users, stats, hierarchy — on every single curriculum edit. It causes a cascade of unnecessary background refetches.

*   **Step 1: Replace each broad invalidation** with a targeted one based on what changed. `modalData` already holds `parentId` for all non-syllabus mutations:
    | Mutation | Replace with |
    |---|---|
    | Create/edit syllabus | `queryClient.invalidateQueries({ queryKey: ['syllabuses'] })` |
    | Create/edit grade | `queryClient.invalidateQueries({ queryKey: ['grades', modalData.parentId] })` |
    | Create/edit subject | `queryClient.invalidateQueries({ queryKey: ['subjects', modalData.parentId] })` |
    | Create/edit topic | `queryClient.invalidateQueries({ queryKey: ['topics', modalData.parentId] })` |
    | Delete any item | Invalidate the parent's list key (e.g., deleting a grade invalidates `['grades', syllabus_id]`) |

*   **Step 2: For the delete mutation**, the delete target type and id are stored in `deleteTarget`. Map `deleteTarget.type` to the correct query key and invalidate only that.

---

### 5.5 `authStore.fetchMe` Called on Every App Mount

**Problem:** `frontend/src/App.tsx` calls `fetchMe()` inside `useEffect` with an empty dependency array. This fires on every full page load with no short-circuit — even when the token is fresh and the user data is already valid in the store. On slow connections this adds a visible loading flash.

*   **Step 1: Add a time-based short-circuit** in `authStore.ts`:
    ```typescript
    interface AuthState {
      // ... existing fields ...
      lastFetched: number | null;
    }

    // In initial state:
    lastFetched: null,

    // In fetchMe action:
    fetchMe: async () => {
      const { lastFetched } = get();
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (lastFetched && Date.now() - lastFetched < FIVE_MINUTES) return;

      set({ isLoading: true });
      try {
        const response = await client.get('/auth/me');
        set({ user: response.data, isAuthenticated: true, lastFetched: Date.now() });
      } catch {
        set({ user: null, isAuthenticated: false });
        sessionStorage.removeItem('token');
      } finally {
        set({ isLoading: false });
      }
    },
    ```

---

### 5.6 `/users` Route Missing from Vite Dev Proxy

**Problem:** `frontend/vite.config.ts` proxy config covers `/auth`, `/curriculum`, `/questions`, `/stats`, and `/static`. The `UserManagement.tsx` component calls `/auth/users/...` which is covered by the `/auth` prefix. However, the admin password reset endpoint is at `/auth/users/{id}/reset-password`, which is also covered. This is correct as-is, but verify no direct `/users/` calls exist outside the `/auth` prefix.

*   **Step 1: Run a scan** for any unproxied API calls:
    ```bash
    grep -rn "client\.\(get\|post\|patch\|delete\|put\)" frontend/src \
      | grep -v "'/auth\|'/curriculum\|'/questions\|'/stats\|'/static"
    ```
    If any paths are found that don't begin with a proxied prefix, add them to the `proxy` block in `vite.config.ts`.

---

### 5.7 No Shared API Error Extraction Utility

**Problem:** Every `useMutation` `onError` handler independently repeats the same pattern:
```typescript
err.response?.data?.detail || "Failed to save question."
```
This pattern exists in `QuestionForm.tsx`, `UserManagement.tsx`, `CurriculumManager.tsx`, and `Dashboard.tsx`. If the error shape from the backend ever changes, every one of these must be updated.

*   **Step 1: Create `frontend/src/api/errors.ts`:**
    ```typescript
    export function extractApiError(err: unknown, fallback = 'An unexpected error occurred'): string {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as any).response;
        return response?.data?.detail || response?.data?.message || fallback;
      }
      return fallback;
    }
    ```

*   **Step 2: Replace all instances** of the inline pattern with:
    ```typescript
    import { extractApiError } from '../api/errors';
    // ...
    onError: (err) => toast.error(extractApiError(err, "Failed to save question."))
    ```

---

## Phase 6: Low-Priority Code Quality — **TODO**
*Goal: Fix code hygiene issues that will cause confusion or subtle failures.*

### 6.1 Bare `except:` Clauses in Test Files Swallow `SystemExit`

**Problem:** `tests/test_curriculum.py` and `tests/test_security.py` use bare `except:` (no exception type) to silently skip initial setup failures:
```python
try:
    await client.post("/auth/initial-setup", ...)
except:
    pass
```
Bare `except:` catches `SystemExit`, `KeyboardInterrupt`, and `GeneratorExit`. If pytest tries to exit during the `try` block, the exit is swallowed and the test run hangs.

*   **Step 1: Replace every bare `except:` with `except Exception:`** in all test files. The semantics are identical for the intended use case (ignoring a 403 because setup already ran) but `SystemExit` and friends are no longer caught.

---

### 6.2 `seed_admin.py` Prints Default Password in Plain Text

**Problem:** `seed_admin.py` contains:
```python
password_hash=get_password_hash("admin123"), # Default password
# ...
print(f"Login with: \nEmail: {email}\nPassword: admin123")
```
The default password is hardcoded as a string literal, documented in a comment, and printed to stdout. Any log aggregation system will capture it. If `seed_admin.py` is used in a CI pipeline, it appears in the build log.

*   **Step 1: Prompt for the password interactively** instead of hardcoding it:
    ```python
    import getpass
    password = getpass.getpass("Enter initial admin password: ")
    confirm  = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match. Aborting.")
        return
    ```

*   **Step 2: Remove the print statement** that echoes the password back:
    ```python
    # Remove this line:
    print(f"Login with: \nEmail: {email}\nPassword: admin123")
    # Replace with:
    print(f"✨ Admin account created. Login with: {email}")
    ```

---

## Phase 7: Testing & Polish — **TODO**
*Goal: Ensure long-term reliability and developer efficiency.*

### 7.1 Frontend Testing

*   **Step 1: Setup Vitest**
    *   Install `vitest`, `jsdom`, `@testing-library/react`.
    *   Update `vite.config.ts` to include test configuration.
*   **Step 2: Write Tests**
    *   Create `frontend/src/utils.test.ts` (unit tests).
    *   Add component tests for `QuestionForm.tsx` — specifically regression tests for the edit-mode options bug fixed in Phase 5.1.
    *   Add a test for `extractApiError` (Phase 5.7).

### 7.2 Automated Type Generation

*   **Step 1: Setup Generator**
    *   Install `openapi-typescript-codegen` (dev dependency).
    *   Add script to `package.json`: `"generate-client": "openapi --input http://localhost:8000/openapi.json --output ./src/client --client axios"`.
*   **Step 2: Integration**
    *   Run the script and replace manual interfaces (e.g., the `User` interface in `authStore.ts`) with generated ones.

### 7.3 Security Polish

*   **Step 1: Sanitize Rendered Question Content**
    *   Install `dompurify`.
    *   Wrap any `dangerouslySetInnerHTML` usage in `DOMPurify.sanitize()`.
    *   **Note:** The localStorage XSS fix in Phase 3.2 and the Error Boundary in Phase 5.3 are prerequisites for this step.
*   **Step 2: Backend SQL Audit**
    *   Run: `grep -rn "text(" src/` — all results should be parameterized calls. No string interpolation.
    *   Confirm strictly `session.exec(select(...))` is used throughout.

---

## Phase 8: Feature Additions — **TODO**
*Goal: Add high-value functionality identified during the audit.*

### 8.1 Question Export (CSV)

*   **Step 1: Add export endpoint** to `src/db/questions/routes.py`:
    ```python
    import csv, io
    from fastapi.responses import StreamingResponse

    @router.get("/export/csv")
    async def export_questions_csv(
        topic_id: Optional[int] = None,
        difficulty: Optional[DifficultyLevel] = None,
        q_type: Optional[QuestionType] = None,
        session: AsyncSession = Depends(get_session),
        current_user: Users = Depends(get_current_user)
    ):
        # Reuse list_questions filter logic but without pagination limit
        # ... (build base_stmt using same permission filters) ...
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'question_id', 'question_text', 'answer_text', 'q_type',
            'difficulty', 'marks', 'topic', 'teacher', 'created_at'
        ])
        writer.writeheader()
        for q in items:
            writer.writerow({...})
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=questions.csv"}
        )
    ```

*   **Step 2: Add Export button to `Dashboard.tsx`** next to "New Question":
    ```typescript
    const handleExport = async () => {
      const response = await client.get('/questions/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    };
    ```

---

### 8.2 Bulk Delete on Question List

*   **Step 1: Add selection state to `Dashboard.tsx`:**
    ```typescript
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    ```

*   **Step 2: Add checkbox column** to the question table. Each row gets a checkbox; the header gets a "select all visible" checkbox.

*   **Step 3: Show a bulk action bar** when `selectedIds.size > 0`:
    ```typescript
    const handleBulkDelete = async () => {
      await Promise.all(
        Array.from(selectedIds).map(id => client.delete(`/questions/${id}`))
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    };
    ```
    No new backend endpoint is required — individual delete with permission checks already exists.

---

### 8.3 PostgreSQL Full-Text Search Index on `question_text`

**Problem:** The current search filter in `list_questions` uses:
```python
func.lower(QuestionBank.question_text).contains(search.lower())
```
This compiles to `LOWER(question_text) LIKE '%query%'`. PostgreSQL cannot use a B-tree index on this pattern. Full-table scans on `question_bank` will become the dominant query as the question count grows.

*   **Step 1: Enable the `pg_trgm` extension** in a new Alembic migration (create this after completing Phase 4.4):
    ```python
    def upgrade():
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute("""
            CREATE INDEX ix_question_bank_text_trgm
            ON question_bank
            USING gin (question_text gin_trgm_ops)
        """)

    def downgrade():
        op.execute("DROP INDEX IF EXISTS ix_question_bank_text_trgm")
    ```

*   **Step 2: Update the search filter** in `list_questions` to use the index:
    ```python
    if search:
        base_stmt = base_stmt.where(
            QuestionBank.question_text.op('ILIKE')(f'%{search}%')
        )
    ```
    `ILIKE` with `gin_trgm_ops` is index-supported. The previous `LOWER(...).contains(...)` pattern is not.

*   **Note:** The `pg_trgm` index is silently ignored by SQLite in the test environment. All existing tests continue to pass without modification.

---

## Summary Checklist

| # | Phase | Issue | Status |
|---|---|---|---|
| 1 | 1 | Password hashing | ✅ Done |
| 2 | 1 | JWT expiration | ✅ Done |
| 3 | 1 | Rate limiting (login) | ✅ Done |
| 4 | 1 | 401 handling | ✅ Done |
| 5 | 1 | CI/CD linting | ✅ Done |
| 6 | 1 | Config validation | ✅ Done |
| 7 | 2 | Dockerfiles | ✅ Done |
| 8 | 2 | docker-compose | ✅ Done |
| 9 | 2 | TanStack Query | ✅ Done |
| 10 | 2 | Zustand auth store | ✅ Done |
| 11 | 2 | React Hook Form + Zod | ✅ Done |
| 12 | **3** | **Hardcoded JWT secret** | ☐ TODO |
| 13 | **3** | **localStorage XSS risk** | ☐ TODO |
| 14 | **3** | **Debug log in production** | ☐ TODO |
| 15 | **3** | **No server-side password policy** | ☐ TODO |
| 16 | **4** | **Deprecated GenericModel** | ☐ TODO |
| 17 | **4** | **N+1 query in validate_assignments** | ☐ TODO |
| 18 | **4** | **is_active ignored in listing** | ☐ TODO |
| 19 | **4** | **No Alembic migrations** | ☐ TODO |
| 20 | **4** | **get_session missing cleanup** | ☐ TODO |
| 21 | **4** | **Rate limiting gaps (register/upload)** | ☐ TODO |
| 22 | **4** | **No /health endpoint** | ☐ TODO |
| 23 | **4** | **Hierarchy endpoint unbounded** | ☐ TODO |
| 24 | **4** | **can_manage_grade excludes coordinators** | ☐ TODO |
| 25 | **5** | **QuestionForm useEffect edit bug** | ☐ TODO |
| 26 | **5** | **Image URL undefined in Dashboard** | ☐ TODO |
| 27 | **5** | **No React Error Boundary** | ☐ TODO |
| 28 | **5** | **queryClient.invalidateQueries() too broad** | ☐ TODO |
| 29 | **5** | **fetchMe no short-circuit** | ☐ TODO |
| 30 | **5** | **Vite proxy audit** | ☐ TODO |
| 31 | **5** | **No shared API error utility** | ☐ TODO |
| 32 | **6** | **Bare except: in tests** | ☐ TODO |
| 33 | **6** | **seed_admin plaintext password** | ☐ TODO |
| 34 | 7 | Frontend tests (Vitest) | ☐ TODO |
| 35 | 7 | Type generation | ☐ TODO |
| 36 | 7 | DOMPurify sanitization | ☐ TODO |
| 37 | 7 | Backend SQL audit | ☐ TODO |
| 38 | **8** | **Question CSV export** | ☐ TODO |
| 39 | **8** | **Bulk delete on question list** | ☐ TODO |
| 40 | **8** | **FTS index on question_text** | ☐ TODO |
