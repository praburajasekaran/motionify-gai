---
phase: PROD-13-extended-testing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/PROD-05-task-management/test-runner.js
autonomous: true

must_haves:
  truths:
    - "8 new API tests added to test-runner.js and executed"
    - "Task creation with assignee, deadline, and deliverable link all pass"
    - "State transitions AWAITING_APPROVAL->REVISION_REQUESTED and REVISION_REQUESTED->IN_PROGRESS pass"
    - "Follow/unfollow task endpoints work correctly"
    - "Client can post comments on tasks"
    - "Client cannot edit tasks (403)"
    - "All 8 new tests pass (or document why skipped)"
  artifacts:
    - path: ".planning/phases/PROD-05-task-management/test-runner.js"
      provides: "Extended test runner with 8 new API tests"
      min_lines: 500
  key_links:
    - from: "test-runner.js"
      to: "http://localhost:8888/.netlify/functions/tasks"
      via: "apiCall helper with JWT auth"
      pattern: "apiCall.*tasks"
---

<objective>
Extend the existing PROD-05 test-runner.js with 8 new API-automatable tests covering task creation variants, additional state machine transitions, follow/unfollow, client comments, and client edit permissions.

Purpose: Verify remaining task management API behaviors that can be tested without a browser, closing the PROD-05 test coverage gap.
Output: Extended test-runner.js with 8 new test functions, executed with results logged.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-05-task-management/test-runner.js
@.planning/phases/PROD-05-task-management/PROD-05-UAT-RESULTS.md
@.planning/phases/PROD-13-extended-testing/CONTEXT.md
@.planning/phases/PROD-13-extended-testing/PROD-13-RESEARCH.md
@netlify/functions/tasks.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add 8 new API test functions to test-runner.js</name>
  <files>.planning/phases/PROD-05-task-management/test-runner.js</files>
  <action>
Extend the existing test-runner.js by adding these 8 new test functions, following the existing patterns (apiCall helper, logResult, ADMIN_TOKEN/CLIENT_TOKEN):

**Task Creation Tests (3):**

1. `testT01_02_TaskWithAssignee()` — Create task with `assigned_to` field set to ADMIN_USER.id. Verify response includes assignee info. Uses admin auth.

2. `testT01_03_TaskWithDeadline()` — Create task with `dueDate` field set to a future ISO date string (e.g., 30 days from now). Verify response includes the due date. Uses admin auth.

3. `testT01_06_TaskLinkedToDeliverable()` — First query `GET /deliverables?projectId=${PROJECT_ID}` to get a valid deliverable ID. If none exist, skip test with "SKIP: No deliverables in test project". Otherwise create task with `deliverable_id` field. Verify response includes the deliverable link. Uses admin auth.

**State Machine Tests (2):**

4. `testT03_04_AwaitingApprovalToRevisionRequested(taskId)` — Takes a taskId, transitions it from current state through pending->in_progress->awaiting_approval if needed, then transitions to `revision_requested`. Verify response status is `revision_requested`. Backend state machine: `awaiting_approval: ['completed', 'revision_requested', 'in_progress']`.

5. `testT03_05_RevisionRequestedToInProgress(taskId)` — Takes a taskId already in `revision_requested` state, transitions to `in_progress`. Verify response status is `in_progress`. Backend: `revision_requested: ['in_progress']`.

**Assignment Tests (1):**

6. `testT04_04_FollowUnfollowTask(taskId)` — POST `/tasks/${taskId}/follow` as admin, verify 200/201. Then POST `/tasks/${taskId}/unfollow` as admin, verify 200. Test idempotency: follow again, verify no error (ON CONFLICT DO NOTHING).

**Comments Tests (1):**

7. `testT05_05_ClientCanComment(taskId)` — POST `/tasks/${taskId}/comments` as CLIENT (useClientAuth=true) with content "Client test comment". Verify 201 and comment created. This tests that clients with visibility to the task can post comments.

**Permissions Tests (1):**

