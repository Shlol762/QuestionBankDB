# 🚨 Comprehensive Brutal Test Report: Question Bank API & Frontend

**Date:** Sunday, 22 February 2026  
**Status:** 🔴 CRITICAL FAILURES DETECTED  
**Scope:** Authentication, Curriculum Management, Question Authoring, File Uploads, Role-Based Access Control (RBAC).

---

## 1. Executive Summary
A "Brutal Testing Series" was executed to evaluate the system's resilience against technical exploits, logical gaps, and common user errors in a school environment. The testing revealed significant vulnerabilities where the backend is overly trusting of input data and the frontend lacks the necessary sanitization to prevent "dirty" data from entering the pipeline. **Immediate remediation is required for File Upload Security and MCQ Data Integrity.**

---

## 2. Testing Methodology
### 2.1 Backend (Automated)
Using `pytest` and `httpx`, a suite of "brutal" test cases (`tests/test_brutal.py`) was run against an isolated SQLite test database. These tests simulated:
- **Case-sensitivity and whitespace exploits** in naming.
- **Out-of-range numeric inputs** (Negative marks).
- **Relational integrity bypass** (MCQs without options/answers).
- **Security bypasses** (File extension spoofing).
- **Concurrency & Race conditions** (Simultaneous updates).

### 2.2 Frontend (Static Logic Audit)
A manual audit of the React/TypeScript components (`QuestionForm`, `CurriculumManager`, `UserManagement`) was conducted to identify:
- Lack of client-side sanitization (`.trim()`).
- Missing pre-upload file validation (size/type).
- Brittle state management (LocalStorage corruption risks).

---

## 3. Detailed Test Results

| Test ID | Category | Scenario | Status | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **BT-01** | **Logical** | Create topic 'Algebra' then ' algebra ' | ❌ **FAIL** | Data Fragmentation (Duplicates) |
| **BT-02** | **Logical** | Create question with -5 marks | ❌ **FAIL** | Broken Grading Logic |
| **BT-03** | **Logical** | MCQ with NULL options / Invalid Answer | ❌ **FAIL** | App Crash on Render (Frontend) |
| **BT-04** | **Security** | Rename `script.py` to `syllabus.pdf` | ❌ **FAIL** | Remote Code Execution Risk |
| **BT-05** | **Security** | Upload `.exe` as question image | ❌ **FAIL** | Malware Distribution Risk |
| **BT-06** | **RBAC** | HOD "Math" gets access to ALL Math | ❌ **FAIL** | Unauthorized Data Access (Leak) |
| **BT-07** | **Security** | Delete last system administrator | ✅ **PASS** | System Lockout Prevented |
| **BT-08** | **Security** | Bypass Initial Setup Lockout | ✅ **PASS** | Unauthorized Admin Creation Prevented |
| **BT-09** | **Robustness** | 1MB Text Input in Question Field | ✅ **PASS** | Server Stability Maintained |
| **BT-10** | **Concurrency**| Simultaneous Update to same Question | ❌ **FAIL** | `IllegalStateChangeError` (DB Lock) |

---

## 4. Critical Findings & Edge Cases

### 4.1 The "Invisible Data" Bug (Whitespace)
**Finding:** Both frontend and backend accept "   " as a valid name.
**Edge Case:** A teacher accidentally hits space for a topic name. Other teachers see an empty folder in the curriculum but cannot delete it or "find" it easily, leading to phantom curriculum branches.

### 4.2 MCQ "Correct Answer" Mismatch
**Finding:** The backend accepts `answer_text="Option E"` even if the `options` dictionary only contains `{"A": "...", "B": "..."}`.
**Edge Case:** When a student (future feature) tries to take a test, the app will look for Option E, find nothing, and crash the student's browser.

### 4.3 Extension Spoofing
**Finding:** The system uses `filename.endswith('.pdf')` for security.
**Edge Case:** A student uploads a malicious script renamed to `StudyGuide.pdf`. If a teacher downloads this to their local machine, it could compromise the school's internal network.

### 4.4 Permission Over-Reach (HOD Leak)
**Finding:** Permission is granted via `Subject.subject_name`.
**Edge Case:** An HOD assigned to "Mathematics" in Grade 10 (Syllabus 2025) automatically gains access to "Mathematics" in Grade 10 (Syllabus 2026). They can modify/delete questions for a year they don't manage.

---

## 5. Action Plan for Remediation

### 🚨 Phase 1: Security & Integrity (Immediate)
1. **Backend Magic Number Check:** Implement `puremagic` in `curriculum_routes.py` to verify file headers (MIME type) instead of just extensions.
2. **Backend Range Validation:** Add `Pydantic` validators or route-level checks for `marks > 0` and `len(topic_name.strip()) > 0`.
3. **MCQ Parity Check:** In `create_question`, verify `answer_text` exists within the `options` keys.

### 🛠️ Phase 2: Frontend Sanitization (High Priority)
1. **The "Trim" Directive:** Add `.trim()` to all input handlers in `QuestionForm.tsx` and `CurriculumManager.tsx`.
2. **File Size Guard:** Add `if (file.size > 5 * 1024 * 1024) throw Error` before calling the upload API.
3. **Numeric Constraints:** Enforce `min="1"` and `max="100"` in the React state for the Marks field.

### 📈 Phase 3: Structural Refactoring (Medium Priority)
1. **ID-Based HOD Assignment:** Change `HODLink` to store `subject_id` instead of `subject_name` to scope permissions to specific syllabus branches.
2. **Concurrency Handling:** Review `AsyncSession` scoping to ensure concurrent requests don't share the same transaction state.

---
**Report Generated By:** Gemini CLI (Senior Engineer)  
**Verification Script:** `tests/test_brutal.py`
