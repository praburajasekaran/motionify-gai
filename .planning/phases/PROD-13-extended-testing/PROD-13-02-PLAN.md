---
phase: PROD-13-extended-testing
plan: 02
type: execute
wave: 2
depends_on: ["PROD-13-01"]
files_modified:
  - .planning/phases/PROD-05-task-management/test-runner.js
  - .planning/phases/PROD-13-extended-testing/PROD-13-BROWSER-CHECKLIST.md
autonomous: true

must_haves:
  truths:
    - "Task visibility toggle verified at API level"
    - "Comment editing behavior documented (endpoint exists or not)"
    - "Cross-client isolation verified at API level with second client JWT"
    - "Browser checklist generated for remaining manual verifications"
  artifacts:
    - path: ".planning/phases/PROD-05-task-management/test-runner.js"
      provides: "CLIENT_USER_2 constant and cross-client isolation test"
      min_lines: 500
    - path: ".planning/phases/PROD-13-extended-testing/PROD-13-BROWSER-CHECKLIST.md"
      provides: "Markdown checklist of browser-only verifications for user"
      min_lines: 20
  key_links:
    - from: "test-runner.js"
      to: "CLIENT_USER_2 JWT"
      via: "jwt.sign with second client user credentials using existing JWT_SECRET pattern"
      pattern: "CLIENT_USER_2"
---

<objective>
Run API-level pre-verification for the 4 browser-testable items (T01-04, T05-02/T05-03, T06-04), then generate a browser checklist for remaining manual verifications.

Purpose: Maximize automated coverage before involving the user in manual browser testing. Reduce browser testing burden to only UI-specific behaviors.
Output: API pre-verification results logged, browser checklist markdown file generated.
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
@.planning/phases/PROD-05-task-management/test-runner.js
@netlify/functions/tasks.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CLIENT_USER_2 and run API pre-verification tests</name>
  <files>.planning/phases/PROD-05-task-management/test-runner.js</files>
  <action>
**Step 1: Add CLIENT_USER_2 constant to test-runner.js**

In test-runner.js, locate the existing ADMIN_USER and CLIENT_USER constants near the top. Add a new constant following the same pattern:

```javascript
const CLIENT_USER_2 = {
  id: 'aa444444-4444-4444-4444-444444444444',
  email: 'ekalaivan+c@gmail.com',
  role: 'client'
};
```

Then, in the section where ADMIN_TOKEN and CLIENT_TOKEN are generated using `jwt.sign(payload, process.env.JWT_SECRET)`, add:

```javascript
const CLIENT_TOKEN_2 = jwt.sign(
  { sub: CLIENT_USER_2.id, email: CLIENT_USER_2.email, role: CLIENT_USER_2.role },
  process.env.JWT_SECRET
);
```

Also add a helper or parameter to `apiCall` so it can use CLIENT_TOKEN_2. The simplest approach: add an optional 5th parameter `customToken` to `apiCall`, or create a `apiCallWithToken(method, path, body, token)` wrapper.

**Step 2: Add API pre-verification test functions**

Add these test functions to test-runner.js:

**T01-04 (Visibility Toggle) — API portion:**
1. `testT01_04_VisibilityToggle()` — Create a task with `visible_to_client: false` as admin. GET `/tasks?projectId=${PROJECT_ID}` as client. Verify the internal task does NOT appear in client results. PATCH the task to `visible_to_client: true`. GET tasks as client again, verify it now appears. Log PASS/FAIL.

**T06-04 (Cross-Client Isolation) — API portion:**
2. `testT06_04_CrossClientIsolation()` — Using CLIENT_TOKEN_2 (for ekalaivan+c@gmail.com), GET `/tasks?projectId=${PROJECT_ID}`. Compare results with GET `/tasks?projectId=${PROJECT_ID}` using CLIENT_TOKEN (mike@techcorp.com). Verify each client only sees tasks from their associated project. If the project only belongs to one client, verify the other gets 0 results or 403.

**T05-02/T05-03 (Comment Edit Windows) — Check backend:**
3. `testT05_02_03_CommentEditing()` — Check if PUT `/tasks/{taskId}/comments/{commentId}` endpoint exists by creating a comment and attempting to PUT-edit it immediately. If 200: log "PASS — edit endpoint exists and works within window". If 404/405: log "NOT IMPLEMENTED — comment editing on tasks not supported". If 403: log "BLOCKED — edit permissions issue". Document whether backend enforces time window or if it's frontend-only.