8. `testT06_02_ClientCannotEditTask(taskId)` — PATCH `/tasks/${taskId}` as CLIENT (useClientAuth=true) with `{ title: 'Client edit attempt' }`. Expect 403. This validates client role cannot modify tasks.

**Integration into runAllTests():**

Update the `runAllTests()` function to:
- Run T01-02, T01-03, T01-06 in the Task Creation section
- Create a fresh task for state machine tests, run T03-04, T03-05 in sequence (they need sequential state)
- Run T04-04 with the task from T01-01
- Run T05-05 with a visible task (ensure `visible_to_client: true` on creation)
- Run T06-02 with any task

Update the summary section header to say "PROD-13: Extended Task Management UAT" while keeping backward compatibility with existing PROD-05 tests.

**Important patterns from existing code:**
- Use `apiCall(method, path, body, useClientAuth)` — 4th param switches to CLIENT_TOKEN
- Use `logResult(testId, name, passed, details)` for all results
- Return values from creation tests so subsequent tests can use taskIds
- Handle errors with try/catch and log failures
  </action>
  <verify>
Run the extended test runner:
```bash
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
node .planning/phases/PROD-05-task-management/test-runner.js
```
Verify output shows all original tests (T01-01, T01-05, T03-01 through T03-08, T05-01, T06-01, T06-03) plus all 8 new tests (T01-02, T01-03, T01-06, T03-04, T03-05, T04-04, T05-05, T06-02).
  </verify>
  <done>
All 8 new API tests added and integrated into runAllTests(). Test runner executes successfully. Each test logs PASS/FAIL with details. Any inline bugs found are fixed and re-tested (document as "pass-after-fix").
  </done>
</task>

<task type="auto">
  <name>Task 2: Run tests, fix inline bugs, document results</name>
  <files>.planning/phases/PROD-05-task-management/test-runner.js</files>
  <action>
Execute the test runner against the local dev server (`http://localhost:8888`). Analyze results:

**If all tests pass:** Document clean pass for each test.

**If tests fail due to bugs:**
1. Identify the root cause (check backend endpoint, schema, permissions)
2. Fix the bug inline (if small — per CONTEXT.md decision)
3. Re-run the failing test
4. Document as "pass-after-fix" with description of what was fixed

**Expected potential issues (from research):**
- T01-06 may fail if no deliverables exist in test project — document as SKIP
- T04-04 follow/unfollow endpoints may return unexpected status codes — check actual endpoint paths
- T05-05 client commenting may require `visible_to_client: true` on the task — ensure task is visible
- T06-02 client edit may not return 403 if backend doesn't check role on PATCH — this is a real bug if so

**Bug fix boundaries:**
- Fix schema mismatches, missing fields, wrong status codes
- Do NOT fix architectural issues (e.g., if edit permissions aren't implemented at all, document for future phase)
- Keep fixes minimal and targeted

**After all tests complete:**
Log final tally: Total / Passed / Failed / Skipped
  </action>
  <verify>
Final test run shows all tests either PASS, pass-after-fix, or SKIP (with documented reason). No unresolved failures on critical permissions or state machine tests.
  </verify>
  <done>
All 8 new API tests executed. Results documented with pass/fail/skip status. Any inline bugs fixed and committed. No critical security or state machine failures remain.
  </done>
</task>

</tasks>

<verification>
- Run the full test suite: `node .planning/phases/PROD-05-task-management/test-runner.js`
- All original 11 tests still pass (no regressions)
- All 8 new tests either PASS or have documented SKIP reason
- No permission bypasses (T06-02 must pass — client cannot edit)
- State machine transitions T03-04 and T03-05 work correctly
</verification>

<success_criteria>
- 8 new test functions added to test-runner.js
- All tests executed with clear PASS/FAIL/SKIP output
- Inline bugs fixed if found (documented as pass-after-fix)
- No critical failures on permissions or state machine tests
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-extended-testing/PROD-13-01-SUMMARY.md`
</output>
