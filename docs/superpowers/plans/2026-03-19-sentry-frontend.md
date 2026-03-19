# Sentry Frontend Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@sentry/react` to the React portal so client-side errors, component crashes, and web vitals are captured in Sentry.

**Architecture:** Initialize Sentry before React renders, wrap the existing ErrorBoundary with Sentry's ErrorBoundary for automatic error capture, and sync user identity from AuthContext. Hidden sourcemaps generated at build time; `.map` files blocked from public access via Netlify headers.

**Tech Stack:** `@sentry/react` ^10.37.0, Vite, React 19, react-router-dom v7

**Spec:** `docs/superpowers/specs/2026-03-19-sentry-frontend-design.md`

---

## File Structure

| File | Role |
|------|------|
| `lib/sentry.ts` | **Create** — Sentry SDK init, config, PII scrubbing |
| `index.tsx` | **Modify** — Call `initSentry()` before render |
| `components/ErrorBoundary.tsx` | **Modify** — Wrap with `Sentry.ErrorBoundary` |
| `components/SentryUserSync.tsx` | **Create** — Syncs auth user to Sentry context |
| `App.tsx` | **Modify** — Add `<SentryUserSync />` inside AuthProvider |
| `vite.config.ts` | **Modify** — Hidden sourcemaps + vendor-sentry chunk |
| `netlify.toml` | **Modify** — Block `.map` file access |
| `.env.example` | **Modify** — Add `VITE_SENTRY_DSN` |
| `package.json` | **Modify** — Add `@sentry/react` dependency |

---

### Task 1: Install `@sentry/react`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @sentry/react@^10.37.0
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@sentry/react'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @sentry/react dependency"
```

---

### Task 2: Create Sentry init module

**Files:**
- Create: `lib/sentry.ts`

- [ ] **Step 1: Create `lib/sentry.ts`**

```typescript
import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const isProduction = import.meta.env.PROD;

  Sentry.init({
    dsn,
    environment: isProduction ? 'production' : 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    sendDefaultPii: false,

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (isProduction && breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message
          .replace(/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_REDACTED]')
          .replace(/(?:api[_-]?key|apikey|secret)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, '[API_KEY_REDACTED]');
      }
      return breadcrumb;
    },
  });

  initialized = true;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/sentry.ts
git commit -m "feat: add Sentry frontend SDK init module"
```

---

### Task 3: Wire `initSentry()` into entry point

**Files:**
- Modify: `index.tsx:1-6` (add import at top)

- [ ] **Step 1: Add import and call to `index.tsx`**

Add `import { initSentry } from './lib/sentry';` after the existing imports (line 5), then call `initSentry();` before `ReactDOM.createRoot()` (before line 7).

The file should read:

```typescript
import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initWebVitals } from './lib/vitals';
import { initSentry } from './lib/sentry';

