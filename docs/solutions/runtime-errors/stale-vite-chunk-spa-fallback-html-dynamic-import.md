---
title: Stale Vite chunks served as SPA HTML
date: 2026-06-07
category: runtime-errors
module: Frontend deployment
problem_type: runtime_error
component: tooling
symptoms:
  - "React ErrorBoundary reported Failed to fetch dynamically imported module for ProjectAccess-*.js"
  - "A missing /assets/*.js chunk returned text/html instead of JavaScript"
  - "A stale entry bundle kept requesting a lazy route chunk from a previous deploy"
root_cause: config_error
resolution_type: config_change
severity: high
tags:
  - vite
  - netlify
  - dynamic-import
  - stale-chunk
  - spa-routing
  - cache-headers
related_components:
  - react
  - vite
  - netlify
---

# Stale Vite chunks served as SPA HTML

## Problem

Production users hit a React error boundary when opening the Project Access route because the browser tried to dynamically import an old Vite chunk that no longer existed:

```text
TypeError: Failed to fetch dynamically imported module: https://motionify.studio/assets/ProjectAccess-Cf3xEgF_.js
```

The current production HTML referenced a newer `ProjectAccess-wq8V6F3g.js` chunk, so the failing request came from a stale cached entry bundle.

## Symptoms

- `index-DYo5Te1S.js` requested `ProjectAccess-Cf3xEgF_.js`, but the live deploy referenced a different content-hashed chunk.
- `curl -I https://motionify.studio/assets/ProjectAccess-Cf3xEgF_.js` returned `200` with `content-type: text/html`, not JavaScript.
- The stale `/assets/*.js` response also carried immutable asset cache headers, so the bad HTML fallback could be cached like a real Vite asset.
- React surfaced the failure through the app error boundary at the lazy route `Suspense` boundary.

## What Didn't Work

### Treating ProjectAccess as the broken component

The component was not the root cause. The route was lazy-loaded, and the error happened before the component module could execute.

### Adding a broad asset redirect

A broad Netlify redirect such as `/assets/* -> /404` can intercept valid built assets too. The durable fix is to remove the global SPA fallback that rewrites missing assets, not to add a competing blanket redirect.

### Relying on local Netlify serve from a nested worktree

Netlify CLI behavior around worktrees can be misleading. Prior debugging in this repo found that the CLI may resolve paths from the repository root or cached build state instead of the nested worktree under test. For this issue, production `curl` evidence was more reliable than local `netlify serve` behavior.

## Solution

Install a guarded Vite preload-error handler in the app entrypoint so stale chunk failures reload the page once and pick up the current entry bundle:

```tsx
const STALE_CHUNK_RELOAD_KEY = 'motionify:stale-chunk-reload-at';
const STALE_CHUNK_RELOAD_WINDOW_MS = 30_000;

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const lastReloadAt = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_WINDOW_MS) {
    return;
  }

  sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});
```

Then remove the global SPA catch-all from both Netlify configuration sources and replace it with explicit SPA route fallbacks:

```text
/portal  /index.html  200
/portal/*  /index.html  200
/project-access  /index.html  200
/proposal/*  /index.html  200
/payment/*  /index.html  200
```

Keep `public/_redirects` and `netlify.toml` in sync. Vite copies `public/_redirects` into `dist/_redirects`, so leaving a global `/* /index.html 200` there can reintroduce the production behavior even if `netlify.toml` looks correct.

Add a verification script that fails the build check when any redirect source contains a global `/* -> /index.html` SPA fallback, and verifies the known SPA routes are still covered:

```bash
npm run verify:spa-redirects
```

## Why This Works

Vite emits `vite:preloadError` when a dynamic import for a preloaded or lazy chunk fails. A one-shot reload is the right recovery for the common deploy race: the browser has an old entry bundle, but the server now has the new chunk graph. The session-storage guard prevents an infinite reload loop when the deploy is genuinely broken.

Explicit SPA fallbacks preserve deep-link support for real app routes while letting missing static assets return a real missing-asset response. A stale chunk URL should not be rewritten to `index.html`, and it should not receive immutable JavaScript asset cache treatment as HTML.

## Prevention

- Do not use a global Netlify SPA fallback in this Vite app unless static asset paths are excluded first.
- Update `public/_redirects` and `netlify.toml` together when adding top-level SPA routes.
- Run `npm run verify:spa-redirects` after changing redirects or adding routes.
- When a dynamic import fails in production, compare the failing chunk URL against the current production `index.html` and curl the failing asset. A missing chunk returning `text/html` points to a fallback-routing problem, not a component bug.
- Keep Vite's content-hashed assets immutable, but make sure only real existing assets can receive those headers.

## Related Documentation

- [Production Page Load 7s+ - CDN Bloat, Monolithic Bundle, Blocking Auth](../performance-issues/production-page-load-7s-bundle-splitting-Portal-20260226.md) documents the route-level code splitting and immutable Vite asset caching that made stale lazy chunks possible.
- [Troubleshooting: Logout Redirect Shows Vite Base URL Error Page](./logout-redirect-vite-base-url-window-location-authentication-20260221.md) covers another Vite/React Router route-handling failure mode.
- [Troubleshooting: Magic Link URL Points to Non-Existent Route](../integration-issues/magic-link-wrong-route-netlify-worktree-path-20260220.md) captures the Netlify CLI worktree caveat that can make local routing checks misleading.
- Session history from 2026-06-07 showed a related production pattern where `/api/projects` returned the SPA HTML shell instead of the expected function JSON. That was a different endpoint bug, but the same diagnostic signal applied: a browser request receiving `text/html` where code expected a non-HTML resource.
- PR: [#96 fix(deploy): recover from stale lazy chunks](https://github.com/praburajasekaran/motionify-gai/pull/96)
