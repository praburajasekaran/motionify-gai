---
status: investigating
trigger: "File validation prevents invalid uploads - UAT Gap Test 5"
created: 2026-01-20T13:21:15Z
updated: 2026-01-20T13:21:15Z
---

## Current Focus
hypothesis: The root cause is incorrect client-side validation logic in `UploadFileModal.tsx`. It allows 500MB (vs 10MB req) and has no file type validation. The API errors (400/500) are side effects of the UAT environment (bad IDs/DB state) triggered by the mock upload success.
test: Confirm absence of file type validation and presence of 500MB limit in UploadFileModal.tsx.
expecting: Limit set to 500 * 1024 * 1024. No check for file extension or MIME type.
next_action: Verify findings and report root cause.

## Symptoms
expected: Try attaching a file larger than 10MB or an unsupported type. See error message.
actual: NotificationContext.tsx:87 GET /notifications 400 (Bad Request). api-config.ts:70 GET /comments 500 (Internal Server Error). Failed to fetch comments.
errors: 400 Bad Request (notifications), 500 Internal Server Error (comments)
reproduction: Test 5 in UAT
started: Discovered during UAT

## Evidence
- timestamp: 2026-01-20T10:00:00Z
  checked: NotificationContext.tsx
  found: Fetches `/notifications?userId=${user.id}`. If user exists, it fetches.
  implication: If 400, `userId` might be missing or backend validation fails.
- timestamp: 2026-01-20T10:00:00Z
  checked: UploadFileModal.tsx
  found: Uses mock implementation (setTimeout). Max file size is 500MB, not 10MB.
  implication: The "upload" itself isn't failing on the server because it never goes to the server. The errors are side effects.
- timestamp: 2026-01-20T10:00:00Z
  checked: CommentThread.tsx
  found: Fetches `/comments?proposalId=${proposalId}`.
  implication: If 500, backend likely crashes on missing/invalid `proposalId`.
- timestamp: 2026-01-20T10:05:00Z
  checked: netlify/functions/notifications.ts
  found: Returns 400 if `userId` is missing or invalid UUID.
  implication: Confirms UAT user likely has invalid/mock ID.
- timestamp: 2026-01-20T10:05:00Z
  checked: netlify/functions/comments.ts
  found: Returns 400 for bad ID, 500 for internal errors. 
  implication: 500 means DB query failed or connection issue, separate from validation logic.
- timestamp: 2026-01-20T10:10:00Z
  checked: UploadFileModal.tsx
  found: `MAX_FILE_SIZE` = 500MB. Logic only checks `file.size`.
  implication: No file type validation exists.

## Resolution
root_cause: Client-side validation in `UploadFileModal.tsx` incorrectly sets limit to 500MB (line 15) and implements NO file type checks, contradicting UAT requirements (10MB, restricted types). The API errors are side effects of using mock user IDs in the test environment.
fix: Update `MAX_FILE_SIZE` to 10MB and add file type validation (accept attribute and check in `handleFileChange`).
verification: Try uploading >10MB file and verify error. Try uploading .exe and verify error.
files_changed: []
