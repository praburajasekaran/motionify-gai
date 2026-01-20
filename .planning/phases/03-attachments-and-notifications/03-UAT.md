---
status: diagnosed
phase: 03-attachments-and-notifications
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-01-20T12:30:00Z
updated: 2026-01-20T13:00:00Z
---

## Current Test

number: 5
name: File Validation Error
expected: |
  Try attaching a file larger than 10MB or an unsupported type (e.g., .exe). See an error message explaining the file cannot be uploaded.
awaiting: user response

## Tests

### 1. Attach File to Comment (Admin Portal)
expected: In admin portal, open a proposal with comment thread. Click attach/upload button in comment input. Select a file (PNG, JPG, PDF, or DOCX under 10MB). See upload progress bar. After upload completes, file appears as attachment preview before submitting comment.
result: issue
reported: "CORS error on R2 presign endpoint - Access to fetch at 'http://localhost:9999/.netlify/functions/api/r2-presign' blocked by CORS policy. Comments endpoint returning 500 Internal Server Error. Upload fails with 'Failed to get upload URL'"
severity: blocker

### 2. Attach File to Comment (Client Portal)
expected: In client portal, open a proposal. Click attach/upload button in comment input. Select a file. See upload progress bar. After upload completes, file appears as attachment preview before submitting comment.
result: issue
reported: "Multiple API failures: GET /notifications 400 Bad Request, GET /comments 500 Internal Server Error, POST /r2-presign blocked by CORS policy. Upload fails."
severity: blocker

### 3. View Attachment on Posted Comment
expected: After submitting a comment with attachment, the comment displays in the thread with the file name and size visible. Both admin and client can see the attachment.
result: skipped
reason: Blocked by Test 1 & 2 failures (cannot attach file)

### 4. Download Attachment
expected: Click on an attachment in a posted comment. File downloads to your device (or opens in new tab for images/PDFs).
result: skipped
reason: Blocked by Test 1 & 2 failures (cannot attach file)

### 5. File Validation Error
expected: Try attaching a file larger than 10MB or an unsupported type (e.g., .exe). See an error message explaining the file cannot be uploaded.
result: issue
reported: "NotificationContext.tsx:87 GET /notifications 400 (Bad Request). api-config.ts:70 GET /comments 500 (Internal Server Error). Failed to fetch comments."
severity: blocker

### 6. Email Notification on New Comment
expected: When the other party posts a comment, you receive an email notification with comment preview and a link to the proposal. (Test both directions: client posts → admin gets email, admin posts → client gets email)
result: [pending]

### 7. In-App Notification Badge (Admin Portal)
expected: When a client posts a comment, the admin portal notification bell shows updated badge/count. The new notification appears in the dropdown.
result: [pending]

### 8. In-App Notification Badge (Client Portal)
expected: When an admin posts a comment, the client portal notification bell shows updated badge/count. The new notification appears in the dropdown.
result: [pending]

### 9. Notification Click Navigation
expected: Click on a comment notification in the dropdown. Browser navigates to the proposal detail page where the comment was posted.
result: [pending]

## Summary

total: 9
passed: 0
issues: 3
pending: 4
skipped: 2

## Gaps

- truth: "File attachment upload works in admin portal"
  status: failed
  reason: "User reported: CORS error on R2 presign endpoint - Access to fetch at 'http://localhost:9999/.netlify/functions/api/r2-presign' blocked by CORS policy. Comments endpoint returning 500 Internal Server Error. Upload fails with 'Failed to get upload URL'"
  severity: blocker
  test: 1
  root_cause: "Missing env vars (R2_ACCOUNT_ID, DATABASE_URL) + Defective error handling (missing CORS in 500 responses)"
  artifacts:
    - path: "netlify/functions/r2-presign.ts"
      issue: "Missing CORS headers in error blocks"
    - path: "netlify/functions/comments.ts"
      issue: "Unsafe DB client init before try/catch"
  missing:
    - "Add R2_* and DATABASE_URL to .env"
    - "Add Access-Control-Allow-Origin header to 500 error responses"
  debug_session: ".planning/debug/admin-upload-cors-500.md"

- truth: "File attachment upload works in client portal"
  status: failed
  reason: "User reported: Multiple API failures: GET /notifications 400 Bad Request, GET /comments 500 Internal Server Error, POST /r2-presign blocked by CORS policy. Upload fails."
  severity: blocker
  test: 2
  root_cause: "API Path mismatch (/api/r2-presign vs /.netlify/functions/r2-presign) + Strict UUID validation failing + Missing DB migration"
  artifacts:
    - path: "landing-page-new/src/lib/attachments.ts"
      issue: "Incorrect API path /api/r2-presign"
    - path: "netlify/functions/notifications.ts"
      issue: "Strict UUID validation rejects valid requests"
  missing:
    - "Update frontend path to /.netlify/functions/r2-presign"
    - "Relax/fix UUID validation"
    - "Apply database schema migration"
  debug_session: ".planning/debug/client-upload-api-failures.md"

- truth: "File validation prevents invalid uploads"
  status: failed
  reason: "User reported: NotificationContext.tsx:87 GET /notifications 400 (Bad Request). api-config.ts:70 GET /comments 500 (Internal Server Error). Failed to fetch comments."
  severity: blocker
  test: 5
  root_cause: "Logic error in UploadFileModal.tsx (500MB limit vs 10MB expected, missing type check)"
  artifacts:
    - path: "landing-page-new/src/lib/portal/components/UploadFileModal.tsx"
      issue: "MAX_FILE_SIZE = 500MB, no type validation"
  missing:
    - "Set MAX_FILE_SIZE = 10MB"
    - "Add file type validation (allowed types list)"
  debug_session: ".planning/debug/file-validation-api-failures.md"
