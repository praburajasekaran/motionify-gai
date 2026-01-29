---
phase: PROD-13-extended-testing
plan: 02
type: execute
wave: 2
depends_on: ["PROD-13-01"]
files_modified:
  - .planning/phases/PROD-13-extended-testing/PROD-13-TESTING-RESULTS.md
autonomous: false

must_haves:
  truths:
    - "Task visibility toggle works (internal task hidden from client view)"
    - "Comment editing behavior documented (time window enforcement or lack thereof)"
    - "Cross-client isolation verified (Client A cannot see Client B's tasks)"
    - "Deployment readiness verdict issued (GO/NO-GO)"
  artifacts:
    - path: ".planning/phases/PROD-13-extended-testing/PROD-13-TESTING-RESULTS.md"
      provides: "Complete test results with deployment verdict"
      min_lines: 50
  key_links:
    - from: "PROD-13-TESTING-RESULTS.md"
      to: "PROD-05-UAT-RESULTS.md"
      via: "Extends original test results"
      pattern: "T01|T03|T04|T05|T06"
---

<objective>
Complete 4 browser-guided tests that cannot be fully automated via API, then produce the final deployment readiness verdict document combining API test results (from Plan 01) with browser test results.

Purpose: Close all remaining test coverage gaps and produce a GO/NO-GO deployment decision.
Output: PROD-13-TESTING-RESULTS.md with full test matrix and deployment verdict.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-13-extended-testing/PROD-13-01-SUMMARY.md
@.planning/phases/PROD-13-extended-testing/CONTEXT.md
@.planning/phases/PROD-13-extended-testing/PROD-13-RESEARCH.md
@netlify/functions/tasks.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: API-verify browser-testable items where possible</name>
  <files>.planning/phases/PROD-13-extended-testing/PROD-13-TESTING-RESULTS.md</files>
  <action>
Before involving the user in browser testing, attempt API-level verification for as much as possible:

**T01-04 (Visibility Toggle) — API portion:**
1. Create a task with `visible_to_client: false` as admin
2. GET `/tasks?projectId=${PROJECT_ID}&userRole=client` as client
3. Verify the internal task does NOT appear in client results
4. Update task to `visible_to_client: true` via PATCH
5. GET tasks as client again, verify it now appears
6. If API test passes, the browser test only needs to confirm the UI toggle works

**T06-04 (Cross-Client Isolation) — API portion:**
1. Generate a JWT for a second client user: `ekalaivan+c@gmail.com` (ID: `aa444444-4444-4444-4444-444444444444`)
2. GET `/tasks?projectId=${PROJECT_ID}` as mike@techcorp.com
3. GET `/tasks?projectId=${PROJECT_ID}` as ekalaivan+c@gmail.com
4. Verify each client only sees tasks from their associated project
5. If the project only belongs to one client, verify the other gets 0 or 403

**T05-02/T05-03 (Comment Edit Windows) — Check backend:**
1. Check if PUT `/tasks/{taskId}/comments/{commentId}` endpoint exists
2. If it does, create a comment and immediately attempt edit (should work within 1 hour)
3. Document whether backend enforces time window or if it's frontend-only
4. If no edit endpoint exists, document as "NOT IMPLEMENTED — comment editing on tasks not supported"

Document all API-level findings. This reduces the browser testing burden.
  </action>
  <verify>
API-level results documented for T01-04, T06-04, T05-02/T05-03. Clear determination of which items still need browser confirmation.
  </verify>
  <done>
API pre-verification complete. Each test has either: (a) full API pass, (b) partial API pass needing browser confirmation, or (c) documented as not implemented.
  </done>
</task>

<task type="checkpoint:human-verify">
  <what-built>API pre-verification for 4 browser tests completed. Now need user to confirm UI behavior for any items that couldn't be fully verified via API.</what-built>
  <how-to-verify>
Based on Task 1 results, walk through any remaining browser-only verifications:

**If T01-04 needs browser confirmation:**
1. Open http://localhost:5173 as admin
2. Create a new task, uncheck "Visible to Client"
3. Open a separate browser/incognito as a client user
4. Verify the task does NOT appear in the client task list
5. Go back to admin, toggle visibility ON
6. Refresh client view, verify task now appears

**If T05-02/T05-03 need browser confirmation:**
1. Open a task as admin
2. Add a comment
3. Check if an "Edit" button/icon appears on the comment
4. If yes: click Edit, modify text, save — report result
5. Note: The 1-hour window test would require waiting (skip if not feasible, document current behavior)

