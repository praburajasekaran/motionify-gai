---
status: diagnosed
trigger: "Client screen doesn't scroll to load new comment automatically, only after refreshing URL"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - stale closure bug in pollForNewComments function
test: Analyzed useEffect dependencies and closure behavior
expecting: lastPolledAt is stale in polling function due to missing dependency
next_action: Document root cause and prepare diagnosis

## Symptoms

expected: New comments appear automatically on client screen via polling without manual refresh
actual: New comment from Super admin doesn't appear on client screen automatically; only visible after URL refresh
errors: None reported
reproduction: Super admin adds comment, client screen doesn't auto-update
started: UAT Test 5 - Phase 04

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: ProposalDetail page (admin/ProposalDetail.tsx)
  found: Same CommentThread component used for both admin and client views (lines 748-756)
  implication: Polling logic is shared - if it works for admin, should work for client

- timestamp: 2026-01-21T00:06:00Z
  checked: CommentThread component (components/proposals/CommentThread.tsx)
  found: Polling implementation exists with 10s interval (lines 30-56), calls pollForNewComments which fetches comments with lastPolledAt timestamp parameter
  implication: Polling mechanism is implemented correctly

- timestamp: 2026-01-21T00:10:00Z
  checked: API endpoint (netlify/functions/comments.ts lines 66-134)
  found: GET endpoint properly handles 'since' parameter, filters with created_at > $2
  implication: Server-side polling logic is correct

- timestamp: 2026-01-21T00:12:00Z
  checked: API response structure (api-config.ts line 103)
  found: api-config normalizes response.data to extract nested data OR use raw response
  implication: Response parsing should work correctly

- timestamp: 2026-01-21T00:15:00Z
  checked: useEffect dependencies and closure scope (CommentThread.tsx lines 27-56)
  found: pollForNewComments function captures lastPolledAt from closure, but useEffect depends only on [proposalId]. When lastPolledAt updates via setLastPolledAt, pollForNewComments is NOT recreated, so it keeps using the stale initial value.
  implication: CRITICAL BUG - polling always uses initial lastPolledAt, never fetches new comments after first poll

## Resolution

root_cause: pollForNewComments function in CommentThread.tsx has stale closure over lastPolledAt state - useEffect depends only on [proposalId] but pollForNewComments captures lastPolledAt from closure, causing it to always use the initial value instead of updated values
fix:
verification:
files_changed: []
