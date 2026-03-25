---
status: fixing
trigger: "portal-logout-on-refresh-cors"
created: 2026-01-25T00:00:00Z
updated: 2026-01-25T00:03:00Z
---

## Current Focus

hypothesis: CONFIRMED - withCORS middleware does not merge CORS headers into handler response
test: Comparing auth-me.ts (broken) with auth-logout.ts (working)
expecting: auth-logout manually includes CORS headers, auth-me does not
next_action: Fix withCORS middleware to merge CORS headers into handler response

## Symptoms

expected: User should stay logged in after page refresh
actual: User is logged out and redirected to login page on any page refresh
errors:
- Access to fetch at 'http://localhost:8888/.netlify/functions/auth-me' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
- Failed to load resource: net::ERR_FAILED
- AuthContext.tsx:71 Failed to load user session: TypeError: Failed to fetch
reproduction: Any page refresh (F5, browser button, etc.)
started: Always been like this - never worked correctly

## Eliminated

## Evidence

- timestamp: 2026-01-25T00:01:00Z
  checked: auth-me.ts endpoint implementation
  found: Handler returns statusCode 200 with empty headers object {}
  implication: CORS headers from withCORS middleware are not being merged with handler response

- timestamp: 2026-01-25T00:01:30Z
  checked: withCORS middleware (middleware.ts line 192-217)
  found: withCORS calls handler but does not merge CORS headers into handler's response
  implication: Final response lacks CORS headers even though middleware validates CORS

- timestamp: 2026-01-25T00:02:00Z
  checked: Other middleware like withAuth (line 71-82)
  found: withAuth returns createUnauthorizedResponse which includes CORS headers via getCorsHeaders(origin)
  implication: Error responses have CORS headers, but successful responses from handlers do not

- timestamp: 2026-01-25T00:02:30Z
  checked: auth-logout.ts (working endpoint without compose middleware)
  found: Line 22 manually spreads CORS headers into response: headers: { ...headers, 'Set-Cookie': ... }
  implication: Working endpoints manually add CORS headers, but withCORS middleware doesn't add them to handler responses

## Resolution

root_cause: The withCORS middleware validates CORS and handles preflight requests correctly, but does not merge CORS headers into the successful response returned by the handler. The auth-me handler returns headers: {}, which overwrites/ignores the CORS headers that should be present.

fix: Modified withCORS middleware to await handler response and merge CORS headers into the response headers. Changed from `return handler(event)` to `const response = await handler(event); return { ...response, headers: { ...headers, ...response.headers } }`. This ensures CORS headers are always present in the response while allowing handlers to add their own headers (like Set-Cookie).

verification:
files_changed:
- netlify/functions/_shared/middleware.ts
