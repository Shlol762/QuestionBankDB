# Implementation Plan: QuestionBankDB Refinement

This document outlines the step-by-step actions required to elevate QuestionBankDB from a solid prototype to a production-ready enterprise application. The tasks are prioritized by impact and stability.

---

## Phase 1: Critical Security & Foundations (High Priority) - **COMPLETED**
*Goal: Secure the application, enforce code quality, and stabilize the environment.*

### 1.1 Secure Authentication & Rate Limiting (Completed)
*   **Step 1: Verify Password Hashing** (Done)
*   **Step 2: Enforce JWT Expiration** (Done)
*   **Step 3: Implement Rate Limiting** (Done)
*   **Step 4: Frontend 401 Handling** (Verified)

### 1.2 CI/CD Quality Gates (Completed)
*   **Step 1: Create Linting Workflow** (Done)

### 1.3 Environment Isolation (Completed)
*   **Step 1: Strict Config Validation** (Done)
*   **Step 2: Documentation** (Done)

---

## Phase 2: Architectural Refinement (Medium Priority) - **COMPLETED**
*Goal: Standardize deployment and improve frontend maintainability.*

### 2.1 Containerization (Completed)
**Objective:** "Write once, run anywhere."

*   **Step 1: Backend Dockerfile**
    *   **Action:** Create `Dockerfile` in root. Use a multi-stage build (python:3.11-slim) to keep the image small. (Done)
*   **Step 2: Frontend Dockerfile**
    *   **Action:** Create `frontend/Dockerfile`. Build the React app (node:18) and serve static files with NGINX (nginx:alpine). (Done)
*   **Step 3: Orchestration**
    *   **Action:** Create `docker-compose.yml`.
    *   **Services:** `db` (Postgres), `backend` (FastAPI), `frontend` (Nginx serving React). (Done)

### 2.2 Frontend State Management & Forms (Completed)
**Objective:** Reduce complexity and bugs in the UI.

*   **Step 1: Adopt TanStack Query**
    *   **Action:** Install `@tanstack/react-query`. (Done - was already installed)
    *   **Refactor:** Update `UserManagement.tsx` and `CurriculumManager.tsx`. Replace `useEffect` data fetching with `useQuery`. Replace manual mutations with `useMutation`. (Done - Refined with AuthStore)
*   **Step 2: Global Client State**
    *   **Action:** Install `zustand`. (Done)
    *   **Refactor:** If you have props passed down more than 2 levels (prop drilling), move that state to a Zustand store (e.g., `useAuthStore`). (Done - Created `authStore` and integrated it)
*   **Step 3: Robust Forms**
    *   **Action:** Install `react-hook-form` and `zod`. (Done)
    *   **Refactor:** Rewrite `QuestionForm.tsx`. Define the validation schema with Zod. Use `useForm` hooks to handle input registration and validation. (Done)

---

## Phase 3: Testing & Polish (Low Priority)
*Goal: Ensure long-term reliability and developer efficiency.*

### 3.1 Frontend Testing
**Objective:** Catch UI regressions.

*   **Step 1: Setup Vitest**
    *   **Action:** Install `vitest`, `jsdom`, `@testing-library/react`.
    *   **Action:** Update `vite.config.ts` to include test configuration.
*   **Step 2: Write Tests**
    *   **Action:** Create `frontend/src/utils.test.ts` (unit tests) and simple component tests.

### 3.2 Automated Type Generation
**Objective:** Eliminate backend-frontend type mismatch.

*   **Step 1: Setup Generator**
    *   **Action:** Install `openapi-typescript-codegen` (dev dependency).
    *   **Action:** Add a script to `package.json`: `"generate-client": "openapi --input http://localhost:8000/openapi.json --output ./src/client --client axios"`.
*   **Step 2: Integration**
    *   **Action:** Run the script and replace manual interfaces with generated ones.

### 3.3 Security Polish
**Objective:** Harden against XSS and Injection.

*   **Step 1: Sanitize Inputs**
    *   **Action:** Install `dompurify` (frontend).
    *   **Usage:** Wherever `dangerouslySetInnerHTML` is used (e.g., displaying rendered questions), wrap the content in `DOMPurify.sanitize()`.
*   **Step 2: Backend Audit**
    *   **Action:** grep for `text(...)` or `%` formatting in SQL queries. Ensure strictly `session.exec(select(...))` is used.
