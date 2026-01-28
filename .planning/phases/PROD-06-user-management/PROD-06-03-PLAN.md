---
phase: PROD-06-user-management
plan: 03
type: execute
wave: 2
depends_on:
  - PROD-06-01
  - PROD-06-02
files_modified: []
autonomous: false

must_haves:
  truths:
    - "Admin can create users with all 4 roles"
    - "Invitation email is sent or logged in development"
    - "User can accept invitation and log in"
    - "Role changes take effect immediately"
    - "Last Super Admin cannot be deactivated"
    - "Deactivated users lose access immediately"
    - "Non-admin users cannot access user management endpoints"
  artifacts: []
  key_links: []
---

<objective>
Manual testing verification of user management system production readiness.

Purpose: After fixing the database schema (Plan 01) and credentials bug (Plan 02), systematically verify all user management functionality works end-to-end following the research testing checklist.

Output: Test results documented, any issues identified for follow-up plans.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-06-user-management/PROD-06-RESEARCH.md
@.planning/phases/PROD-06-user-management/CONTEXT.md
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
User management system with fixes:
- Database migration for 4-role system (Plan 01)
- Credentials fix for cookie auth (Plan 02)
- Existing user CRUD API endpoints
- Existing invitation system
- Permission enforcement middleware
  </what-built>
  <how-to-verify>
**Pre-Testing Setup:**
1. Apply database migration:
   ```bash
   npx tsx database/migrate.ts
   ```
2. Start local dev server: `npm run dev`
3. Ensure you have at least 2 Super Admin accounts (for last-admin testing)

---

## USER-01: User Creation & Invitations

**Test Group A: User Creation (as Super Admin)**

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U01-01 | Create Super Admin | 1. Login as Super Admin<br>2. Go to User Management<br>3. Click "Add User"<br>4. Enter email, name, role=Super Admin<br>5. Save | User created, magic link logged to console | [ ] |
| U01-02 | Create Project Manager | Same as above with role=Project Manager | User created with PM role | [ ] |
| U01-03 | Create Team Member | Same as above with role=Team Member | User created with TM role | [ ] |
| U01-04 | Create Client | Same as above with role=Client | User created with Client role | [ ] |
| U01-05 | Duplicate email rejection | Create user with existing email | 409 error with clear message | [ ] |
| U01-06 | Required field validation | Try creating user without name or email | Validation error shown | [ ] |

**Test Group B: Magic Link Flow**

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U01-07 | Magic link in console | Check server console after user creation | Magic link URL logged | [ ] |
| U01-08 | Accept magic link | Copy link from console, paste in browser | User logged in, redirected to portal | [ ] |
| U01-09 | Expired token | Wait 15+ minutes, try link again | "Token expired" error | [ ] |

---

## USER-02: Role Management

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U02-01 | View users list | Navigate to User Management | All users visible with roles | [ ] |
| U02-02 | Filter by role | Use role dropdown filter | Only matching roles shown | [ ] |
| U02-03 | Search by name/email | Type in search box | Results filtered in real-time | [ ] |
| U02-04 | Change role | Edit user, change role, save | Role updated immediately | [ ] |
| U02-05 | Verify role change effect | Change PM to Team Member | PM loses admin access | [ ] |

---

## USER-03: User Deactivation

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U03-01 | Deactivate regular user | 1. Click deactivate on non-admin<br>2. Enter reason (10+ chars)<br>3. Confirm | User marked inactive | [ ] |
| U03-02 | Session invalidated | Check if deactivated user still logged in | User should be logged out | [ ] |
| U03-03 | Deactivated user login | Try magic link for deactivated user | Login rejected or fails | [ ] |
| U03-04 | Last Super Admin protection | Try to deactivate last Super Admin | Error: "Cannot deactivate last Super Admin" | [ ] |
| U03-05 | Deactivation reason required | Try deactivating without reason or with <10 chars | Validation error | [ ] |
| U03-06 | Deactivated user appears inactive | Check user list | Shows as "Inactive" status | [ ] |

---

## USER-04: Permission System

**Test Group A: Access Control**

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U04-01 | Super Admin access | Login as Super Admin, access User Management | Full access | [ ] |
| U04-02 | PM cannot manage users | Login as Project Manager | User Management not visible or 403 | [ ] |
| U04-03 | Team Member cannot manage users | Login as Team Member | User Management not visible or 403 | [ ] |
| U04-04 | Client cannot manage users | Login as Client | User Management not visible or 403 | [ ] |

**Test Group B: API-Level Security**

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| U04-05 | Unauthenticated API call | `curl http://localhost:5173/api/users-list` | 401 Unauthorized | [ ] |
| U04-06 | PM direct API call | Login as PM, try users-create via console | 403 Forbidden | [ ] |
| U04-07 | Rate limiting | Make 21 rapid requests to users-list | 429 Too Many Requests | [ ] |

---

## Security Tests

| ID | Test | Steps | Expected | Status |
|----|------|-------|----------|--------|
| SEC-01 | SQL injection attempt | Create user with email `'; DROP TABLE users;--` | Input sanitized, no SQL execution | [ ] |
| SEC-02 | XSS in name field | Create user with name `<script>alert('xss')</script>` | HTML escaped, no script execution | [ ] |
| SEC-03 | Invalid role in API | POST to users-create with role="hacker" | Validation error (400) | [ ] |

---

## Test Results Summary

After testing, record:
- Total tests: 25
- Passed: ___
- Failed: ___
- Blocked: ___

**Issues Found:**
(List any bugs discovered during testing)

1. [Issue description]
2. [Issue description]
  </how-to-verify>
  <resume-signal>
Type "all tests pass" if all 25 checks succeed.
Type "issues found: [list issues]" to document problems for follow-up plans.
  </resume-signal>
</task>

</tasks>

<verification>
All USER-01, USER-02, USER-03, USER-04 test cases executed and documented.
</verification>

<success_criteria>
1. All USER-01 tests pass (User Creation & Invitations)
2. All USER-02 tests pass (Role Management)
3. All USER-03 tests pass (User Deactivation)
4. All USER-04 tests pass (Permission System)
5. All Security tests pass
6. No critical/blocking issues remain
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-06-user-management/PROD-06-03-SUMMARY.md` with:
- Test execution date
- Results for each test category
- Any issues discovered
- Follow-up actions if needed
- Overall phase completion status
</output>
