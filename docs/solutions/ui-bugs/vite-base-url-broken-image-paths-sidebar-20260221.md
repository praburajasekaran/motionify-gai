---
module: Portal
date: 2026-02-21
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Sidebar logo shows broken image icon in portal at localhost:5173/portal/"
  - "Browser 404 for /motionify-dark-logo.png and /motionify-studio-dark.png"
root_cause: config_error
resolution_type: code_fix
severity: medium
tags: [vite, base-url, static-assets, sidebar, image-path, portal]
---

# Troubleshooting: Sidebar Logo Broken Due to Vite Base URL (Second Occurrence)

## Problem

The Motionify logo in the portal sidebar rendered as a broken image because `<img src>` paths used root-relative paths (`/motionify-dark-logo.png`) that don't account for Vite's `base: '/portal/'` config. This is a second occurrence of the same root cause as the login page logo fix — this time in `components/Layout.tsx`.

## Environment

- Module: Portal
- Affected Component: `components/Layout.tsx` (Vite React portal app)
- Vite config: `base: '/portal/'` in `vite.config.ts`
- Date: 2026-02-21

## Symptoms

- Sidebar shows broken image icon where Motionify logo should appear
- Browser network tab shows 404 for `/motionify-dark-logo.png` and `/motionify-studio-dark.png`
- Logo files exist in `public/` — the problem is path prefix, not missing files

## What Didn't Work

**Direct solution:** Root cause identified immediately from prior login page fix documentation.

## Solution

Update the `<img src>` in `components/Layout.tsx` to use `import.meta.env.BASE_URL` as prefix:

```tsx
// Before (broken — missing Vite base prefix):
<img
  src={mounted && resolvedTheme === 'dark' ? '/motionify-dark-logo.png' : '/motionify-studio-dark.png'}
  alt="Motionify Studio"
  className="h-10 w-auto object-contain"
/>

// After (correct — uses Vite BASE_URL):
<img
  src={mounted && resolvedTheme === 'dark'
    ? `${import.meta.env.BASE_URL}motionify-dark-logo.png`
    : `${import.meta.env.BASE_URL}motionify-studio-dark.png`}
  alt="Motionify Studio"
  className="h-10 w-auto object-contain"
/>
```

## Why This Works

When Vite is configured with `base: '/portal/'`, static files in `public/` are served at `/portal/[filename]`. Root-relative paths like `/motionify-dark-logo.png` bypass the base prefix, resulting in a 404. `import.meta.env.BASE_URL` resolves to `/portal/` at runtime (from Vite config), so `${import.meta.env.BASE_URL}motionify-dark-logo.png` correctly produces `/portal/motionify-dark-logo.png`.

## Prevention

- **All `<img src>`, `<link href>`, and similar static asset references** in the portal app must use `import.meta.env.BASE_URL` as prefix, or hardcode `/portal/`:
  ```tsx
  // Safe pattern:
  <img src={`${import.meta.env.BASE_URL}logo.png`} />
  ```
- **Check `vite.config.ts`** for the `base` value whenever adding new static asset references.
- **Pattern to search** when adding images: grep for `src="/"` — any root-relative image src is likely broken.

## Related Issues

- See also: [vite-base-url-broken-image-paths-login-20260220.md](./vite-base-url-broken-image-paths-login-20260220.md) — same root cause, login page logo
