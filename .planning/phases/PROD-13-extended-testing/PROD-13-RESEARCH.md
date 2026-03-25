# Phase PROD-13: Extended Testing - Research

**Research Date:** 2026-01-29
**Phase Goal:** Complete remaining manual tests requiring browser/Gemini (12 non-AI tests)
**Approach:** Extend PROD-05 test infrastructure + interactive browser testing

---

## Executive Summary

PROD-05 established a solid test foundation with 11/11 core tests passing. This phase extends that work to cover 12 additional tests across task creation, state machine, comments, and permissions. The existing `test-runner.js` can be extended for API-level tests, while browser-specific flows require guided manual testing.

**Key Finding:** Most tests can be automated via API except for UI-specific scenarios (e.g., visibility toggles, comment editing time windows, cross-client browser verification).

---

## 1. Existing Test Infrastructure Analysis

### 1.1 PROD-05 Test Runner (`test-runner.js`)

**Location:** `.planning/phases/PROD-05-task-management/test-runner.js`

**Strengths:**
- ✅ JWT token generation for both admin and client users
- ✅ Generic `apiCall()` helper with auth support
- ✅ Structured test result logging (✅ PASS / ❌ FAIL)
- ✅ Clean test organization by category (T01-xx, T03-xx, etc.)
- ✅ Validation of state transitions and permissions
- ✅ Uses existing seed data (PROJECT_ID: `c0d3d714-440a-4578-baee-7dfc0d780436`)

**Current Coverage:**
- Task Creation: 2/6 tests (T01-01, T01-05)
- State Machine: 6/7 tests (T03-01 through T03-08)
- Comments: 1/5 tests (T05-01)
- Permissions: 2/6 tests (T06-01, T06-03)

**Test Users in Runner:**
```javascript
ADMIN_USER = {
  id: 'f81e3f1c-218d-4a61-a607-f1e7fb8d1479',
  email: 'sarah@motionify.com',
  role: 'super_admin'
}

CLIENT_USER = {
  id: 'e1e1e3de-fae9-4684-8bab-2fb03826029e',
  email: 'mike@techcorp.com',
  role: 'client'
}
```

### 1.2 Backend Task API Analysis

**Endpoint:** `netlify/functions/tasks.ts`

**Key Features:**
- State transition validation (lines 29-38)
- Permission checks (clients cannot create tasks, lines 446-460)
- Client visibility filtering (lines 162-167)
- Follow/unfollow endpoints (lines 295-438)
- Comment support with @mention detection (lines 206-292)
- Assignment notifications (lines 498-534)
- Revision request workflow (lines 599-670)

**State Machine (Backend):**
```javascript
validTransitions = {
  'pending': ['in_progress', 'completed'],
  'in_progress': ['awaiting_approval', 'completed', 'pending'],
  'awaiting_approval': ['completed', 'revision_requested', 'in_progress'],
  'revision_requested': ['in_progress'],
  'completed': [] // Terminal state
}
```

**Frontend State Machine Discrepancy:**
- Frontend (`taskStateTransitions.ts`) allows `COMPLETED → IN_PROGRESS` (reopen)
- Backend treats `completed: []` as terminal (no transitions allowed)
- **Decision Needed:** Should completed tasks be reopenable?

### 1.3 Database Schema

**Tasks Table Columns (from migrations):**
- `id`, `project_id`, `title`, `description`, `stage` (maps to `status`)
- `is_client_visible` (maps to `visibleToClient`)
- `assigned_to`, `due_date`, `position`, `created_by`
- `created_at`, `updated_at`

**Task Stage Enum (migration 007):**
```sql
'pending', 'in_progress', 'awaiting_approval', 'completed', 'revision_requested'
```

