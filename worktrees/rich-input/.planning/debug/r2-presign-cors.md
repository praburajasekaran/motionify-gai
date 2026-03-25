---
status: diagnosed
trigger: Diagnose root cause of CORS error on R2 presign endpoint
created: 2026-01-20T14:36:11Z
updated: 2026-01-20T14:36:11Z
---

## Current Focus
hypothesis: V2 API usage causing deployment/runtime failure in V1 environment
test: Compare with working functions (health.ts, deliverables.ts)
expecting: Mismatch in API version and dependencies
next_action: Report root cause

## Symptoms
expected: CORS headers present on all responses including preflight OPTIONS
actual: No Access-Control-Allow-Origin header is present on preflight response
errors: Access to fetch at ... blocked by CORS policy: Response to preflight request doesn't pass access control check: No Access-Control-Allow-Origin header is present.
started: Phase 03 UAT
reproduction: triggering the r2-presign endpoint from client

## Eliminated
- hypothesis: Missing CORS headers in code
  evidence: Code has explicit CORS headers handling for OPTIONS and all responses.
  timestamp: 2026-01-20T14:36:11Z

- hypothesis: S3Client initialization crash due to missing env vars
  evidence: Reproduction script proved S3Client constructor is safe with undefined/empty values.
  timestamp: 2026-01-20T14:36:11Z

## Evidence
- timestamp: 2026-01-20T14:36:11Z
  checked: netlify/functions/r2-presign.ts
  found: Uses Netlify Functions V2 (export default async req => Response) and imports Config from @netlify/functions (devDependency).
  implication: Potential bundling issue or runtime mismatch.

- timestamp: 2026-01-20T14:36:11Z
  checked: netlify/functions/health.ts and deliverables.ts
  found: Use Netlify Functions V1 (export const handler = async event => ResponseBody).
  implication: These functions work. The codebase standard is V1.

- timestamp: 2026-01-20T14:36:11Z
  checked: netlify.toml
  found: Redirects /api/* to /.netlify/functions/:splat.
  implication: Expects standard function deployment. V2 path config might conflict.

## Resolution
root_cause: Inconsistent use of Netlify Functions V2 API in r2-presign.ts within a V1-dominant codebase. The function likely fails to deploy or start (500/404) due to bundling issues with @netlify/functions (devDependency) or routing conflicts, causing platform error pages to be returned without CORS headers.
fix: Refactor r2-presign.ts to use V1 API signature and _shared/cors helper.
verification: Verify r2-presign endpoint returns 200/204 with CORS headers.
files_changed: []

