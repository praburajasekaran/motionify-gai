---
status: diagnosed
phase: 04-integration-and-polish
source: [04-01-SUMMARY.md]
started: 2026-01-21T12:00:00Z
updated: 2026-01-21T19:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Upload File and Submit Comment (Admin Portal)
expected: In admin portal, open a proposal with comment thread. Upload a file using the attachment button in CommentInput. After upload completes, file appears in preview. Submit the comment. The comment appears in the thread with the attachment visible and downloadable. The attachment is correctly linked to the comment in the database (comment_attachments table populated with correct comment_id).
result: issue
reported: "I uploaded one file less than 10mb but I'm seeing the file being displayed twice... once with the complete tag and another with file size info"
severity: minor

### 2. Upload File and Submit Comment (Client Portal)
expected: In client portal, open a proposal. Upload a file using the attachment button in CommentInput. After upload completes, file appears in preview. Submit the comment. The comment appears in the thread with the attachment visible and downloadable. The attachment is correctly linked to the comment in the database (comment_attachments table populated with correct comment_id).
result: issue
reported: "Comment submit button not submitting the comment with file attachment."
severity: major

### 3. Multiple Attachments on Single Comment
expected: Upload 2-3 files to a single comment before submitting. All files appear in preview list. Submit the comment. All attachments appear on the posted comment and are downloadable.
result: issue
reported: "we have not got multiple files uploaded but they are not getting submitted."
severity: major

### 4. Remove Attachment Before Submit
expected: Upload a file, see it in preview. Click remove/delete on the attachment. File disappears from preview. Submit comment without the removed file. Comment appears without that attachment.
result: issue
reported: "comment not getting Failed to load resource: the server responded with a status of 500 (Internal Server Error) comments.ts:29 Failed to fetch comments: undefined getComments @ comments.ts:29 api-config.ts:70 GET http://localhost:9999/.netlify/functions/comments?proposalId=09cafe3a-18e9-4657-9c0e-51b5fe73e2f2 500 (Internal Server Error) apiRequest @ api-config.ts:70 get @ api-config.ts:126 getComments @ comments.ts:26 pollForNewComments @ CommentThread.tsx:80 comments.ts:29 Failed to fetch comments: undefinedsubmitted."
severity: blocker

### 5. Scroll Position Preserved During Polling
expected: Open a proposal with 10+ comments. Scroll to the middle of the comment thread and start reading. Wait for 10+ seconds (polling interval). If no new comments are posted, scroll position remains exactly where you were reading. Page does not jump to top or bottom.
result: issue
reported: "There's a new comment from the Super admin but the client screen doesn't scroll to load the comment automatically... only after refreshing the URL the new comment is seen."
severity: major

### 6. Scroll Updates When New Comment Posted
expected: Open a proposal with comments. Scroll to the middle of the thread. Have another user (or another browser window) post a new comment. Wait 10 seconds for polling. New comment appears at bottom of thread. If you were at bottom, page scrolls to show new comment. If you were in middle reading, position is preserved.
result: issue
reported: "the page doesn't scroll to the new comment."
severity: major

### 7. Edit Own Comment (Admin Portal)
expected: Post a comment in admin portal. Immediately see an Edit button on your own comment. Click Edit. Inline editor appears with current comment text. Modify the text and save. Comment updates with edited text and shows edit indicator.
result: issue
reported: "I'm able to edit all comments that I posted. Instead I should be able to edit only my comment if there hasn't been any replies after it (either by myself or the other party)."
severity: major

### 8. Edit Own Comment (Client Portal)
expected: Post a comment in client portal. Immediately see an Edit button on your own comment. Click Edit. Inline editor appears with current comment text. Modify the text and save. Comment updates with edited text and shows edit indicator.
result: issue
reported: "Client can edit all comments that they've posted. Instead the client should be able to edit only their comment if there hasn't been any replies after it (either by themselves or the other party)."
severity: major

### 9. Edit Button Hidden After Reply
expected: Post a comment. Have another user reply to your comment. Edit button disappears from your original comment (cannot edit after replies exist).
result: issue
reported: "Doesn't happen. Edit button appears next to all their comments."
severity: major

## Summary