**Note:** Database still contains unused `review` value (migration 007 added new values but couldn't remove old ones).

**Related Tables:**
- `task_comments` (with `user_name` denormalization, migration 006)
- `task_followers` (for follow/unfollow feature)

### 1.4 Frontend Types

**TaskStatus Enum (frontend):**
```typescript
enum TaskStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  AWAITING_APPROVAL = 'Awaiting Approval',
  COMPLETED = 'Completed',
  REVISION_REQUESTED = 'Revision Requested',
}
```

**Issue:** Frontend uses title-case display values, backend uses snake_case. The API maps between them (`stage` → `status`).

---

## 2. Test Requirements Breakdown

### 2.1 Tests Not Yet Run (from PROD-05-UAT-RESULTS.md)

#### Task Creation (4 tests)
- **T01-02:** Task with assignee (needs team member data)
  - **API-testable:** YES
  - **Complexity:** Low (add `assigned_to` field to POST /tasks)
  - **Prereq:** Need valid user ID from database

- **T01-03:** Task with deadline
  - **API-testable:** YES
  - **Complexity:** Low (add `dueDate` field to POST /tasks)
  - **Validation:** Ensure date format accepted

- **T01-04:** Task visibility toggle
  - **API-testable:** PARTIAL (needs browser confirmation)
  - **Complexity:** Medium
  - **Why browser:** Must verify UI checkbox works AND client view filtered correctly

- **T01-06:** Task linked to deliverable
  - **API-testable:** YES
  - **Complexity:** Low (add `deliverableId` to POST /tasks)
  - **Prereq:** Need valid deliverable ID from project

#### State Machine (2 tests)
- **T03-04:** AWAITING_APPROVAL → REVISION_REQUESTED
  - **API-testable:** YES
  - **Complexity:** Low (already supported in backend state machine)

- **T03-05:** REVISION_REQUESTED → IN_PROGRESS
  - **API-testable:** YES
  - **Complexity:** Low (already supported in backend state machine)

#### Assignment & Notifications (5 tests)
- **T04-01:** Assign task to team member
  - **API-testable:** YES (covered by T01-02)
  - **Complexity:** Low

- **T04-02:** Assignment notification
  - **API-testable:** PARTIAL (check email sent, but verify email content manually)
  - **Complexity:** Medium
  - **Note:** Backend sends emails via `sendTaskAssignmentEmail()` (lines 499-534)

- **T04-03:** @mention in comment
  - **API-testable:** PARTIAL
  - **Complexity:** Medium
  - **Backend:** Already implemented (lines 232-286)
  - **Test:** Post comment with `@Name`, verify email sent

- **T04-04:** Follow/unfollow task
  - **API-testable:** YES
  - **Complexity:** Low
  - **Endpoints:** POST `/tasks/{id}/follow` and `/tasks/{id}/unfollow` (lines 295-438)

- **T04-05:** Reassign task
  - **API-testable:** YES
  - **Complexity:** Low (PATCH `/tasks/{id}` with new `assignedTo`)

#### Comments (4 tests)
- **T05-02:** Edit comment within 1 hour
  - **API-testable:** NO (time-based UI validation)
  - **Complexity:** High
  - **Reason:** Frontend controls edit button visibility, backend may not enforce

- **T05-03:** Edit comment after 1 hour
  - **API-testable:** NO (same as T05-02)
  - **Complexity:** High

- **T05-04:** @mention autocomplete
  - **API-testable:** NO (UI-only feature)
  - **Complexity:** Low (may not be implemented)
  - **Decision:** Skip if feature doesn't exist

- **T05-05:** Client can comment
  - **API-testable:** YES
  - **Complexity:** Low (POST comment as client user)

#### Permissions (4 tests)
- **T06-02:** Client cannot edit tasks
  - **API-testable:** YES
  - **Complexity:** Low (PATCH task as client, expect 403)

- **T06-04:** Client A cannot see Client B's tasks
  - **API-testable:** PARTIAL (needs two browser sessions)
  - **Complexity:** High
  - **Reason:** True isolation requires separate client logins
  - **Alternative:** Create tasks under different projects, verify API filtering

- **T06-05:** Client PM can approve
  - **API-testable:** YES (if client PM role exists)
  - **Complexity:** Medium
  - **Note:** Check if "client PM" is a valid role in the system

- **T06-06:** Non-PM client cannot approve
  - **API-testable:** YES
  - **Complexity:** Medium

### 2.2 Test Categorization

**API-Automatable (7 tests):**
- T01-02 (assignee), T01-03 (deadline), T01-06 (deliverable link)
- T03-04, T03-05 (state transitions)
- T04-04 (follow/unfollow)
- T05-05 (client comments)

**API + Manual Verification (3 tests):**
- T04-02 (assignment notification - check email)
- T04-03 (@mention - check email)
- T06-02 (client edit blocked)

**Browser-Only (2 tests):**
- T05-02, T05-03 (comment edit time windows)
- T01-04 (visibility toggle UI + verification)
- T06-04 (cross-client isolation - needs 2 sessions)

**Conditional/Skipped (2 tests):**
- T05-04 (@mention autocomplete - skip if not built)
- T06-05, T06-06 (client PM approval - skip if role doesn't exist)

---

## 3. Test Data & Environment Setup

### 3.1 Seed Data Users

**From PROD-05 and codebase context:**

**Admin/Team Users:**
- `sarah@motionify.com` (super_admin, ID: `f81e3f1c-218d-4a61-a607-f1e7fb8d1479`)
- Admin user from schema: `admin@motionify.com`

**Client Users:**
- `mike@techcorp.com` (client, ID: `e1e1e3de-fae9-4684-8bab-2fb03826029e`)
- `ekalaivan+c@gmail.com` (client, ID: `aa444444-4444-4444-4444-444444444444`)
- `alex@acmecorp.com` (client, used in PROD-04 isolation testing)

**Test Project:**
- Project ID: `c0d3d714-440a-4578-baee-7dfc0d780436` (used in test-runner.js)

### 3.2 Environment Configuration

**Backend:**
- Run via Netlify Dev: `netlify dev` (runs on port 8888)
- Base URL: `http://localhost:8888/.netlify/functions`

**Frontend:**
- Run via Vite: `npm run dev` (runs on port 5173)
- Client portal: `http://localhost:5173`

**Database:**
- PostgreSQL via `DATABASE_URL` env variable
- Migrations applied through `007_add_task_stage_enum_values.sql`

**JWT Configuration:**
- Secret: `process.env.JWT_SECRET`
- Issuer: `motionify-platform`
- Audience: `motionify-users`

---

## 4. Technical Considerations

### 4.1 State Machine Alignment

**Known Issue (from PROD-05 tech debt):**
- Frontend allows `COMPLETED → IN_PROGRESS` reopen
- Backend blocks all transitions from `completed: []`
- Test T03-06 validates backend correctly rejects reopening

**Decision Needed:** Should this phase fix the frontend discrepancy?

**Recommendation:** Document as "working as designed" - completed is terminal per backend contract.

### 4.2 Comment Editing Time Windows

**Frontend Implementation Check Needed:**
- Does TaskList.tsx enforce 1-hour edit window?
- Does backend validate edit permissions?
- Comment schema has `updated_at` but no explicit edit history

**Test Approach:**
1. Create comment, attempt immediate edit (should work)
2. Mock system time or wait 61 minutes, attempt edit (should fail or show different UI)
3. Document current behavior (may be unimplemented)

### 4.3 Cross-Client Isolation

**PROD-04 Verification (from STATE.md):**
> "DEL-04: Permissions verified (client isolation working - alex@acmecorp.com cannot see ekalaivan+c's projects)"

**T06-04 Test Strategy:**
1. Use existing test: Alex (Client B) cannot see Client A's tasks
2. API-level: Generate JWTs for both clients, query `/tasks?projectId=X` as each
3. Browser-level: Open two incognito windows, log in as each client, verify UI

### 4.4 Email Notifications

**Backend Integration:**
- `sendTaskAssignmentEmail()` implemented (tasks.ts:517)
- `sendMentionNotification()` implemented (tasks.ts:270)
- Resend library imported but may need API key

**Test Verification:**
1. Check console logs for "Sent assignment email to..."
2. If Resend configured, check actual inbox
3. Document email content format

### 4.5 Follow/Unfollow Feature

**Backend Endpoints Present:**
- POST `/tasks/{id}/follow` (lines 295-367)
- POST `/tasks/{id}/unfollow` (lines 369-438)

**Database Table:**
- `task_followers` (task_id, user_id unique constraint)

**Test Coverage:**
- Verify follow adds to `task_followers`
- Verify unfollow removes from `task_followers`
- Verify duplicate follow is idempotent (ON CONFLICT DO NOTHING)

---

## 5. Recommended Test Execution Plan

### Phase 1: Extend test-runner.js (API Tests)

**New Test Functions:**
```javascript
// Task Creation
testT01_02_TaskWithAssignee()
testT01_03_TaskWithDeadline()
testT01_06_TaskLinkedToDeliverable()

// State Machine
testT03_04_AwaitingApprovalToRevisionRequested()
testT03_05_RevisionRequestedToInProgress()

// Assignment & Notifications
testT04_04_FollowUnfollowTask()

// Comments
testT05_05_ClientCanComment()

// Permissions
testT06_02_ClientCannotEditTask()
```

**Total:** 8 new automated tests

### Phase 2: Guided Manual Browser Testing

**Interactive Checklist (Claude-guided):**

1. **T01-04: Visibility Toggle**
   - Claude: "Open task creation modal, toggle 'Visible to Client' off, create task"
   - User: Reports whether task appears in client view
   - Claude: Verifies via API call

2. **T05-02/T05-03: Comment Edit Time Windows**
   - Claude: "Add a comment, click edit immediately"
   - User: Reports if edit button is visible
   - Claude: Walks through 1-hour scenario (or documents as not implemented)

3. **T06-04: Cross-Client Isolation**
   - Claude: "Open two browsers, log in as ekalaivan+c and alex@acmecorp"
   - User: Reports whether each client sees only their tasks
   - Claude: Confirms via API validation

4. **T04-02: Assignment Notification**
   - Claude runs automated test, asks: "Check inbox for sarah@motionify.com"
   - User confirms email received (or Claude checks console logs)

5. **T04-03: @mention Notification**
   - Claude posts comment with @Sarah Chen
   - User checks email/logs for notification

**Total:** 5 guided browser tests

### Phase 3: Bug Fixes Inline

**Expected Issues:**
- Comment edit window may not be implemented → Document as "not enforced"
- @mention autocomplete may not exist → Skip test
- Client PM role may not exist → Skip tests T06-05/T06-06
- Email notifications may be console-only → Document for PROD-14

**Fix Strategy:**
- Fix bug → Re-run test → Document as "pass-after-fix"
- Don't defer small fixes (per CONTEXT.md decision)

---

## 6. Missing Information & Questions

### 6.1 Clarification Needed

1. **Test User Passwords:**
   - How to log in as `mike@techcorp.com` and other clients in browser?
   - Magic link flow or test credentials?
   - **Answer:** Likely JWT cookies set via dev tools or magic link

2. **Client PM Role:**
   - Does the system support "client_pm" role?
   - User schema shows: `super_admin`, `project_manager`, `team_member`, `client`
   - **Likely Answer:** No client PM role → Skip T06-05/T06-06

3. **Comment Edit Backend Validation:**
   - Does backend enforce 1-hour edit window?
   - Or is it frontend-only?
   - **Research Needed:** Check for edit endpoint in tasks.ts (not found in review)

4. **Deliverable IDs for Testing:**
   - Need valid deliverable ID for T01-06
   - Query project `c0d3d714-440a-4578-baee-7dfc0d780436` for deliverables

### 6.2 Files to Reference During Planning

**Essential:**
- `.planning/phases/PROD-05-task-management/test-runner.js` (extend this)
- `.planning/phases/PROD-05-task-management/PROD-05-UAT-RESULTS.md` (test definitions)
- `netlify/functions/tasks.ts` (backend validation logic)
- `landing-page-new/src/lib/portal/types.ts` (frontend types)

**Supporting:**
- `database/schema.sql` (task table structure)
- `database/migrations/007_add_task_stage_enum_values.sql` (enum values)
- `landing-page-new/src/lib/portal/components/TaskList.tsx` (UI logic)
- `landing-page-new/src/lib/portal/utils/taskStateTransitions.ts` (frontend state machine)

---

## 7. Risk Assessment

### Low Risk
- ✅ API-level tests (8 tests) - straightforward extensions
- ✅ Follow/unfollow feature - backend endpoints ready
- ✅ State transition tests - backend state machine clear

### Medium Risk
- ⚠️ Email notifications - may be console-only (Resend config?)
- ⚠️ Visibility toggle - UI and API must align
- ⚠️ Cross-client isolation - requires careful JWT management

### High Risk
- 🔴 Comment edit time windows - feature may not be implemented
- 🔴 @mention autocomplete - feature may not exist
- 🔴 Client PM approval - role may not exist in schema

**Mitigation:** Skip unimplemented features, document as deferred.

---

## 8. Success Criteria

### Phase Complete When:
1. ✅ 8 new API tests added to test-runner.js and passing
2. ✅ 5 guided browser tests completed with user confirmation
3. ✅ All inline bugs fixed and re-tested
4. ✅ Deployment readiness verdict documented (GO/NO-GO)
5. ✅ `PROD-13-01-SUMMARY.md` created with:
   - Test results table (12 tests × pass/fail/skip)
   - Bugs found and fixed
   - Skipped tests with rationale
   - Deployment recommendation

### Deployment Blockers:
- ❌ Any permission bypass (e.g., client can edit tasks)
- ❌ Cross-client data leak (Client A sees Client B's tasks)
- ❌ State machine violation (invalid transition allowed)

### Acceptable Skips:
- ✅ @mention autocomplete (nice-to-have UI)
- ✅ Comment edit enforcement (if not built)
- ✅ Client PM tests (if role doesn't exist)

---

## 9. Planning Guidance

### What You Need to Know to PLAN This Phase Well:

1. **Extend test-runner.js systematically:**
   - Copy existing test patterns (e.g., `testT01_01` → `testT01_02`)
   - Use `ADMIN_TOKEN` and `CLIENT_TOKEN` for auth
   - Return test result with `logResult(testId, name, passed, details)`

2. **Guided browser testing approach:**
   - Write clear step-by-step instructions for user
   - User reports what they see
   - Claude validates via API call
   - Document screenshots only on failure

3. **Inline bug fix protocol:**
   - Identify bug during test
   - Fix immediately (if small)
   - Re-run test
   - Document as "pass-after-fix" with commit reference

4. **Test data setup:**
   - Use existing PROJECT_ID: `c0d3d714-440a-4578-baee-7dfc0d780436`
   - Query database for valid `assigned_to` user IDs
   - Query project for valid `deliverable_id`
   - Generate JWT tokens for different client users

5. **Skip strategy:**
   - If feature doesn't exist (e.g., @mention autocomplete), document and skip
   - If feature is broken but non-critical, defer to separate phase
   - If feature is broken and critical (permissions), fix inline

6. **Deployment verdict format:**
   ```markdown
   ## Deployment Readiness: [GO / NO-GO]

   **Passed:** 10/12 tests
   **Skipped:** 2/12 tests (@mention autocomplete, comment edit enforcement - not implemented)
   **Failed:** 0/12 tests

   **Blockers:** None
   **Recommendation:** DEPLOY to production
   ```

7. **Email notification verification:**
   - Check console logs for "Sent ... email to ..."
   - If Resend configured, check actual inbox
   - Document current behavior (working/console-only)

8. **State machine discrepancy:**
   - Frontend allows `COMPLETED → IN_PROGRESS`
   - Backend blocks it (terminal state)
   - Document as "working as designed per backend contract"
   - Frontend should be updated in future phase if needed

---

## 10. Next Steps

**After Research Phase:**
1. Create `PROD-13-01-PLAN.md` with:
   - 8 API test implementations (code snippets)
   - 5 guided browser test checklists (step-by-step)
   - Bug fix protocol (find → fix → re-test → document)
   - Final summary template

2. Identify test data prerequisites:
   - Query database for user IDs (assignees)
   - Query project for deliverable IDs
   - Confirm client user JWT generation works

3. Set execution expectations:
   - API tests run automatically (5-10 minutes)
   - Browser tests require user interaction (15-20 minutes)
   - Total phase duration: 1-2 hours including bug fixes

---

**Research Complete: Ready for Planning**

*Phase: PROD-13-extended-testing*
*Research Date: 2026-01-29*
