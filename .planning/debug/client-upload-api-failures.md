---
status: diagnosed
trigger: "File attachment upload works in client portal (UAT GAP)"
created: 2026-01-20T13:21:17Z
updated: 2026-01-20T13:45:00Z
---

## Current Focus
hypothesis: Root causes identified for all three failures.
test: verification of findings against code.
expecting: clear path to fix.
next_action: report_findings

## Symptoms
expected: In client portal, open a proposal. Click attach/upload button in comment input. Select a file. See upload progress bar. After upload completes, file appears as attachment preview before submitting comment.
actual: User reported: Multiple API failures: GET /notifications 400 Bad Request, GET /comments 500 Internal Server Error, POST /r2-presign blocked by CORS policy. Upload fails.
errors: 400 Bad Request, 500 Internal Server Error, CORS
reproduction: Test 2 in UAT
started: Discovered during UAT

## Eliminated
- hypothesis: Auth header missing causes 400 on notifications
  evidence: 400 is returned explicitly when userId is missing or invalid UUID. Frontend sends userId in query param, but it might be invalid format.
  timestamp: 2026-01-20T13:35:00Z
- hypothesis: Shared auth module causing crash in comments.ts
  evidence: _shared/auth.ts handles missing env vars gracefully. GET request in comments.ts doesn't use auth but still 500s.
  timestamp: 2026-01-20T13:42:00Z

## Evidence
- timestamp: 2026-01-20T13:25:00Z
  checked: netlify/functions/r2-presign.ts vs landing-page-new/src/lib/attachments.ts
  found: Backend endpoint is `/.netlify/functions/r2-presign`. Frontend calls `${API_BASE}/api/r2-presign`.
  implication: Path mismatch causes 404/405, interpreted as CORS error by browser.
- timestamp: 2026-01-20T13:30:00Z
  checked: netlify/functions/notifications.ts
  found: Strict UUID validation `isValidUUID` (regex) on `userId`.
  implication: If auth provider returns non-standard UUID (or legacy ID), request fails with 400.
- timestamp: 2026-01-20T13:35:00Z
  checked: netlify/functions/comments.ts
  found: GET request validates proposalId (UUID) then queries `proposal_comments` table.
  implication: Since 500 occurs after validation (implied), it's likely a Database Error (missing table or column).

## Resolution
root_cause:
1. CORS/Upload: Frontend path includes extra `/api` segment not present in backend function config.
2. Notifications 400: Strict UUID validation rejects user IDs that don't match specific regex (or race condition sending undefined).
3. Comments 500: likely `proposal_comments` table missing or schema mismatch (SQL query failure).
fix:
verification:
files_changed: []