total: 9
passed: 0
issues: 5
pending: 0
skipped: 0
resolved: 4

## Gaps

- truth: "Uploaded file appears once in preview before submitting comment"
  status: failed
  reason: "User reported: I uploaded one file less than 10mb but I'm seeing the file being displayed twice... once with the complete tag and another with file size info"
  severity: minor
  test: 1
  root_cause: "Completed files remain in uploadingFiles array while also being added to pendingAttachments array, causing duplicate display"
  artifacts:
    - path: "components/proposals/CommentInput.tsx"
      issue: "uploadFileItem function adds completed files to pendingAttachments but doesn't remove them from uploadingFiles array"
  missing:
    - "After successfully adding to pendingAttachments, call removeUploadingFile or filter uploadingFiles to remove completed upload"
  debug_session: ".planning/debug/file-preview-duplicate.md"

- truth: "Submit button posts comment with file attachment to the database"
  status: resolved
  reason: "User reported: Comment submit button not submitting the comment with file attachment."
  severity: major
  test: 2
  root_cause: "CommentInput.handleSubmit only passes content to onSubmit callback, ignoring pendingAttachments state"
  resolution: "Already fixed by user"
  artifacts:
    - path: "landing-page-new/src/components/CommentInput.tsx"
      issue: "Line 166 calls onSubmit without attachmentIds parameter declared in interface"
    - path: "components/proposals/CommentInput.tsx"
      issue: "Line 166 calls onSubmit without attachmentIds parameter declared in interface"
  missing:
    - "Extract attachmentIds from pendingAttachments and pass to onSubmit as second parameter"
  debug_session: ".planning/debug/comment-submit-with-attachment.md"

- truth: "Multiple file attachments can be submitted with a single comment"
  status: resolved
  reason: "User reported: we have not got multiple files uploaded but they are not getting submitted."
  severity: major
  test: 3
  root_cause: "CommentInput.handleSubmit does not pass attachment metadata to onSubmit callback"
  resolution: "Already fixed by user"
  artifacts:
    - path: "components/proposals/CommentInput.tsx"
      issue: "Line 166 calls onSubmit(content.trim()) without passing pendingAttachments r2Keys"
    - path: "components/proposals/CommentThread.tsx"
      issue: "handleSubmit signature expects only content parameter, doesn't receive attachmentIds"
  missing:
    - "Extract r2Keys from pendingAttachments in CommentInput.handleSubmit and pass to onSubmit as second parameter"
    - "Update CommentThread.handleSubmit to accept and use attachmentIds parameter"
  debug_session: ".planning/debug/multiple-file-upload-not-submitted.md"

- truth: "Comments API returns successful response without 500 errors"
  status: resolved
  reason: "User reported: comment not getting Failed to load resource: the server responded with a status of 500 (Internal Server Error) comments.ts:29 Failed to fetch comments: undefined getComments @ comments.ts:29 api-config.ts:70 GET http://localhost:9999/.netlify/functions/comments?proposalId=09cafe3a-18e9-4657-9c0e-51b5fe73e2f2 500 (Internal Server Error) apiRequest @ api-config.ts:70 get @ api-config.ts:126 getComments @ comments.ts:26 pollForNewComments @ CommentThread.tsx:80 comments.ts:29 Failed to fetch comments: undefinedsubmitted."
  severity: blocker
  test: 4
  root_cause: "Database migration 002 was never executed - database has Phase 01 schema (user_id) while code expects Phase 03 schema (author_id, author_type)"
  resolution: "Already fixed by user - migration has been run"
  artifacts:
    - path: "database/migrations/002_add_comments_and_notifications.sql"
      issue: "Migration file exists but was never run against the database"
    - path: "netlify/functions/comments.ts"
      issue: "Lines 82-92 (GET) and 185-197 (POST) query columns that don't exist in current database schema"
  missing:
    - "Run migration: npx tsx database/migrate.ts up"
    - "Verify migration applied: npx tsx database/migrate.ts status"
  debug_session: ".planning/debug/comments-api-500-error.md"

