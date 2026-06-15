# Complete UI/UX Refresh Plan

This document serves as the master architectural and aesthetic blueprint for the Question Bank Platform frontend overhaul. It covers macro layouts, unified paradigms, terminology, and minute interactions within every single modal, form, and setup screen.

## User Review Required

> [!WARNING]
> This is the definitive, fully-resolved master plan. All ambiguities—including typography, URL state management, and final backend route patching—have been addressed.
> Please hit **Proceed** to exit planning mode and begin execution!

---

## 1. Design System & Global Aesthetics

We are strictly enforcing a **"Vibrant Glassmorphism"** aesthetic across the entire application.

- **Typography**: We will import and standardize on **'Inter'** (via Google Fonts) for a sleek, highly legible, premium interface.
- **Color Palette**: Curated neon blues, fuchsia, and emerald accents.
- **Dark Mode First**: The UI is designed primarily for dark mode (sleek, deep grays/blacks) but fully supports a pristine light mode.
- **Glassmorphism Base**: Widespread use of `.glass` utility classes. This includes heavy `backdrop-blur`, semi-transparent backgrounds (`bg-white/10` or `bg-gray-900/50`), and subtle glowing box-shadows.
- **Input & Form Styling**: All traditional heavy borders on text inputs, textareas, and selects will be eradicated. Inputs will use frosted glass backgrounds and emit a subtle neon glow (`focus:ring`) when active.

## 2. Terminology & Naming Conventions

To ensure a premium, professional feel, we are standardizing all terminology:
- **App Name**: Extracted to an environment variable/constant (defaulting to a placeholder like "QB Portal" or similar) rather than hardcoded text.
- **Top Nav Labels**: Overview, Explorer, Platform (for config), Staff, Account.
- **Standardized Roles**: `System Administrator`, `Grade Coordinator`, `Department Head`, and `Faculty`.
- **Standardized Actions**: `Create`, `Save`, `Edit`, `Delete`, and `Cancel`.

## 3. Global Layout: The Top Navigation

- **[MODIFY] `App.tsx` & `Dashboard.tsx` layout**: We are completely discarding the traditional left-side navigation sidebar.
- **New Approach**: A **Sleek, Sticky Top Navigation Bar**. This frees up maximum horizontal screen real estate for complex data grids and forms. 
- **Search Bar Removal**: The global "Omni-search" bar in the top navigation has been completely removed to keep the header pristine. Search functionality is now localized to the Explorer.

---

## 4. The Core Paradigm: The Unified Explorer

We are completely merging the old "Curriculum Manager" and the "Question Repository" into a single, powerful interface (similar to macOS Finder or Notion).

### A. The Left Panel (Curriculum Tree)
- A sleek, glassmorphic panel pinned to the left side of the screen.
- Houses the drill-down curriculum structure: `Syllabus ➔ Grade ➔ Subject ➔ Topic`.
- **Deep Linking**: The selected node will be tracked in the URL (e.g., `?topic=12`) allowing users to bookmark and share specific views.
- **Inline Admin Actions**: Admins can Add/Edit/Delete Syllabuses or Topics directly within this tree via lightweight Frosted Glass dialogues.
- **Mobile Responsive**: On mobile devices, this left panel is hidden behind a "Browse Curriculum" button to save screen space, sliding out only when requested.

### B. The Main Panel (Dynamic Question Grid)
- The right side of the screen houses a **Modern Data Grid** for Questions.
- **Dynamic Filtering**: The grid instantly filters based on what is selected in the left panel.
- **New Question Button**: The primary "New Question" button lives at the top of this grid. If a user clicks it *without* having a topic selected on the left, the resulting drawer will force them to select a topic before proceeding.
- **Localized Search**: The grid features its own dedicated search bar.
- **Backend Data Alignment**: 
  - The grid will explicitly display the **Author Name** (`teacher_id`).
  - It will display the **Last Updated** timestamp.
  - The `status` (Draft/Published) and `is_active` fields will be merged into a single Status Badge.
  - Inline row expansion will be used to preview question details directly in the grid.

