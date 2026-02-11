---
status: diagnosed
trigger: "**Issue from UAT Tests 7, 8, 9 (Combined):** Edit button only appears on own comments without replies (admin and client portals)"
created: 2026-01-21T00:00:00Z
updated: 2026-01-21T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Edit button conditional logic missing "has replies" check
test: examine CommentItem components in both portals for edit button visibility logic
expecting: find missing or incorrect reply detection logic
next_action: search for CommentItem files and examine edit button rendering

## Symptoms

expected: Edit button only appears on own comments without replies (admin and client portals)
actual: Edit button appears on ALL comments posted by the user, regardless of whether there are replies after them
errors: none
reproduction: Post comment, have another user reply, original user still sees edit button
started: always broken
severity: major

## Eliminated

## Evidence

- timestamp: 2026-01-21T00:05:00Z
  checked: components/proposals/CommentItem.tsx line 154
  found: Edit button conditional is `{isOwner && !isEditing && (` - only checks ownership
  implication: No logic to check if comment has replies after it

- timestamp: 2026-01-21T00:06:00Z
  checked: landing-page-new/src/components/CommentItem.tsx line 154
  found: Identical logic - `{isOwner && !isEditing && (` - only checks ownership
  implication: Client portal has same missing logic

- timestamp: 2026-01-21T00:07:00Z
  checked: comment interface in both files (lines 32-44)
  found: Comment interface does NOT include hasReplies or any reply tracking field
  implication: Component cannot check for replies even if logic existed

- timestamp: 2026-01-21T00:08:00Z
  checked: REQUIREMENTS.md COMM-06 lines 86-91
  found: "Editing disabled once another user replies to that comment"
  implication: Requirement explicitly states edit button should be hidden when ANY other user posts after this comment

- timestamp: 2026-01-21T00:09:00Z
  checked: CommentThread.tsx rendering logic (line 224-231)
  found: Maps over comments array in order, no index passed to CommentItem
  implication: CommentItem has no way to know if there are subsequent comments by other users

- timestamp: 2026-01-21T00:10:00Z
  checked: lib/comments.ts Comment interface (lines 3-12)
  found: No hasReplies field in API response
  implication: Backend doesn't provide reply tracking data to frontend

## Resolution

root_cause: Edit button visibility only checks ownership (isOwner) without checking if subsequent comments exist from other users
fix:
verification:
files_changed: []
