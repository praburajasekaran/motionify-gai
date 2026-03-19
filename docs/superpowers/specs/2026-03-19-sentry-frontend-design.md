# Sentry Frontend Integration Design

## Overview

Add `@sentry/react` to the React portal to capture client-side errors, component crashes, and web vitals. The backend already uses `@sentry/node` — this completes the observability story.

## 1. SDK Initialization

**New file: `lib/sentry.ts`**

- Initializes `@sentry/react` with `VITE_SENTRY_DSN` (Vite requires `VITE_` prefix for client env vars)
- Called from `index.tsx` before `ReactDOM.createRoot()`
- Environment detection via `import.meta.env.PROD`
- Trace sample rate: 10% production, 100% dev (matches backend)
- `beforeSend` scrubs JWT tokens and API keys from breadcrumbs (mirrors backend pattern)
- No-ops gracefully when `VITE_SENTRY_DSN` is not set

## 2. ErrorBoundary Integration

**Modified: `components/ErrorBoundary.tsx`**

- Refactor from custom class component to a wrapper around `Sentry.ErrorBoundary`
- Preserves existing fallback UI (error card with "Try Again" / "Go Home" buttons)
- Preserves existing `onReset` prop interface
- Sentry automatically captures component errors with full component stack traces
- No changes needed in `App.tsx` imports

## 3. User Context

**Modified: `App.tsx`**

- Add `useSentryUser` effect inside the app tree (within `AuthProvider`)
- On login: `Sentry.setUser({ id: userId, role })`
- On logout: `Sentry.setUser(null)`
- Mirrors backend `setUser`/`clearUser` pattern

## 4. Web Vitals

**No changes needed to `lib/vitals.ts`**

- Already dynamically imports `@sentry/react` for production web vitals reporting
- Will work automatically once `@sentry/react` is installed

## 5. Build Changes

**Modified: `vite.config.ts`**

- Change `sourcemap: false` to `sourcemap: 'hidden'` — generates sourcemaps for Sentry upload without exposing them to browsers
- Add `vendor-sentry` manual chunk for `@sentry/react`

## 6. Environment Config

**Modified: `.env.example`**

- Add `VITE_SENTRY_DSN` alongside existing `SENTRY_DSN` comment
- Both DSNs can point to the same Sentry project or separate ones (frontend vs backend)

## Files Changed

| File | Action |
|------|--------|
| `lib/sentry.ts` | Create — SDK init module |
| `index.tsx` | Modify — call `initSentry()` before render |
| `components/ErrorBoundary.tsx` | Modify — wrap with `Sentry.ErrorBoundary` |
| `App.tsx` | Modify — add user context sync |
| `vite.config.ts` | Modify — hidden sourcemaps + sentry chunk |
| `.env.example` | Modify — add `VITE_SENTRY_DSN` |
| `package.json` | Modify — add `@sentry/react` dependency |

## Out of Scope

- Sentry session replay (can add later, significant bundle cost)
- Sentry performance/tracing integration (can add later)
- Sentry sourcemap upload CI step (manual upload or Netlify plugin — separate task)
