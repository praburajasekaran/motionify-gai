---
module: Authentication
date: 2026-02-20
problem_type: integration_issue
component: authentication
symptoms:
  - "Magic link email redirects to Vite error page: 'server configured with public base URL of /portal/'"
  - "After fixing Vite error, link redirects back to /login page without verifying"
  - "Magic link URL in email shows /auth/verify or /portal/auth/verify instead of /portal/login"
root_cause: config_error
resolution_type: code_fix
severity: critical
tags: [magic-link, authentication, react-router, vite, netlify-cli, worktree, base-url]
---

# Troubleshooting: Magic Link URL Points to Non-Existent Route

## Problem

The magic link email contained a URL pointing to `/auth/verify` which does not exist as a React Router route. This caused either a Vite base-URL error page or a silent redirect to `/login` via the catch-all route, making passwordless login completely broken.

## Environment

- Module: Authentication
- Affected Component: `netlify/functions/auth-request-magic-link.ts`, `pages/Login.tsx`, `App.tsx`
- Date: 2026-02-20

## Symptoms

- Clicking magic link in email → Vite error: "server configured with a public base URL of /portal/ — did you mean to visit /portal/auth/verify?"
- After fixing to `/portal/auth/verify` → link works but user ends up back on login page (not logged in)
- Root issue: Neither `/auth/verify` nor `/portal/auth/verify` is a defined route in the React app

## What Didn't Work

**Attempted Solution 1:** Changed URL from `${portalUrl}/auth/verify` to `${portalUrl}/portal/auth/verify`
- **Why it failed:** Even with the correct Vite base prefix, `/auth/verify` is not a route in `App.tsx`. React Router's catch-all `<Route path="*" element={<Navigate to="/" replace />} />` redirects to `/`, which then redirects to `/login`. The token is discarded silently.

## Solution

Change the magic link URL to point to the actual route that handles token verification — the `/login` route at `pages/Login.tsx`, which reads `token` and `email` from `useSearchParams`.

**In `netlify/functions/auth-request-magic-link.ts`:**

```typescript
// Before (wrong — route doesn't exist):
const magicLink = `${portalUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

// Intermediate attempt (still wrong — route doesn't exist):
const magicLink = `${portalUrl}/portal/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

// After (correct):
const magicLink = `${portalUrl}/portal/login?token=${token}&email=${encodeURIComponent(email)}`;
```

**Why `/portal/login` and not `/login`:**
- `BrowserRouter` in `App.tsx` uses `basename="/portal"`, so internally routes are relative: `/login` maps to the browser path `/portal/login`
- The magic link in email must be a full browser URL, so it needs the `/portal` prefix explicitly
- `Login.tsx` uses `useSearchParams` to extract `token` and `email` and calls `verifyMagicLink()` automatically on mount when these params are present

### Netlify CLI Worktree Path Issue (Bonus)

When working in a git worktree (e.g., `worktrees/fix-proposal-save-speed`), the Netlify CLI (`netlify dev`) resolves and compiles functions from the **git repo root**, not the worktree's working directory. This means:

- Editing `worktrees/fix-proposal-save-speed/netlify/functions/auth-request-magic-link.ts` has no effect
- You must edit the file at the **main repo root**: `netlify/functions/auth-request-magic-link.ts`
- Additionally, Netlify CLI caches compiled JS in `.netlify/functions-serve/` — **must delete this cache** after source changes or the old version continues to be served

```bash
# Required after every source change to a Netlify function:
rm -rf .netlify/functions-serve
# Then restart:
netlify dev
```

## Why This Works

1. **Routing architecture**: `App.tsx` defines `<BrowserRouter basename="/portal">` — all routes are relative to this prefix. The catch-all `<Route path="*" element={<Navigate to="/" replace />} />` silently eats unknown paths.
2. **Verification handler location**: `Login.tsx` already handles token verification via `useEffect` watching `searchParams`. No separate `/auth/verify` route was ever needed.
3. **Full browser URL construction**: Magic links in emails must be absolute browser URLs. The `basename` only affects how React Router matches paths internally — the actual browser URL still includes `/portal/`.

## Prevention

- **Before creating a magic link or redirect URL**, verify the target path exists in `App.tsx` routes. Use the browser's network tab or React Router devtools to confirm.
- **Vite `base` config and React Router `basename` are independent** — Vite's `base: '/portal/'` affects static asset URLs, while `basename="/portal"` affects how React Router matches routes. Both must be considered when building absolute URLs.
- **Netlify CLI + worktrees**: Always edit function source in the **main repo root** (`netlify/functions/`), not in the worktree. Run `rm -rf .netlify/functions-serve` before restarting `netlify dev` to avoid serving stale compiled functions.
- **Magic link target route**: The login page (`/portal/login`) with `useSearchParams` is the correct handler. Do not create a separate `/auth/verify` route — it's unnecessary.

## Related Issues

No related issues documented yet.
