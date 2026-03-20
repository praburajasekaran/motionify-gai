---
status: resolved
trigger: "Edit Button hasSubsequentReplies Logic Not Working"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:10:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - computeHasSubsequentReplies() compares currentUserId (author of ALL subsequent comments) instead of comment.userId (author of THIS comment)
test: code analysis complete
expecting: fix will compare comment.userId to subsequent comment authors
next_action: document root cause and fix

## Symptoms

expected: Edit button should ONLY appear on user's most recent comment without replies from other users
actual: Edit buttons appear on ALL own comments, even when other users have replied
errors: none
reproduction: Admin portal shows 3 consecutive super admin comments ("hello", "Test attachment", "Ha ha") ALL have edit buttons. "hello" has client reply after it but still shows edit button.
started: After implementing hasSubsequentReplies logic in 04-05 fix

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:05:00Z
  checked: components/proposals/CommentThread.tsx lines 10-24
  found: computeHasSubsequentReplies compares c.userId !== currentUserId
  implication: This checks if ANY subsequent comment is from a different user than CURRENT USER, not different from COMMENT AUTHOR

- timestamp: 2026-01-23T00:06:00Z
  checked: landing-page-new/src/components/CommentThread.tsx lines 20-34
  found: Identical bug - compares c.userId !== currentUserId
  implication: Both portals have same flawed logic

- timestamp: 2026-01-23T00:07:00Z
  checked: CommentItem.tsx line 155 (both portals)
  found: Edit button conditional: {isOwner && !hasSubsequentReplies && !isEditing && ...}
  implication: CommentItem correctly uses the prop, but receives wrong value from parent

- timestamp: 2026-01-23T00:08:00Z
  checked: Logic flow for scenario "Super admin posts 3 comments, client replies after first"
  found: For ALL 3 super admin comments, currentUserId is super admin ID. Function checks if subsequent comments have userId !== super admin ID. Client reply satisfies this for comment 1, but returns TRUE for all 3 comments because ALL have subsequent comments from "different user" (than currentUserId).
  implication: Function always returns same result for all comments by same user, defeating the purpose

## Resolution

root_cause: computeHasSubsequentReplies() compares subsequent comment authors to currentUserId instead of comment.userId. This causes ALL comments by the current user to have the same hasSubsequentReplies value, when it should be checking if subsequent comments are from DIFFERENT authors than THIS COMMENT's author.

fix: Changed comparison from `c.userId !== currentUserId` to `c.userId !== comment.userId` in both CommentThread files. Updated comment to clarify the logic.

verification: Fix applied. Ready for UAT testing. Expected behavior: Edit button should only appear on comments that have no subsequent replies from OTHER users (self-replies are allowed).
files_changed:
  - components/proposals/CommentThread.tsx (line 22)
  - landing-page-new/src/components/CommentThread.tsx (line 32)
