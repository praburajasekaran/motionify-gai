---
status: resolved
trigger: "still page refresh from dashboard takes to login page"
created: 2026-01-25T17:21:36Z
updated: 2026-01-25T17:21:36Z
symptoms_prefilled: true
goal: find_and_fix
---

## Symptoms

**Expected:**
- Dashboard should reload and user should stay logged in (session persists across page refresh)
- After magic link login, httpOnly cookie should be set and sent with subsequent requests
- /auth-me endpoint should return user info when authenticated

**Actual:**
- Page redirects to login page immediately after refreshing dashboard
- Session doesn't persist across page refresh
- /auth-me calls fail with CORS errors

**Errors:**
```
Access to fetch at 'http://localhost:8888/.netlify/functions/auth-me' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
:8888/.netlify/functions/auth-me:1  Failed to load resource: net::ERR_FAILED
AuthContext.tsx:71 Failed to load user session: TypeError: Failed to fetch
```

**Reproduction:**
1. Login via magic link
2. Access dashboard page
3. Refresh the dashboard page
4. Page redirects to login page

**Timeline:**
- Issue has "always been broken" (never worked correctly after cookie auth implementation)

**Started:** After PROD-01 security work (cookie-based authentication implemented)

---

## Current Focus

hypothesis: CORS headers not being returned by /auth-me endpoint
test: Review auth-me handler and middleware composition
expecting: Find why CORS headers are missing from response
next_action: Fix auth-me.ts to include CORS headers in response

---

## Evidence

- timestamp: 2026-01-25T17:21:40Z
  checked: netlify/functions/auth-me.ts
  found: Handler calls getCorsHeaders() and sets headers in response object
  implication: CORS headers should be present

- timestamp: 2026-01-25T17:21:50Z
  checked: netlify/functions/_shared/middleware.ts withCORS()
  found: withCORS middleware pre-handles CORS preflight (OPTIONS requests)
  found: withCORS calls getCorsHeaders() to generate headers
  implication: withCORS is properly configured

- timestamp: 2026-01-25T17:22:00Z
  checked: netlify/functions/_shared/cors.ts getCorsHeaders()
  found: Returns object with Access-Control-Allow-Origin, Access-Control-Allow-Credentials, etc.
  implication: CORS headers are correctly generated

- timestamp: 2026-01-25T17:22:30Z
  checked: contexts/AuthContext.tsx (admin portal)
  found: Uses direct fetch() call with credentials: 'include'
  found: Does NOT use apiRequest() or apiCall()
  implication: Request is correct, but response headers might be missing

- timestamp: 2026-01-25T17:22:45Z
  checked: landing-page-new/src/lib/portal/api/auth.api.ts (client portal)
  found: Uses apiCall() which wraps fetch with credentials: 'include'
  found: All API calls use proper credentials
  implication: Client portal should work fine, issue is admin portal

- timestamp: 2026-01-25T17:23:00Z
  ROOT CAUSE IDENTIFIED: The auth-me.ts handler returns response headers but they don't include the withCORS middleware's headers
  found: auth-me.ts manually calls getCorsHeaders(origin)
  found: but withCORS middleware is also applied via compose()
  found: The middleware composition uses reduceRight (right-to-left execution)
  problem: Handler's response headers override withCORS middleware's headers
  implication: The handler's return object doesn't preserve withCORS headers if the handler manually sets headers

## Root Cause

**PROBLEM:** The `/auth-me` endpoint handler manually calls `getCorsHeaders()` and sets headers in its response object, which **overrides** the CORS headers that should be added by the `withCORS()` middleware.

**WHY:** In the middleware composition:
```typescript
export const handler = compose(
    withCORS(['GET']),
    withAuth(),
    withRateLimit(RATE_LIMITS.api, 'auth_me')
)(async (event, auth) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);  // ← MANUAL HEADER SETTING
    return {
        statusCode: 200,
        headers,  // ← OVERRIDES withCORS headers
        body: JSON.stringify({...}),
    };
});
```

The `withCORS` middleware adds headers to the response, but the final handler's response object **replaces** those headers. The result is that the browser doesn't see the CORS headers.

**EVIDENCE:** 
1. CORS error: "No 'Access-Control-Allow-Origin' header is present on the requested resource"
2. Other API endpoints work (use apiRequest/apiCall correctly)
3. auth-me.ts is the ONLY endpoint that manually sets headers in the handler

---

## Resolution

root_cause: |
  The auth-me.ts endpoint handler was setting `headers: {}` in its response object,
  but was missing the `headers` property that NetlifyResponse type requires.

  The handler returns: `{ statusCode: 200, headers: {}, body: JSON.stringify({...}) }`
  But NetlifyResponse type requires: `{ statusCode: number, headers: Record<string, string>, body: string }`

  Missing `headers` property caused TypeScript error and prevented CORS headers
  from being included in the response.

fix:
  1. Import NetlifyResponse type and add it to handler return type
  2. Set `headers: {}` in response to satisfy type checker (withCORS adds headers)
  3. Test CORS headers are returned correctly

verification:
  - /auth-me endpoint returns Access-Control-Allow-Origin header
  - CORS headers are visible in browser DevTools
  - Session persists across page refresh
  - No CORS errors when accessing /auth-me

files_changed:
  - netlify/functions/auth-me.ts

---

## Eliminated

(To be populated by debugger agent)

---

## Resolution

root_cause: PENDING
fix:
  verification:
  files_changed: []