// Initialize Sentry before React renders
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Start measuring Core Web Vitals after app mount
initWebVitals();
```

- [ ] **Step 2: Verify the dev server starts**

```bash
npx vite build --mode development 2>&1 | tail -5
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add index.tsx
git commit -m "feat: initialize Sentry before React render"
```

---

### Task 4: Refactor ErrorBoundary to use Sentry

**Files:**
- Modify: `components/ErrorBoundary.tsx`

- [ ] **Step 1: Rewrite `components/ErrorBoundary.tsx`**

Replace the entire file with:

```typescript
import React, { ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

function ErrorFallback({
  error,
  resetError,
  onReset,
  fallback,
}: {
  error: unknown;
  resetError: () => void;
  onReset?: () => void;
  fallback?: ReactNode;
}) {
  if (fallback) {
    return <>{fallback}</>;
  }

  const handleReset = () => {
    onReset?.();
    resetError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Something went wrong
        </h1>

        <p className="text-muted-foreground text-center mb-6">
          We're sorry for the inconvenience. An unexpected error occurred.
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-6 p-4 bg-muted rounded border border-border">
            <summary className="cursor-pointer font-semibold text-sm text-foreground mb-2">
              Error Details (Development Only)
            </summary>
            <div className="text-xs text-muted-foreground font-mono overflow-auto">
              <p className="font-semibold mb-2">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-2 px-4 rounded transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback, onReset }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback
          error={error}
          resetError={resetError}
          onReset={onReset}
          fallback={fallback}
        />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

Key changes:
- Wraps `Sentry.ErrorBoundary` so errors are automatically reported
- `handleReset` calls `onReset()` first (QueryErrorResetBoundary), then `resetError()` (Sentry)
- Fixed `/#/` hash URL to `/` for BrowserRouter
- Uses `import.meta.env.DEV` instead of `process.env.NODE_ENV`
- Same Props interface — no changes needed in App.tsx

- [ ] **Step 2: Verify build**

```bash
npx vite build --mode development 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ErrorBoundary.tsx
git commit -m "feat: integrate ErrorBoundary with Sentry error reporting"
```

---

### Task 5: Add SentryUserSync component

**Files:**
- Create: `components/SentryUserSync.tsx`
- Modify: `App.tsx:8-9` (add import), `App.tsx:84` (add component)

- [ ] **Step 1: Create `components/SentryUserSync.tsx`**

```typescript
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useAuthContext } from '../contexts/AuthContext';

export function SentryUserSync() {
  const { user } = useAuthContext();

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: String(user.id), role: user.role });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
```

- [ ] **Step 2: Add to `App.tsx`**

Add import near the other component imports (around line 9):

```typescript
import { SentryUserSync } from './components/SentryUserSync';
```

Add `<SentryUserSync />` as the first child inside `<NotificationProvider>` (line 84 in current file, just before `<React.Suspense>`):

```tsx
<NotificationProvider>
  <SentryUserSync />
  <React.Suspense fallback={...}>
```

- [ ] **Step 3: Verify build**

```bash
npx vite build --mode development 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/SentryUserSync.tsx App.tsx
git commit -m "feat: sync authenticated user context to Sentry"
```

---

### Task 6: Build config — sourcemaps and chunking

**Files:**
- Modify: `vite.config.ts:41` (sourcemap), `vite.config.ts:44-49` (manualChunks)

- [ ] **Step 1: Update `vite.config.ts`**

Change `sourcemap: false` to `sourcemap: 'hidden'` (line 41).

Add `'vendor-sentry': ['@sentry/react']` to the `manualChunks` object (after the existing chunks, around line 49):

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-checkbox'],
  'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
  'vendor-charts': ['d3'],
  'vendor-sentry': ['@sentry/react'],
},
```

- [ ] **Step 2: Verify build produces sourcemaps**

```bash
npx vite build 2>&1 | tail -10
ls dist/assets/*.map 2>/dev/null | head -3 && echo "Sourcemaps generated" || echo "No sourcemaps found"
```

Expected: Build succeeds, `.map` files exist in `dist/assets/`.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build: enable hidden sourcemaps and add Sentry vendor chunk"
```

---

### Task 7: Block sourcemap access in Netlify

**Files:**
- Modify: `netlify.toml` (add headers block)

- [ ] **Step 1: Add headers rule to `netlify.toml`**

Append this block at the end of the file:

```toml
# Block sourcemap access — return 404 for .map files (sourcemaps for Sentry upload only)
[[redirects]]
  from = "/portal/assets/*.map"
  to = "/404"
  status = 404
  force = true
```

This redirect rule returns 404 for any `.map` file request, preventing public access. The `force = true` ensures it takes precedence over Netlify's default static file serving. Combined with `sourcemap: 'hidden'` (no `//# sourceMappingURL` comment), browsers will never request or access sourcemaps.

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "build: block public access to sourcemap files"
```

---

### Task 8: Update environment config

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Find the existing Sentry section (around line 57-61) and replace it with:

```
# -----------------------------------------------------------------------------
# Error Monitoring - Sentry (Recommended)
# -----------------------------------------------------------------------------
# Get DSN from https://sentry.io -> Project Settings -> Client Keys
# Strongly recommended for production to track errors and performance
#
# Backend (Netlify Functions) — used by @sentry/node
# SENTRY_DSN=https://xxxx@o123.ingest.sentry.io/456
#
# Frontend (React Portal) — used by @sentry/react
# Both can point to the same Sentry project or separate projects
# VITE_SENTRY_DSN=https://xxxx@o123.ingest.sentry.io/456
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add VITE_SENTRY_DSN to env example"
```

---

### Task 9: Smoke test

- [ ] **Step 1: Run full production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify the Sentry chunk exists**

```bash
ls dist/assets/vendor-sentry-*.js 2>/dev/null && echo "Sentry chunk found" || echo "Missing Sentry chunk"
```

Expected: `Sentry chunk found`

- [ ] **Step 3: Verify no SENTRY_DSN leaked into bundle**

```bash
grep -r "ingest.sentry.io" dist/ 2>/dev/null && echo "LEAK DETECTED" || echo "No DSN in bundle - OK"
```

Expected: `No DSN in bundle - OK` (DSN comes from env var at runtime, not baked in)

- [ ] **Step 4: Final commit (if any remaining changes)**

```bash
git status
```

If clean, no commit needed.
