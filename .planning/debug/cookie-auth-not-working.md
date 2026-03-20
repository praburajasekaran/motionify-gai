---
status: diagnosed
trigger: "Cookie-based authentication not working in PROD-01"
created: 2026-01-24T10:00:00Z
updated: 2026-01-24T10:05:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Multiple issues causing cookie auth to fail
test: Read all auth files and trace the flow
expecting: Find implementation gaps
next_action: Report root cause

## Symptoms

expected: Magic link verification should set httpOnly cookie with JWT token, cookie sent with subsequent requests, /auth-me returns user info
actual: No auth_token httpOnly cookie visible in browser DevTools, session doesn't persist across refresh, /auth-me returns 401
errors: 401 Unauthorized from /auth-me endpoint
reproduction: Login via magic link, check browser DevTools cookies, refresh page
started: After PROD-01-02 implementation

## Eliminated

## Evidence

- timestamp: 2026-01-24T10:01:00Z
  checked: auth-verify-magic-link.ts (lines 335-345)
  found: Backend DOES set Set-Cookie header correctly via createAuthCookie()
  implication: Backend cookie setting is implemented correctly

- timestamp: 2026-01-24T10:01:30Z
  checked: jwt.ts createAuthCookie() (lines 111-129)
  found: Cookie attributes are correct - HttpOnly, Path=/, SameSite=Strict, Secure (in prod)
  implication: Cookie creation is implemented correctly

- timestamp: 2026-01-24T10:02:00Z
  checked: lib/auth.ts verifyMagicLink() (lines 205-256)
  found: CRITICAL BUG - Frontend does NOT include credentials:'include' when calling auth-verify-magic-link
  implication: Browser will NOT accept Set-Cookie header from cross-origin response

- timestamp: 2026-01-24T10:02:30Z
  checked: lib/auth.ts verifyMagicLink() (lines 229-234)
  found: CRITICAL BUG - Frontend still expects token in response body (responseData.token) and stores it in localStorage
  implication: Code expects old localStorage pattern, not cookie-based auth

- timestamp: 2026-01-24T10:03:00Z
  checked: auth-verify-magic-link.ts (lines 338-351)
  found: Backend correctly removes token from response body (line 339: token: unusedToken)
  implication: Frontend will get undefined for responseData.token, storeAuthSession will fail

- timestamp: 2026-01-24T10:03:30Z
  checked: lib/api-config.ts (line 73)
  found: apiRequest() correctly includes credentials:'include'
  implication: Other API calls work, but verifyMagicLink doesn't use apiRequest()

## Resolution

root_cause: |
  Two critical issues causing cookie-based auth to fail:

  1. lib/auth.ts verifyMagicLink() (line 207-208) - The fetch call does NOT include
     credentials:'include', so the browser rejects the Set-Cookie header from the
     cross-origin response. This is why the cookie never appears in DevTools.

  2. lib/auth.ts verifyMagicLink() (lines 229-234) - Frontend still tries to extract
     token from response body (responseData.token) and store in localStorage. But
     the backend (auth-verify-magic-link.ts line 339) correctly removes token from
     response body. This code needs to be updated to NOT expect/store token since
     authentication is now cookie-based.

  The api-config.ts correctly includes credentials:'include' (line 73), but
  verifyMagicLink() does NOT use apiRequest() - it uses raw fetch() instead.

fix:
verification:
files_changed: []
