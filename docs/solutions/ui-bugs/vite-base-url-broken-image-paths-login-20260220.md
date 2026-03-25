---
module: Authentication
date: 2026-02-20
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Logo image broken (404) on login page"
  - "Image src uses /images/... path which resolves incorrectly when Vite base is /portal/"
root_cause: config_error
resolution_type: code_fix
severity: medium
tags: [vite, base-url, static-assets, login, image-path, portal]
---

# Troubleshooting: Login Page Logo Broken Due to Vite Base URL

## Problem

The Motionify logo on the login page rendered as a broken image because the `src` path used `/images/motionify-studio-dark-web.png` — a root-relative path that doesn't account for Vite's `base: '/portal/'` configuration. All public assets are served under `/portal/`, so the correct path must include the `/portal/` prefix.

## Environment

- Module: Authentication
- Affected Component: `pages/Login.tsx` (portal React app)
- Vite config: `base: '/portal/'` in `vite.config.ts`
- Date: 2026-02-20

## Symptoms

- Login page shows broken image where the logo should appear
- Browser network tab shows 404 for `/images/motionify-studio-dark-web.png`
- Correct URL should be `/portal/images/...` or use the correct filename under `public/`

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt.

## Solution

Update the image `src` in `pages/Login.tsx` to include the `/portal/` prefix and use the correct logo filename:

```tsx
// Before (broken — missing Vite base prefix):
<img
  src="/images/motionify-studio-dark-web.png"
  alt="Motionify Studio"
  className="h-8 w-auto"
/>

// After (correct — includes /portal/ base prefix):
<img
  src="/portal/motionify-studio-dark.png"
  alt="Motionify Studio"
  className="h-8 w-auto"
/>
```

Note: The correct logo file for a light background (`bg-background` = `#f8f8f7`) is `motionify-studio-dark.png` (dark logo on light bg), not `motionify-studio-dark-web.png`.

## Why This Works

When Vite is configured with `base: '/portal/'`, static files placed in the `public/` directory are served at `/portal/[filename]`. Using a root-relative path like `/images/foo.png` bypasses this prefix and results in a 404 unless the file is served at the web root (which it isn't — the Vite dev server and built assets all live under `/portal/`).

## Prevention

- **All `<img src>`, `<link href>`, and similar static asset references in the portal app must start with `/portal/`** (or use Vite's `import` mechanism for processed assets, which handles the base automatically).
- **When Vite `base` is set to a subdirectory**: Use `import.meta.env.BASE_URL` as a prefix for public asset URLs, or hardcode the base path consistently:
  ```tsx
  // Safe pattern using Vite's BASE_URL:
  <img src={`${import.meta.env.BASE_URL}motionify-studio-dark.png`} ... />
  ```
- **Check the Vite config** (`vite.config.ts`) for the `base` value whenever adding new static assets or image references.

## Related Issues

- See also: [magic-link-wrong-route-netlify-worktree-path-20260220.md](./magic-link-wrong-route-netlify-worktree-path-20260220.md) — related Vite base URL confusion affecting route construction
- See also: [vite-base-url-broken-image-paths-sidebar-20260221.md](./vite-base-url-broken-image-paths-sidebar-20260221.md) — same root cause, sidebar logo in Layout.tsx