**If T06-04 needs browser confirmation:**
1. Open two separate browser windows (one regular, one incognito)
2. Log in as mike@techcorp.com in one, ekalaivan+c@gmail.com in the other
3. Navigate to tasks view in both
4. Verify each client sees only their own project's tasks
5. Report what each client sees
  </how-to-verify>
  <resume-signal>Report results for each test: PASS, FAIL, or N/A with description. Type "all verified" when done.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Create final testing results and deployment verdict</name>
  <files>.planning/phases/PROD-13-extended-testing/PROD-13-TESTING-RESULTS.md</files>
  <action>
Create the comprehensive testing results document combining Plan 01 API results with Plan 02 browser results.

**Document structure:**

```markdown
# PROD-13: Extended Testing Results

**Date:** [today]
**Status:** [COMPLETE / PARTIAL]

## Deployment Readiness: [GO / NO-GO]

**Passed:** X/12 tests
**Skipped:** Y/12 tests (with rationale)
**Failed:** Z/12 tests

**Blockers:** [None / list blockers]
**Recommendation:** [DEPLOY to production / FIX before deploy]

---

## Test Results Summary

| Test ID | Category | Description | Result | Notes |
|---------|----------|-------------|--------|-------|
| T01-02 | Creation | Task with assignee | [PASS/FAIL/SKIP] | [details] |
| T01-03 | Creation | Task with deadline | ... | ... |
| T01-04 | Creation | Visibility toggle | ... | ... |
| T01-06 | Creation | Linked to deliverable | ... | ... |
| T03-04 | State | AWAITING→REVISION | ... | ... |
| T03-05 | State | REVISION→IN_PROGRESS | ... | ... |
| T04-04 | Assignment | Follow/unfollow | ... | ... |
| T05-02 | Comments | Edit within 1 hour | ... | ... |
| T05-03 | Comments | Edit after 1 hour | ... | ... |
| T05-05 | Comments | Client can comment | ... | ... |
| T06-02 | Permissions | Client cannot edit | ... | ... |
| T06-04 | Permissions | Cross-client isolation | ... | ... |

## Skipped Tests (with rationale)

- T05-04: @mention autocomplete — Feature not implemented (deferred)
- T06-05: Client PM can approve — client_pm role does not exist in system
- T06-06: Non-PM client cannot approve — client_pm role does not exist in system

## Bugs Found and Fixed

| Bug | Severity | Fix | Test | Commit |
|-----|----------|-----|------|--------|
| [description] | [critical/medium/low] | [what was fixed] | [pass-after-fix] | [hash] |

## Known Issues (Non-Blocking)

- Frontend allows COMPLETED → IN_PROGRESS but backend blocks it (documented as "working as designed per backend contract")
- Database contains unused 'review' enum value (harmless)

## Combined Results (PROD-05 + PROD-13)

| Category | PROD-05 | PROD-13 | Total |
|----------|---------|---------|-------|
| Task Creation | 2/2 | 4/4 | 6/6 |
| State Machine | 6/6 | 2/2 | 8/8 |
| Comments | 1/1 | 2-3/3 | 3-4/4 |
| Permissions | 2/2 | 2/2 | 4/4 |
| **Total** | **11/11** | **10-12/12** | **21-23/23** |
```

Fill in actual results from Plan 01 summary and Plan 02 browser testing. Determine GO/NO-GO based on:
- **GO:** All permission tests pass, all state machine tests pass, no data leaks
- **NO-GO:** Any permission bypass, cross-client data leak, or state machine violation
  </action>
  <verify>
PROD-13-TESTING-RESULTS.md exists with:
- Complete test matrix (12 tests)
- Deployment verdict (GO/NO-GO)
- Combined PROD-05 + PROD-13 totals
- Bug fix documentation (if any)
  </verify>
  <done>
Final testing results document created with deployment readiness verdict. All 12 tests have clear PASS/FAIL/SKIP status. Combined test coverage documented.
  </done>
</task>

</tasks>

<verification>
- PROD-13-TESTING-RESULTS.md exists and is complete
- All 12 tests have documented outcomes
- Deployment verdict is clearly stated (GO or NO-GO)
- No unresolved permission or data isolation failures
- Bug fixes (if any) documented with commit references
</verification>

<success_criteria>
- 4 browser-guided tests completed (or documented as not applicable)
- Final testing results document created
- Deployment readiness verdict issued
- No critical security issues remain unresolved
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-extended-testing/PROD-13-02-SUMMARY.md`
</output>