- truth: "New comments appear automatically on client screen via polling without manual refresh"
  status: resolved
  reason: "User reported: There's a new comment from the Super admin but the client screen doesn't scroll to load the comment automatically... only after refreshing the URL the new comment is seen."
  severity: major
  test: 5
  root_cause: "pollForNewComments function has stale closure bug - captures lastPolledAt but useEffect dependency array is missing it, causing function to always use initial timestamp"
  resolution: "Already fixed by user - polling now working"
  artifacts:
    - path: "components/proposals/CommentThread.tsx"
      issue: "Lines 27-127 pollForNewComments has stale closure over lastPolledAt state due to missing dependency in useEffect"
  missing:
    - "Use useRef for lastPolledAt instead of useState, OR add lastPolledAt to dependency array, OR use useCallback with proper dependencies"
  debug_session: ".planning/debug/client-polling-not-showing-new-comments.md"

- truth: "Page scrolls to show new comment when posted by another user"
  status: failed
  reason: "User reported: the page doesn't scroll to the new comment."
  severity: major
  test: 6
  root_cause: "CommentThread components lack auto-scroll logic to show newly posted comments, and scroll-preservation mechanism actively prevents scrolling by restoring previous scroll position"
  artifacts:
    - path: "components/proposals/CommentThread.tsx"
      issue: "pollForNewComments preserves scroll position, preventing visibility of new comments"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "pollForNewComments preserves scroll position, preventing visibility of new comments"
  missing:
    - "Implement smart auto-scroll: detect if user near bottom, auto-scroll if near bottom, preserve if reading middle, always scroll after own comment"
  debug_session: ".planning/debug/scroll-to-new-comment.md"

- truth: "Edit button only appears on own comments without replies"
  status: failed
  reason: "User reported: I'm able to edit all comments that I posted. Instead I should be able to edit only my comment if there hasn't been any replies after it (either by myself or the other party)."
  severity: major
  test: 7
  root_cause: "Edit button visibility only checks ownership (isOwner) without checking if subsequent comments exist from other users"
  artifacts:
    - path: "components/proposals/CommentItem.tsx"
      issue: "Line 154 edit button conditional lacks hasSubsequentReplies check"
    - path: "components/proposals/CommentThread.tsx"
      issue: "Line 224-231 doesn't compute or pass hasSubsequentReplies to CommentItem"
  missing:
    - "CommentThread needs to compute hasSubsequentReplies for each comment"
    - "CommentThread needs to pass hasSubsequentReplies prop to CommentItem"
    - "CommentItem needs hasSubsequentReplies prop and update conditional"
  debug_session: ".planning/debug/edit-button-all-comments.md"

- truth: "Client portal edit button only appears on own comments without replies"
  status: failed
  reason: "User reported: Client can edit all comments that they've posted. Instead the client should be able to edit only their comment if there hasn't been any replies after it (either by themselves or the other party)."
  severity: major
  test: 8
  root_cause: "Edit button visibility only checks ownership (isOwner) without checking if subsequent comments exist from other users"
  artifacts:
    - path: "landing-page-new/src/components/CommentItem.tsx"
      issue: "Line 154 edit button conditional lacks hasSubsequentReplies check"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "Doesn't compute or pass hasSubsequentReplies to CommentItem"
  missing:
    - "CommentThread needs to compute hasSubsequentReplies for each comment"
    - "CommentThread needs to pass hasSubsequentReplies prop to CommentItem"
    - "CommentItem needs hasSubsequentReplies prop and update conditional"
  debug_session: ".planning/debug/edit-button-all-comments.md"

- truth: "Edit button is hidden after another user replies to the comment"
  status: failed
  reason: "User reported: Doesn't happen. Edit button appears next to all their comments."
  severity: major
  test: 9
  root_cause: "Edit button visibility only checks ownership (isOwner) without checking if subsequent comments exist from other users"
  artifacts:
    - path: "components/proposals/CommentItem.tsx"
      issue: "Line 154 edit button conditional lacks hasSubsequentReplies check"
    - path: "landing-page-new/src/components/CommentItem.tsx"
      issue: "Line 154 edit button conditional lacks hasSubsequentReplies check"
  missing:
    - "Both portals need hasSubsequentReplies logic in CommentThread and CommentItem"
  debug_session: ".planning/debug/edit-button-all-comments.md"
