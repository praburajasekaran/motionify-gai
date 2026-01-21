---
status: complete
phase: 04-integration-and-polish
source: [04-01-SUMMARY.md]
started: 2026-01-21T12:00:00Z
updated: 2026-01-21T19:38:00Z
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
issues: 9
pending: 0
skipped: 0

## Gaps

- truth: "Uploaded file appears once in preview before submitting comment"
  status: failed
  reason: "User reported: I uploaded one file less than 10mb but I'm seeing the file being displayed twice... once with the complete tag and another with file size info"
  severity: minor
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Submit button posts comment with file attachment to the database"
  status: failed
  reason: "User reported: Comment submit button not submitting the comment with file attachment."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Multiple file attachments can be submitted with a single comment"
  status: failed
  reason: "User reported: we have not got multiple files uploaded but they are not getting submitted."
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Comments API returns successful response without 500 errors"
  status: failed
  reason: "User reported: comment not getting Failed to load resource: the server responded with a status of 500 (Internal Server Error) comments.ts:29 Failed to fetch comments: undefined getComments @ comments.ts:29 api-config.ts:70 GET http://localhost:9999/.netlify/functions/comments?proposalId=09cafe3a-18e9-4657-9c0e-51b5fe73e2f2 500 (Internal Server Error) apiRequest @ api-config.ts:70 get @ api-config.ts:126 getComments @ comments.ts:26 pollForNewComments @ CommentThread.tsx:80 comments.ts:29 Failed to fetch comments: undefinedsubmitted."
  severity: blocker
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "New comments appear automatically on client screen via polling without manual refresh"
  status: failed
  reason: "User reported: There's a new comment from the Super admin but the client screen doesn't scroll to load the comment automatically... only after refreshing the URL the new comment is seen."
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Page scrolls to show new comment when posted by another user"
  status: failed
  reason: "User reported: the page doesn't scroll to the new comment."
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Edit button only appears on own comments without replies"
  status: failed
  reason: "User reported: I'm able to edit all comments that I posted. Instead I should be able to edit only my comment if there hasn't been any replies after it (either by myself or the other party)."
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Client portal edit button only appears on own comments without replies"
  status: failed
  reason: "User reported: Client can edit all comments that they've posted. Instead the client should be able to edit only their comment if there hasn't been any replies after it (either by themselves or the other party)."
  severity: major
  test: 8
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Edit button is hidden after another user replies to the comment"
  status: failed
  reason: "User reported: Doesn't happen. Edit button appears next to all their comments."
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