**Integration into runAllTests():**
Add these 3 functions to a new "Browser Pre-Verification" section in runAllTests(), after the existing PROD-13 API tests.

**Step 3: Run the extended test runner**
Execute `node .planning/phases/PROD-05-task-management/test-runner.js` and capture output.
  </action>
  <verify>
Run the test runner:
```bash
cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1
node .planning/phases/PROD-05-task-management/test-runner.js
```
Verify output includes T01-04, T06-04, and T05-02/T05-03 results. CLIENT_USER_2 JWT is generated without errors.
  </verify>
  <done>
CLIENT_USER_2 constant and JWT added to test-runner.js. Three API pre-verification tests executed. Each test logged clear PASS/FAIL/NOT_IMPLEMENTED status.
  </done>
</task>

<task type="auto">
  <name>Task 2: Generate browser testing checklist</name>
  <files>.planning/phases/PROD-13-extended-testing/PROD-13-BROWSER-CHECKLIST.md</files>
  <action>
Based on the API pre-verification results from Task 1, generate a markdown checklist file that the user will complete independently (per CONTEXT.md decision: "Browser tests: Written markdown checklist").

**Structure:**

```markdown
# PROD-13: Browser Testing Checklist

**Generated from:** API pre-verification results (Plan 02, Task 1)
**Instructions:** Complete each applicable item below. Mark [x] for pass, add notes for failures.

## Items Requiring Browser Verification

{For each test that was NOT fully verified by API, include:}

### T01-04: Visibility Toggle (UI Confirmation)
**API Status:** [PASS/PARTIAL — describe what API verified]
**Browser steps:**
- [ ] Open http://localhost:5173 as admin
- [ ] Create a new task, uncheck "Visible to Client"
- [ ] Open a separate browser/incognito as a client user
- [ ] Verify the task does NOT appear in the client task list
- [ ] Go back to admin, toggle visibility ON
- [ ] Refresh client view, verify task now appears
**Result:** ___

### T05-02: Comment Edit Within 1 Hour
**API Status:** [describe what was found]
**Browser steps:**
- [ ] Open a task as admin
- [ ] Add a comment
- [ ] Check if an "Edit" button/icon appears on the comment
- [ ] If yes: click Edit, modify text, save
**Result:** ___

### T05-03: Comment Edit After 1 Hour
**API Status:** [describe what was found]
**Browser steps:**
- [ ] Note: The 1-hour window test requires waiting — skip if not feasible
- [ ] Document current edit behavior observed
**Result:** ___

### T06-04: Cross-Client Isolation (UI Confirmation)
**API Status:** [PASS/PARTIAL — describe what API verified]
**Browser steps:**
- [ ] Open two separate browser windows (one regular, one incognito)
- [ ] Log in as mike@techcorp.com in one, ekalaivan+c@gmail.com in the other
- [ ] Navigate to tasks view in both
- [ ] Verify each client sees only their own project's tasks
- [ ] Report what each client sees
**Result:** ___
```

**Important:** If any test was FULLY verified by API (no browser needed), mark it as "VERIFIED BY API — no browser test needed" and omit the browser steps. Only include browser steps for items that need UI confirmation.
  </action>
  <verify>
File `.planning/phases/PROD-13-extended-testing/PROD-13-BROWSER-CHECKLIST.md` exists with clear checklist items based on actual API pre-verification results.
  </verify>
  <done>
Browser testing checklist generated. Each item reflects actual API pre-verification status. User can complete this independently.
  </done>
</task>

</tasks>

<verification>
- test-runner.js has CLIENT_USER_2 constant and JWT generation
- T01-04, T06-04, T05-02/T05-03 API pre-verification tests executed
- PROD-13-BROWSER-CHECKLIST.md generated with conditional items based on API results
- No regressions in existing tests
</verification>

<success_criteria>
- CLIENT_USER_2 JWT wiring added and working
- 3 API pre-verification tests executed with clear results
- Browser checklist generated for user's independent testing
- Plan stays within context budget (2 focused tasks)
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-13-extended-testing/PROD-13-02-SUMMARY.md`
</output>
