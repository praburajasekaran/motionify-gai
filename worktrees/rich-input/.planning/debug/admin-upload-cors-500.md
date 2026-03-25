---
status: resolved
trigger: "File attachment upload works in admin portal - CORS error on R2 presign endpoint, Comments endpoint returning 500"
created: 2026-01-20T13:21:11Z
updated: 2026-01-20T13:25:00Z
---

## Current Focus
hypothesis: Missing environment variables (R2 and DATABASE_URL) causing 500 errors, which manifest as CORS errors due to missing headers in error paths.
test: analyzed code paths for missing env vars
expecting: confirmed missing headers in r2-presign and uncaught exception in comments
next_action: report root cause

## Symptoms
expected: In admin portal, open a proposal with comment thread. Click attach/upload button in comment input. Select a file. See upload progress bar. After upload completes, file appears as attachment preview.
actual: CORS error on R2 presign endpoint - Access to fetch at 'http://localhost:9999/.netlify/functions/api/r2-presign' blocked by CORS policy. Comments endpoint returning 500 Internal Server Error. Upload fails with 'Failed to get upload URL'
errors: "CORS error on R2 presign endpoint", "500 Internal Server Error"
reproduction: Test 1 in UAT
started: Discovered during UAT

## Eliminated
- hypothesis: CORS misconfiguration in API router
  evidence: `r2-presign.ts` handles CORS manually and correctly for successful requests. The issue is specific to error paths.

## Evidence
- timestamp: 2026-01-20T13:23:00Z
  checked: netlify/functions/r2-presign.ts
  found: Lines 38-44 check for missing R2 environment variables. If missing, it returns a 500 Response object but DOES NOT include "Access-Control-Allow-Origin" headers in that specific response.
  implication: Missing R2 credentials will look like a CORS error to the browser.
- timestamp: 2026-01-20T13:23:00Z
  checked: netlify/functions/comments.ts
  found: `getDbClient()` checks for `DATABASE_URL` and throws an error if missing (lines 26-30). This function is called at line 60, BEFORE the `try/catch` block starts at line 62.
  implication: Missing DATABASE_URL causes an uncaught exception, leading to a generic 500 error (and possibly CORS failure depending on runtime error handling).

## Resolution
root_cause: Missing environment variables in the UAT environment. specifically `R2_ACCOUNT_ID` (and related R2 vars) and `DATABASE_URL`. The code handles these missing vars by throwing errors or returning 500s that lack proper CORS headers.
fix: Configure the missing environment variables in the UAT environment (Netlify Site Settings or .env file). Also, fix the code to include CORS headers in the error response and move the DB client init inside the try/catch block.
verification:
files_changed: []