---

## 5. Modal & Form Internals (Micro-Interactions)

We are completely overhauling how data entry feels. Popups and Modals will be split into three distinct categories based on their complexity:

### A. Major Forms (Right-Sliding Drawers)
For complex, multi-field data entry, we will use a **Right-Sliding Drawer** instead of a central modal. This maintains the user's background context.
- **Question Creation Form Internals**: 
  - Inside the Drawer, the massive form will be broken into **Sectioned Accordions**.
  - *Group 1: Classification* (Topics, Difficulty, Marks).
  - *Group 2: Core Content* (Question text, images).
  - *Group 3: Answers & Options* (Existing type-specific editors placed inside the accordion).
  - *Rule*: Only one accordion section can be open at a time to drastically reduce cognitive load and visual clutter.
- **Staff Onboarding Internals**:
  - Inside the Drawer, the staff form will utilize a **Multi-step Wizard**.
  - *Step 1: Profile* (Name, Email, Password).
  - *Step 2: Roles* (Admin, Coordinator, HOD).
  - *Step 3: Subjects* (Direct teaching hooks).

### B. Mini-Forms (Frosted Glass Dialogues)
For simple 1-2 field forms (e.g., Add Subject, Add Topic, System Config additions).
- **Action**: These will remain centered on the screen but will be heavily redesigned as **Frosted Glass Dialogue Boxes**. They will be completely borderless, snappy, and designed for quick data entry and immediate dismissal.

### C. Destructive Actions (Glowing Red Safety Modals)
- **Action**: Delete modals will be visually entirely distinct from standard dialogue boxes.
- They will feature a **Glowing Red Glassmorphic** aesthetic (deep red frosted background, pulsating red shadows).
- **Safety Mechanism**: For critical deletions (like entire Syllabuses, Grades, or Users), the modal will require the user to manually type the item's name (or the word 'DELETE') before the red action button unlocks, preventing catastrophic misclicks.

---

## 6. Page-by-Page Summary & Edge Cases

- **First-Run Deployment (`Setup.tsx`)**: Replaced the outdated split-screen with a **Centered Frosted Glass Card** floating over an animated background.
- **Login Screen (`Login.tsx`)**: Identical aesthetic to the Setup page for maximum front-to-back consistency (Animated background + Floating glass card).
- **Dashboard Overview (`DashboardOverview.tsx`)**: The landing page widgets will be upgraded to Frosted Glass cards with vibrant, glowing neon lucide icons.
- **Staff Management (`UserManagement.tsx`)**: The staff table will feature a new **Role Filter** dropdown at the top. *(Note: This requires a minor backend patch to `auth_routes.py` to allow filtering paginated users efficiently by role).*
- **Platform Config (`SystemConfigManager.tsx`)**: 
  - Will explicitly expose the **Active/Inactive toggle** (allowing admins to soft-delete subjects/grades so historical curriculums don't break).
  - Will explicitly display **Recommendation Notes** directly in the UI to help guide faculty.

---

## Verification & Execution Plan

### Phase 1: Foundation & Global Layout
- Update `tailwind.config.js` and `index.css` with the new color palette and `.glass` utilities.
- Implement 'Inter' font.
- Build the new Sticky Top Navigation Bar and remove the Sidebar.

### Phase 2: Form Infrastructure (The Drawers & Modals)
- Implement the `Drawer.tsx` component with Accordion and Wizard sub-components.
- Redesign `Modal.tsx` into the two new variants: Frosted Glass Dialogue and Glowing Red Warning Dialogue.

### Phase 3: Page Refactoring
- Refactor `Setup.tsx` and `Login.tsx` (Floating cards).
- Build the **Unified Explorer** (Merge Curriculum and Questions into the Left Panel + Right Grid architecture).
- Refactor `UserManagement.tsx` (Wizard Drawer) and patch `auth_routes.py`.
- Refactor `QuestionForm.tsx` (Accordion Drawer).
- Refactor `SystemConfigManager.tsx`.
