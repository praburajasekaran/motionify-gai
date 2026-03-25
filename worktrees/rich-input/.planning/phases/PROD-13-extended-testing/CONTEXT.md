# Phase PROD-13: Extended Testing - Context

**Gathered:** 2026-01-29 (updated)
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete remaining manual tests from PROD-05 that require browser interaction or additional setup. 12 non-AI tests across task creation, state machine, comments, and permissions. Fix bugs found. Deploy to staging first, test against deployed environment. Produce a deployment readiness verdict.

</domain>

<decisions>
## Implementation Decisions

### Test Scope & Priority
- Skip AI generation tests (T02-01, T02-02, T02-03) — Gemini integration is nice-to-have, defer to separate phase
- Run 12 non-AI tests across: Task Creation (4), State Machine (2), Assignment & Notifications (built features only), Comments (built features only), Permissions (4)
- Skip tests for features that aren't implemented (e.g., @mention autocomplete, follow/unfollow if not built)
- Cross-client isolation testing required — use 2 separate client accounts to verify Client A cannot see Client B's tasks

### Pass/Fail Criteria
- Severity-based verdict — not all failures block deployment
- **Critical (blocks deployment):** Security vulnerabilities, data corruption/loss, core workflow broken (user can't complete primary task), client-facing broken experience
- **Minor (documented, deferred):** Cosmetic issues, admin-only quirks, edge cases that don't affect primary workflows
- Conditional GO: If all critical bugs fixed but minor issues remain, verdict is GO only if minor issues have a planned fix timeline
- Final results document lists **failures and fixes only** — passing tests assumed passed (not individually documented)

### Test Environment Setup
- **Deploy to Netlify staging first** — deployment is a prerequisite step in this phase
- Both portals (admin SPA + client Next.js) and Netlify functions deploy together on the same Netlify site
- Test against deployed staging URL with existing staging database data
- No fresh seed data — test against whatever exists in staging DB for realism
- Extend existing `test-runner.js` from PROD-05 for API-testable items

### Test Execution Approach
- **API tests: Claude auto-runs** test-runner.js against staging URL, reports results autonomously (no approval needed before running)
- **Browser tests: Written markdown checklist** — Claude generates checklist file, user runs through it independently
- Browser checklist includes **actions + expected results** for each step (so user can verify pass/fail)
- Markdown checklist format with `- [ ]` checkboxes user edits as they go
- Single sequential checklist (not grouped by category)
- No Playwright automation for this phase

### Bug Handling
- **Collect all bugs first**, then fix in priority order (not fix-as-you-go)
- Browser bugs: Mark as FAIL in the markdown checklist with description of what went wrong
- Fix all tech debt items encountered during testing (unused 'review' enum, frontend status casing, etc.) — not just functional bugs
- **Full re-test after fixes** — re-run all failed tests (not just targeted) to confirm fixes and catch regressions

### Claude's Discretion
- Which specific tests can be API-automated vs require browser interaction
- Checklist ordering for optimal test flow
- Format of the deployment readiness verdict document
- How to document "pass-after-fix" results vs clean passes
- Staging deployment configuration details

</decisions>

<specifics>
## Specific Ideas

- Extend the existing `test-runner.js` at `.planning/phases/PROD-05-task-management/test-runner.js` for new API tests
- Reference PROD-05-UAT-RESULTS.md "Tests Not Yet Run" section for the exact test IDs and descriptions
- Cross-client test should verify T06-04 specifically: "Client A cannot see Client B's tasks"
- Tech debt items (unused 'review' enum, frontend status casing) should be fixed if encountered during testing

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
*Context gathered: 2026-01-29 (updated)*
