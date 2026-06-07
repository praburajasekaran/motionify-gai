# Slice C Production Flip

Status: active deployment contract

Motionify Studio production now publishes the single Vite frontend runtime from `dist`. Netlify Functions remain the backend runtime from `netlify/functions`, the Public Site lives at `/`, public handoff surfaces live outside the Portal, and the authenticated Portal remains under `/portal/*`.

## Deploy Gates

Run these before pointing production at a deploy:

```bash
npm run verify:production-flip
npm run verify:runtime-retirement
npm run build
```

Recommended smoke coverage before publishing:

- `/`
- `/verify-inquiry?token=test`
- `/proposal/test-proposal?token=test`
- `/payment/test-proposal?token=test`
- `/portal/login`
- `/portal/projects`
- `/portal/admin/inquiries`
- `/api/health`
- `/.netlify/functions/health`

Direct-refresh coverage should include one Public Site route, one public handoff route, and one Portal route. Asset/header checks should confirm `/assets/*` gets immutable caching and `/assets/*.map` returns 404.

## Netlify Shape

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Next deploy plugin: not configured
- Former separate frontend: removed from the repository and not part of install, build, test, or publish workflows.

## Runtime Routes

- `/api/*` rewrites to `/.netlify/functions/:splat`.
- `/verify-inquiry`, `/proposal/*`, `/payment/*`, `/portal/*`, and all other SPA routes rewrite to `/index.html`.
- `portal.motionify.studio/*` redirects to `https://motionify.studio/*`.

## Rollback

The fastest rollback is to publish the previous known-good Netlify deploy from the Netlify Deploys tab.

Git rollback for runtime cleanup is isolated to this slice's cleanup files. If old frontend code is needed for investigation, recover it from version history rather than reintroducing another runtime.
