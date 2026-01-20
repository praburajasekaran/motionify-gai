---
status: diagnosed
phase: 03-attachments-and-notifications
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-01-20T12:30:00Z
updated: 2026-01-20T14:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Attach File to Comment (Admin Portal)
expected: In admin portal, open a proposal with comment thread. Click attach/upload button in comment input. Select a file (PNG, JPG, PDF, or DOCX under 10MB). See upload progress bar. After upload completes, file appears as attachment preview before submitting comment.
result: issue
reported: "Failed to load resource: the server responded with a status of 500 (Internal Server Error) on /comments. CORS error on R2 presign: 'No Access-Control-Allow-Origin header is present'."
severity: blocker

### 2. Attach File to Comment (Client Portal)
expected: In client portal, open a proposal. Click attach/upload button in comment input. Select a file. See upload progress bar. After upload completes, file appears as attachment preview before submitting comment.
result: issue
reported: "Same 500 error on GET /comments. Upload fails. Polling is spamming console with errors."
severity: blocker

### 3. View Attachment on Posted Comment
expected: After submitting a comment with attachment, the comment displays in the thread with the file name and size visible. Both admin and client can see the attachment.
result: skipped
reason: Blocked by API failures

### 4. Download Attachment
expected: Click on an attachment in a posted comment. File downloads to your device (or opens in new tab for images/PDFs).
result: skipped
reason: Blocked by API failures

### 5. File Validation Error
expected: Try attaching a file larger than 10MB or an unsupported type (e.g., .exe). See an error message explaining the file cannot be uploaded.
result: issue
reported: "All tests are failing. CORS error on R2 presign. 500 error on GET /comments. Upload fails with 'Failed to get upload URL'."
severity: blocker

### 6. Email Notification on New Comment
expected: When the other party posts a comment, you receive an email notification with comment preview and a link to the proposal.
result: skipped
reason: Blocked by API failures

### 7. In-App Notification Badge (Admin Portal)
expected: When a client posts a comment, the admin portal notification bell shows updated badge/count.
result: skipped
reason: Blocked by API failures

### 8. In-App Notification Badge (Client Portal)
expected: When an admin posts a comment, the client portal notification bell shows updated badge/count.
result: skipped
reason: Blocked by API failures

### 9. Notification Click Navigation
expected: Click on a comment notification in the dropdown. Browser navigates to the proposal detail page.
result: skipped
reason: Blocked by API failures

## Summary

total: 9
passed: 0
issues: 3
pending: 0
skipped: 6

## Gaps

- truth: "Comments API is stable and handles requests"
  status: failed
  reason: "User reported: 500 Internal Server Error on GET /comments. 'Failed to fetch comments: undefined'. Persists during polling."
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []

- truth: "Client portal can fetch comments"
  status: failed
  reason: "User reported: 500 Internal Server Error on GET /comments. Polling loop is broken."
  severity: blocker
  test: 2
  root_cause: ""
  artifacts: []
  missing: []

- truth: "R2 presign endpoint supports CORS"
  status: failed
  reason: "User reported: 'Access to fetch at ... blocked by CORS policy: Response to preflight request doesn't pass access control check: No Access-Control-Allow-Origin header is present'."
  severity: blocker
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
