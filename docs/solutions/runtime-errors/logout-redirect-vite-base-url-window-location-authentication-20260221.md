---
module: Authentication
date: 2026-02-21
problem_type: runtime_error
component: authentication
symptoms:
  - "After logout, browser shows Vite error: 'The server is configured with a public base URL of /portal/ - did you mean to visit /portal/ instead?'"
  - "Full page reload after logout fails to serve the login SPA route under Vite base /portal/"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags: [vite, react-router, useNavigate, browserrouter, basename, logout-redirect, window-location, spa]
---

# Troubleshooting: Logout Redirect Shows Vite Base URL Error Page

## Problem

After clicking Log Out, instead of seeing the login page the browser shows a Vite dev server error:

```
The server is configured with a public base URL of /portal/ - did you mean to visit /portal/ instead?
```

## Environment

- Module: Authentication
- Affected Components: `contexts/AuthContext.tsx`, `App.tsx`
- Vite config: `base: '/portal/'` in `vite.config.ts`
- React Router: `<BrowserRouter basename="/portal">`
- Date: 2026-02-21

## Symptoms

- Clicking Log Out shows the Vite dev server error page instead of the login page
- Problem only occurs in local development (Vite dev server), not in production/staging
- Hard-navigating to the URL manually works; only the programmatic redirect fails

## What Didn't Work

**Attempted Solution 1:** Simply changing the href value in `window.location.href`
- **Why it failed:** Any `window.location.href` assignment causes a full page reload. Vite dev
  server with `base: '/portal/'` cannot serve SPA deep links via full reloads unless going to
  exactly `/portal/` — it responds with the base URL error for paths like `/portal/login`.

## Solution

Two changes required:

**1. Move `<BrowserRouter>` outside `<AuthProvider>` in `App.tsx`**

`useNavigate` from React Router can only be called inside a component that is a descendant of
`<BrowserRouter>`. AuthContext was previously a child of BrowserRouter but needed to use
navigate — so BrowserRouter had to wrap AuthProvider.

```tsx
// Before (broken) — BrowserRouter inside AuthProvider tree was fine for routes but
// AuthContext couldn't use useNavigate because it was a sibling, not a descendant:
<BrowserRouter basename="/portal">
  <AuthProvider>   {/* AuthContext uses window.location.href for logout */}
    ...
  </AuthProvider>
</BrowserRouter>

// After (fixed) — BrowserRouter wraps AuthProvider so AuthContext can use useNavigate:
<BrowserRouter basename="/portal">
  <AuthProvider>   {/* AuthContext now uses useNavigate */}
    <NotificationProvider>
      <Routes>...</Routes>
    </NotificationProvider>
  </AuthProvider>
</BrowserRouter>
```

**2. Replace `window.location.href` with `useNavigate` in `contexts/AuthContext.tsx`**

```typescript
// Before (broken):
import { clearAuthSession } from '../lib/auth';

const logout = useCallback(async () => {
    await fetch(`${API_BASE}/auth-logout`, { method: 'POST', credentials: 'include' });
    clearAuthSession();
    setToken(null);
    setUserState(null);
    window.location.href = '/portal/login';  // ← full page reload, breaks Vite dev
}, []);

// After (fixed):
import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../lib/auth';

const navigate = useNavigate();

const logout = useCallback(async () => {
    await fetch(`${API_BASE}/auth-logout`, { method: 'POST', credentials: 'include' });
    clearAuthSession();
    setToken(null);
    setUserState(null);
    navigate('/login', { replace: true });  // ← History API, no page reload
}, [navigate]);
```

## Why This Works

`window.location.href` triggers a full browser navigation (HTTP request to the server). Vite dev
server with `base: '/portal/'` is configured to serve the SPA bundle only when the request comes
through its historyApiFallback mechanism — but that only works for the Netlify dev proxy, not
direct deep links.

`navigate('/login', { replace: true })` from React Router uses the HTML5 History API
(`history.replaceState`). This is a client-side navigation — no HTTP request is made to the
server, no page reload occurs, and Vite is never involved. React Router handles it entirely in
the browser.

The `replace: true` option replaces the current history entry so the user can't click Back to
return to the authenticated state after logging out.

## Prevention

- Never use `window.location.href` for navigation within a React Router SPA. Always use
  `useNavigate` (for programmatic navigation) or `<Link>` (for rendered navigation).
- If you need to use `navigate` in a context/provider (outside a route component), ensure
  `<BrowserRouter>` wraps that provider in the component tree.
- `window.location.href` is only appropriate for navigating to a completely different origin
  or intentionally breaking out of the SPA (e.g., logging out to an external identity provider).

## Related Issues

- See also: [vite-base-url-broken-image-paths-login-20260220.md](../ui-bugs/vite-base-url-broken-image-paths-login-20260220.md) — related Vite `/portal/` base URL issue affecting image paths
