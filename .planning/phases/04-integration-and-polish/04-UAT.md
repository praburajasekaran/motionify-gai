---
status: re-testing
phase: 04-integration-and-polish
source: [04-01-SUMMARY.md]
started: 2026-01-21T12:00:00Z
updated: 2026-01-23T20:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Upload File and Submit Comment (Admin Portal)
expected: In admin portal, open a proposal with comment thread. Upload a file using the attachment button in CommentInput. After upload completes, file appears in preview. Submit the comment. The comment appears in the thread with the attachment visible and downloadable. The attachment is correctly linked to the comment in the database (comment_attachments table populated with correct comment_id).
result: pass

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
reported: "The first window doesn't automatically scroll to show the new comment"
severity: major

### 7. Edit Own Comment (Admin Portal)
expected: Post a comment in admin portal. Immediately see an Edit button on your own comment. Click Edit. Inline editor appears with current comment text. Modify the text and save. Comment updates with edited text and shows edit indicator.
result: issue
reported: "Edit buttons appear on ALL own comments. Super admin has 3 consecutive comments ('hello', 'Test attachment', 'Ha ha you're too good.') and all 3 show edit buttons. Only the most recent should have edit button."
severity: major

### 8. Edit Own Comment (Client Portal)
expected: Post a comment in client portal. Immediately see an Edit button on your own comment. Click Edit. Inline editor appears with current comment text. Modify the text and save. Comment updates with edited text and shows edit indicator.
result: issue
reported: "Client comments appear duplicated (4 identical comments visible). Edit buttons appear on ALL client comments. Only the most recent should have edit button."
severity: major

### 9. Edit Button Hidden After Reply
expected: Post a comment. Have another user reply to your comment. Edit button disappears from your original comment (cannot edit after replies exist).
result: issue
reported: "hasSubsequentReplies logic not working. Edit buttons show on all own comments regardless of subsequent replies. In super admin view: comment 'hello' has client reply after it but still shows edit button."
severity: major

## Summary

total: 9
passed: 1
issues: 4
pending: 0
skipped: 0
resolved: 5

## Gaps

- truth: "Uploaded file appears once in preview before submitting comment"
  status: resolved
  reason: "User reported: I uploaded one file less than 10mb but I'm seeing the file being displayed twice... once with the complete tag and another with file size info"
  severity: minor
  test: 1
  resolution: "Fixed by 04-03 plan - verified working"
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
  reason: "User reported (re-test 2026-01-23): The first window doesn't automatically scroll to show the new comment"
  severity: major
  test: 6
  root_cause: "04-04 plan implemented isNearBottom() and scrollToBottom() helpers, but auto-scroll logic not triggering when new comments arrive via polling"
  artifacts:
    - path: "components/proposals/CommentThread.tsx"
      issue: "pollForNewComments has scroll logic but not calling scrollToBottom() when new comments detected"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "pollForNewComments has scroll logic but not calling scrollToBottom() when new comments detected"
  missing:
    - "Verify isNearBottom() detection working correctly"
    - "Verify scrollToBottom() called when newComments.length > 0 and isNearBottom() returns true"
    - "Check if scrollPosRef restoration is preventing auto-scroll"
  debug_session: ".planning/debug/scroll-to-new-comment.md"

- truth: "Edit button only appears on own comments without replies"
  status: failed
  reason: "User reported (re-test 2026-01-23): Edit buttons appear on ALL own comments. Super admin has 3 consecutive comments ('hello', 'Test attachment', 'Ha ha you're too good.') and all 3 show edit buttons. Only the most recent should have edit button."
  severity: major
  test: 7
  root_cause: "04-05 plan added computeHasSubsequentReplies helper but logic not working correctly - edit buttons still appear on all own comments regardless of subsequent replies"
  artifacts:
    - path: "components/proposals/CommentItem.tsx"
      issue: "Edit button conditional not properly checking hasSubsequentReplies or prop not being passed correctly"
    - path: "components/proposals/CommentThread.tsx"
      issue: "computeHasSubsequentReplies logic may not be correctly identifying subsequent replies from other users, or not being called/passed to CommentItem"
  missing:
    - "Debug computeHasSubsequentReplies logic - verify it correctly identifies replies from different users"
    - "Verify hasSubsequentReplies prop passed from CommentThread to CommentItem"
    - "Verify CommentItem conditional checks hasSubsequentReplies: {isOwner && !hasSubsequentReplies && ...}"
  debug_session: ".planning/debug/edit-button-all-comments.md"

- truth: "Client portal edit button only appears on own comments without replies"
  status: failed
  reason: "User reported (re-test 2026-01-23): Client comments appear duplicated (4 identical comments visible). Edit buttons appear on ALL client comments. Only the most recent should have edit button."
  severity: major
  test: 8
  root_cause: "04-05 plan added logic but not working in client portal - edit buttons on all comments AND comments appearing duplicated (new issue discovered)"
  artifacts:
    - path: "landing-page-new/src/components/CommentItem.tsx"
      issue: "Edit button conditional not working - shows on all own comments"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "computeHasSubsequentReplies logic not working, AND comments rendering multiple times (duplication bug)"
  missing:
    - "Debug why comments appear duplicated in client portal"
    - "Debug computeHasSubsequentReplies logic in client portal CommentThread"
    - "Verify hasSubsequentReplies prop passed correctly"
  debug_session: ".planning/debug/edit-button-all-comments.md"

- truth: "Edit button is hidden after another user replies to the comment"
  status: failed
  reason: "User reported (re-test 2026-01-23): hasSubsequentReplies logic not working. Edit buttons show on all own comments regardless of subsequent replies. In super admin view: comment 'hello' has client reply after it but still shows edit button."
  severity: major
  test: 9
  root_cause: "04-05 plan implementation not effective - hasSubsequentReplies logic exists but not preventing edit buttons from showing on comments that have subsequent replies from other users"
  artifacts:
    - path: "components/proposals/CommentItem.tsx"
      issue: "Edit button showing even when hasSubsequentReplies should be true"
    - path: "landing-page-new/src/components/CommentItem.tsx"
      issue: "Edit button showing even when hasSubsequentReplies should be true"
    - path: "components/proposals/CommentThread.tsx"
      issue: "computeHasSubsequentReplies logic may have bug in detecting other user's replies"
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "computeHasSubsequentReplies logic may have bug in detecting other user's replies"
  missing:
    - "Review computeHasSubsequentReplies implementation - verify it checks author_id/author_type correctly"
    - "Add console logging to debug what hasSubsequentReplies returns for each comment"
    - "Verify comment array is sorted chronologically before computing hasSubsequentReplies"
  debug_session: ".planning/debug/edit-button-all-comments.md"

- truth: "Client comments render once without duplication"
  status: failed
  reason: "User reported (re-test 2026-01-23): Client comments appear duplicated (4 identical 'Hello' comments all showing 'just now' timestamp)"
  severity: major
  test: 8
  root_cause: "Client portal CommentThread likely rendering comments multiple times - possible React key issue, polling adding duplicates, or component re-mounting"
  artifacts:
    - path: "landing-page-new/src/components/CommentThread.tsx"
      issue: "Comments array may have duplicates, or rendering logic causing multiple renders of same comment"
  missing:
    - "Check if comments array has duplicate entries (same comment_id multiple times)"
    - "Verify React key prop uses unique comment_id"
    - "Check if polling is appending instead of replacing comments array"
    - "Verify no duplicate CommentThread component mounting"
  debug_session: ".planning/debug/client-comment-duplication.md"
