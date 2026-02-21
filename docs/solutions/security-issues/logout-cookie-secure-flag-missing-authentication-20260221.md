---
module: Authentication
date: 2026-02-21
problem_type: security_issue
component: authentication
symptoms:
  - "After logout, refreshing the page reloads the dashboard instead of staying on login"
  - "auth_token cookie persists in browser after logout despite Max-Age=0 being set"
root_cause: config_error
resolution_type: code_fix
severity: high
tags: [httponly-cookie, secure-flag, logout, auth-cookie, set-cookie, netlify-functions]
---

# Troubleshooting: Logout Does Not Delete Auth Cookie in Production

## Problem

After clicking Log Out, the app navigates to `/login` successfully (client state is cleared). But
if the user refreshes the page, the dashboard reloads as if they're still authenticated. The
`auth_token` httpOnly cookie is never actually deleted by the browser.

## Environment

- Module: Authentication
- Affected Component: `netlify/functions/_shared/jwt.ts` — `createClearAuthCookie()`
- Date: 2026-02-21

## Symptoms

- Logout appears to work (redirects to `/login`)
- Refreshing after logout redirects back to dashboard
- DevTools → Application → Cookies: `auth_token` cookie is still present after logout
- Backend `auth-me` endpoint returns valid user on refresh because cookie is still valid

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt after inspecting the `createClearAuthCookie` function and comparing it against `createAuthCookie`.

## Solution

**Root cause:** `createClearAuthCookie()` set `Max-Age=0` to expire the cookie but omitted the `Secure` attribute. Browser rules require that a `Set-Cookie` deletion header must include the **exact same flags** that were present when the cookie was originally created. Without `Secure`, the browser silently ignores the deletion attempt.

**Code change in `netlify/functions/_shared/jwt.ts`:**

```typescript
// Before (broken) — missing Secure flag:
export function createClearAuthCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=${isProduction ? 'Strict' : 'Lax'}`;
}

// After (fixed) — mirrors createAuthCookie's conditional Secure flag:
export function createClearAuthCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieAttributes = [
        'auth_token=',
        'HttpOnly',
        'Path=/',
        'Max-Age=0',
        `SameSite=${isProduction ? 'Strict' : 'Lax'}`,
    ];
    if (isProduction) {
        cookieAttributes.push('Secure');
    }
    return cookieAttributes.join('; ');
}
```

## Why This Works

The browser matches a cookie deletion `Set-Cookie` header against the stored cookie by name AND
by the combination of `Path`, `Domain`, and `Secure` attributes. If the stored cookie has `Secure`
set but the deletion response does not, they don't match and the browser treats them as different
cookies — the deletion is silently ignored.

In Netlify (and most Node.js hosting), `NODE_ENV=production` for all deploys (including staging
branches). So any cookie created in deployed environments has `Secure`. The fix ensures
`createClearAuthCookie` applies the same conditional `Secure` logic as `createAuthCookie`.

**Why navigating to `/login` worked without a refresh:** Client-side state (`setUserState(null)`,
`clearAuthSession()`, `navigate('/login')`) was cleared correctly. The stale cookie only matters
when the page reloads and `auth-me` is called server-side with the still-valid cookie.

## Prevention

- **Golden rule:** The `Set-Cookie` header that deletes a cookie must include all the same
  attributes (`Secure`, `SameSite`, `Path`, `Domain`) that were used to set it.
- When adding new attributes to `createAuthCookie`, always mirror them in `createClearAuthCookie`.
- After implementing logout, always test by: logout → verify redirect → **hard refresh** →
  confirm stay on login page. A soft navigation test is insufficient.
- Check DevTools → Application → Cookies after logout to confirm cookie is gone.

## Related Issues

No related issues documented yet.
