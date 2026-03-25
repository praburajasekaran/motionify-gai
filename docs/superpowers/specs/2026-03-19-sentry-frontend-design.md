# Sentry Frontend Integration Design

## Overview

Add `@sentry/react` to the React portal to capture client-side errors, component crashes, and web vitals. The backend already uses `@sentry/node` v10 — this completes the observability story.

## 1. SDK Initialization

**New file: `lib/sentry.ts`**

- Initializes `@sentry/react` with `VITE_SENTRY_DSN` (Vite requires `VITE_` prefix for client env vars)
- Environment detection via `import.meta.env.PROD`
- Trace sample rate: 10% production, 100% dev (matches backend)
- `beforeSend` scrubs JWT tokens and API keys from breadcrumbs (mirrors backend pattern)
- No-ops gracefully when `VITE_SENTRY_DSN` is not set

**Initialization order in `index.tsx`:** `initSentry()` → `ReactDOM.createRoot().render()` → `initWebVitals()`. This ensures the SDK is ready before any React errors can fire, and web vitals reporters can use the initialized SDK.

## 2. ErrorBoundary Integration

**Modified: `components/ErrorBoundary.tsx`**

- Refactor from custom class component to a wrapper around `Sentry.ErrorBoundary`
- The fallback render prop receives `{ resetError }` from Sentry — the wrapper must call `props.onReset()` first (to reset `QueryErrorResetBoundary` state), then `resetError()` (to clear Sentry's boundary state), preserving the existing contract with `App.tsx`
- Preserves existing fallback UI (error card with "Try Again" / "Go Home" buttons)
- Fix stale hash-router URL: change `window.location.href = '/#/'` to `window.location.href = '/'` (app uses `BrowserRouter`, not `HashRouter`)
- No changes needed in `App.tsx` imports

## 3. User Context

**New component: `SentryUserSync` rendered as first child inside `AuthProvider` in `App.tsx`**

- Reads user from `useAuthContext()`
- On login: `Sentry.setUser({ id: userId, role })`
- On logout/no user: `Sentry.setUser(null)`
- Mirrors backend `setUser`/`clearUser` pattern

## 4. Web Vitals

**No changes needed to `lib/vitals.ts`**

- Already dynamically imports `@sentry/react` for production web vitals reporting
- Web vitals will reach Sentry only when `VITE_SENTRY_DSN` is configured and the SDK is initialized — installing the package alone is not sufficient

## 5. Build Changes

**Modified: `vite.config.ts`**

- Change `sourcemap: false` to `sourcemap: 'hidden'` — generates sourcemaps for Sentry upload without exposing them to browsers via `//# sourceMappingURL`
- Note: `.map` files will still be deployed to Netlify CDN and accessible by direct URL. Add a `_headers` rule to block `*.map` access (e.g., `/assets/*.map` returns 404)
- Add `vendor-sentry` manual chunk for `@sentry/react`

## 6. Environment Config

**Modified: `.env.example`**

- `SENTRY_DSN` (existing, commented out) — backend-only, used by `@sentry/node` in Netlify Functions
- `VITE_SENTRY_DSN` (new) — frontend-only, used by `@sentry/react` in the React portal
- Both can point to the same Sentry project or separate projects

## 7. Package Version

- Install `@sentry/react` v10.x to match backend `@sentry/node` v10.37.0
- Both packages must share the same major version to avoid protocol mismatches

## Files Changed

| File | Action |
|------|--------|
| `lib/sentry.ts` | Create — SDK init module |
| `index.tsx` | Modify — call `initSentry()` before render |
| `components/ErrorBoundary.tsx` | Modify — wrap with `Sentry.ErrorBoundary`, fix hash URL |
| `App.tsx` | Modify — add `SentryUserSync` component |
| `vite.config.ts` | Modify — hidden sourcemaps + sentry chunk |
| `netlify.toml` | Modify — add `_headers` rule to block `.map` files |
| `.env.example` | Modify — add `VITE_SENTRY_DSN` |
| `package.json` | Modify — add `@sentry/react` ^10.37.0 |

## Out of Scope

- Sentry session replay (can add later, significant bundle cost)
- Sentry performance/tracing integration (can add later)
- Sentry sourcemap upload CI step (manual upload or Netlify plugin — separate task)
