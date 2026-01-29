# Phase PROD-13: Extended Testing - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete remaining manual tests from PROD-05 that require browser interaction or additional setup. 12 non-AI tests across task creation, state machine, comments, and permissions. Fix bugs found inline. Produce a deployment readiness verdict.

</domain>

<decisions>
## Implementation Decisions

### Test Scope & Priority
- Skip AI generation tests (T02-01, T02-02, T02-03) — Gemini integration is nice-to-have, defer to separate phase
- Run 12 non-AI tests across: Task Creation (4), State Machine (2), Assignment & Notifications (built features only), Comments (built features only), Permissions (4)
- Skip tests for features that aren't implemented (e.g., @mention autocomplete, follow/unfollow if not built)
- Include quick bug fixes inline — if a test reveals a small bug, fix it during testing rather than deferring
- Cross-client isolation testing required — use 2 separate client accounts to verify Client A cannot see Client B's tasks

### Pass/Fail Criteria
- All 12 tests must pass — failures block deployment
- Fix bugs inline: find bug → fix → re-test → document as "pass-after-fix"
- Screenshots captured only on failure (not for passing tests)
- Final results document includes a GO/NO-GO deployment readiness verdict

### Test Environment Setup
- Run against local dev (localhost with Netlify dev server)
- Use existing seed data users (ekalaivan+c, alex@acmecorp, admin accounts) — no fresh user creation
- Pre-existing project with tasks assumed — tests verify task operations, not project creation
- Extend existing `test-runner.js` from PROD-05 for API-testable items; browser-only tests documented separately

### Test Execution Approach
- API-level tests: Claude auto-runs test-runner.js and reports results (only asks user if something fails)
- Browser tests: Claude-guided — walks user through each step interactively, user reports what they see
- Single sequential checklist format (not grouped by category)
- Manual browser testing with documented checklist steps (no Playwright automation for this phase)

### Claude's Discretion
- Which specific tests can be API-automated vs require browser interaction
- Checklist ordering for optimal test flow
- Format of the deployment readiness verdict document
- How to document "pass-after-fix" results vs clean passes

</decisions>

<specifics>
## Specific Ideas

- Extend the existing `test-runner.js` at `.planning/phases/PROD-05-task-management/test-runner.js` for new API tests
- Reference PROD-05-UAT-RESULTS.md "Tests Not Yet Run" section for the exact test IDs and descriptions
- Cross-client test should verify T06-04 specifically: "Client A cannot see Client B's tasks"
- Tech debt items (unused 'review' enum, frontend status casing) can be fixed if encountered during testing

</specifics>

<deferred>
## Deferred Ideas

- AI Generation tests (T02-01, T02-02, T02-03) — requires Gemini API key and separate testing approach
- @mention autocomplete (T05-04) — feature may not be implemented
- Follow/unfollow task (T04-04) — feature may not be implemented
- Playwright automation for browser tests — manual sufficient for this phase

</deferred>

---

*Phase: PROD-13-extended-testing*
*Context gathered: 2026-01-29*
