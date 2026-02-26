---
title: "Production Page Load 7s+ — CDN Bloat, Monolithic Bundle, Blocking Auth"
category: performance-issues
module: Portal
tags: [bundle-size, code-splitting, vite, react-lazy, cdn, tailwind, auth, skeleton-ui]
severity: high
symptoms:
  - Every screen takes 7+ seconds to load in production
  - Full-screen spinner visible for extended period before any content
  - 1.8MB monolithic JavaScript bundle
  - Tailwind CDN JIT compiler loaded at runtime
  - Import map forcing CDN DNS lookups for already-bundled deps
date: 2026-02-26
---

# Production Page Load 7s+ — CDN Bloat, Monolithic Bundle, Blocking Auth

## Problem

Every page in the Motionify Studio portal took 7+ seconds to load in production. Users saw a spinner for an extended period before any content appeared. The performance target documented in `PRODUCTION_DEPLOYMENT.md` was < 3 seconds.

## Root Causes (6 identified)

### 1. Runtime CDN Dependencies (~1.5s wasted)

**Tailwind CDN JIT compiler** (`cdn.tailwindcss.com`) was loaded in `index.html` despite PostCSS already compiling Tailwind at build time via `postcss.config.js` + `tailwind.config.js`. This loaded ~60KB of JIT compiler that re-generated CSS in the browser — completely redundant.

**Import map** in `index.html` pointed React, recharts, lucide-react, @google/genai to `aistudiocdn.com`. Vite already bundles all of these — the import map forced the browser to parse an unused module map and caused CDN DNS lookups.

**Razorpay checkout script** loaded globally but only needed on `/payment/:proposalId` route.

### 2. Zero Code Splitting (~2.5s wasted)

The entire app was a single 1.8MB JS file. All 21 page components were statically imported in `App.tsx`, meaning the Dashboard route loaded all admin, client, and settings code.

### 3. Blocking Auth with Blank Spinner (~1s perceived)

`ProtectedRoute` showed a full-screen spinner until `/auth-me` resolved (up to 5s timeout). No sidebar, no header — users saw absolutely nothing.

### 4. Sequential Data Fetching Waterfalls (~0.5s)

- `ClientHomeRedirect` made a separate fetch to `/api/projects` just to decide redirect target
- `InquiryDashboard` called `getInquiryStats()` which internally re-fetched all inquiries

### 5. Eagerly Loaded Heavy Libraries (~0.5s)

- `import * as d3 from "d3"` pulled ~200KB for a single map component
- `@google/genai` loaded at module level (only used in one server-side service)
- React Query DevTools bundled in production

### 6. No Cache Headers for Hashed Assets

Vite produces content-hashed filenames but Netlify wasn't sending `immutable` cache headers.

## Solution

### Phase 1: Remove Runtime CDN Dependencies

**File: `index.html`**
- Deleted `<script src="https://cdn.tailwindcss.com"></script>`
- Deleted 80+ line inline `tailwind.config = {...}` block
- Deleted import map (7 CDN entries)
- Deleted global Razorpay script
- Added font preconnect hints

**File: `tailwind.config.js`**
- Added `pulse-soft` animation that was only in the deleted CDN inline config

**File: `pages/client/Payment.tsx`**
- Added dynamic Razorpay script loading via `useEffect` on mount

### Phase 2: Route-Level Code Splitting

**File: `App.tsx`**
```tsx
// Before: static imports
import { Dashboard } from './pages/Dashboard';

// After: lazy imports
const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then(m => ({ default: m.Dashboard }))
);
```

All 21 page components converted. Added `<React.Suspense>` boundary around `<Routes>`.

**File: `vite.config.ts`**
```ts
rollupOptions: {
  output: {
    manualChunks: {
      'vendor-react': ['react', 'react-dom', 'react-router-dom'],
      'vendor-query': ['@tanstack/react-query'],
    },
  },
},
```

### Phase 3: Skeleton UI During Auth

**File: `App.tsx` — `ProtectedRoute`**
```tsx
if (isLoading) {
  return (
    <Layout>
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </Layout>
  );
}
```

Auth timeout reduced from 5s to 3s in `contexts/AuthContext.tsx`.

### Phase 4: Parallel Data Fetching

**File: `netlify/functions/auth-me.ts`**
- Added `projectCount` for client users (parallel query with timezone)
- `ClientHomeRedirect` now uses `user.projectCount` — no extra fetch

**File: `pages/admin/InquiryDashboard.tsx`**
- Removed `getInquiryStats()` call (it re-fetched all inquiries)
- Stats computed locally from the already-fetched inquiry list

### Phase 5: Lazy-Load Heavy Libraries

**File: `components/GlobalStorytelling/useWorldMap.ts`**
```ts
// Before: import * as d3 from "d3" (~200KB)
// After:
import { select } from "d3-selection";
import { geoMercator, geoPath } from "d3-geo";
import { json } from "d3-fetch";
```

**File: `services/geminiService.ts`**
- Converted to dynamic `await import("@google/genai")` inside function

**File: `shared/providers/QueryProvider.tsx`**
- DevTools conditionally loaded only when `import.meta.env.DEV`

### Phase 6: Cache Headers

**File: `netlify.toml`**
```toml
[[headers]]
  for = "/portal/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Result

| Metric | Before | After |
|--------|--------|-------|
| Initial JS bundle | 1.8MB (1 file) | ~346KB (80 chunks) |
| Bundle reduction | — | 80% smaller initial load |
| CDN requests | 3 blocking | 0 |
| Auth loading UX | Blank spinner | Sidebar + skeleton |

## Prevention

1. **Never add CDN scripts for build-time dependencies** — if PostCSS/Vite handles it, the CDN version is pure waste
2. **Use `React.lazy()` for all page-level components** — static imports in App.tsx create monolithic bundles
3. **Import specific submodules** of large libraries (d3, lodash) — `import * as d3` pulls everything
4. **Show layout shell during auth loading** — skeleton UI beats blank spinners for perceived performance
5. **Include redirect-decision data in auth response** — avoid separate fetches just to decide navigation

## Key Files Changed

- `index.html` — removed CDN scripts, importmap, Razorpay; added preconnect
- `App.tsx` — React.lazy for 21 pages, Suspense, skeleton ProtectedRoute
- `vite.config.ts` — manualChunks, disabled sourcemaps
- `tailwind.config.js` — added pulse-soft animation
- `contexts/AuthContext.tsx` — 5s → 3s timeout
- `netlify/functions/auth-me.ts` — added projectCount
- `pages/admin/InquiryDashboard.tsx` — removed duplicate fetch
- `components/GlobalStorytelling/useWorldMap.ts` — D3 tree-shaking
- `services/geminiService.ts` — dynamic import
- `shared/providers/QueryProvider.tsx` — conditional devtools
- `netlify.toml` — cache headers
- `pages/client/Payment.tsx` — dynamic Razorpay loading
