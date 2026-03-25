---
status: diagnosed
trigger: "Comments API returns 500 error - Failed to load resource: the server responded with a status of 500"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Database migration 002 exists but was never run
test: Compared Phase 01 schema vs Phase 03 schema vs current Netlify function
expecting: Schema evolution caused mismatch
next_action: Return diagnosis

## Symptoms

expected: Comments API returns successful response without 500 errors
actual: "comment not getting Failed to load resource: the server responded with a status of 500 (Internal Server Error) comments.ts:29 Failed to fetch comments: undefined getComments @ comments.ts:29"
errors: 500 Internal Server Error from comments API
reproduction: CommentThread.tsx:80 - occurs during polling
started: UAT Test 4 - Phase 04-integration-and-polish
context:
  - Phase: 04-integration-and-polish
  - Component: Comments API (GET endpoint)
  - UAT File: .planning/phases/04-integration-and-polish/04-UAT.md
  - Error occurs during polling: CommentThread.tsx:80

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: database/migrations/002_add_comments_and_notifications.sql
  found: Migration file creates proposal_comments table with columns: author_id, author_type
  implication: This is the expected schema for the Netlify function

- timestamp: 2026-01-21T00:06:00Z
  checked: database/add-proposal-comments-table.sql
  found: Alternative schema file creates proposal_comments with columns: user_id (no author_type)
  implication: Schema mismatch - two conflicting table definitions exist

- timestamp: 2026-01-21T00:07:00Z
  checked: netlify/functions/comments.ts lines 82-92, 185-197
  found: GET query selects "author_id as userId", POST inserts into (author_id, author_type)
  implication: Function expects author_id and author_type columns, not user_id

- timestamp: 2026-01-21T00:08:00Z
  checked: database/add-proposal-comments-table.sql
  found: Table schema uses user_id instead of author_id, missing author_type column entirely
  implication: If this schema was applied to production, queries will fail with "column author_id does not exist"

- timestamp: 2026-01-21T00:10:00Z
  checked: .planning/phases/01-foundation/VERIFICATION.md lines 20-39
  found: Phase 01 verification confirms schema should use user_id column (not author_id)
  implication: Original implementation in Phase 01 used user_id

- timestamp: 2026-01-21T00:11:00Z
  checked: .planning/phases/03-attachments-and-notifications/03-06-gap-closure-fix-PLAN.md lines 57-66
  found: Phase 03 gap closure changed schema to use author_id + author_type columns
  implication: Schema was intentionally changed in Phase 03 but database was never migrated

- timestamp: 2026-01-21T00:12:00Z
  checked: database/migrations/002_add_comments_and_notifications.sql
  found: Migration file exists with author_id + author_type schema (Phase 03 version)
  implication: Migration file created but never applied to database - database still has Phase 01 schema

## Resolution

root_cause: Database migration 002 was created but never executed - database has Phase 01 schema (user_id) while Netlify function expects Phase 03 schema (author_id, author_type)
fix:
verification:
files_changed: []
