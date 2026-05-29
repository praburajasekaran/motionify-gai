# Plan: Consolidate To A Single Vite App

> Created: 2026-05-29
> Status: draft
> Trigger: User chose option 1: make Vite the only app for landing page and portal.

## Goal & Success Criteria
- **Goal**: Make the root Vite app serve the Public Site at `/`, public proposal/payment handoff surfaces outside the Portal when authentication is not yet required, and the authenticated Portal under `/portal/*`, with Netlify Functions remaining as the backend runtime.
- **Done when**: Local development runs with one frontend runtime plus the Netlify Functions backend runtime, production publishes one Vite frontend build, existing `/portal/*`, proposal, payment, and auth links still resolve, and `landing-page-new` no longer owns runtime API or portal behavior.
- **Non-goals**: Redesigning the landing page, changing database schema, replacing Netlify functions, or rewriting working portal pages for style-only reasons.

## Current State
- The root app is a Vite React SPA on port `5173`, configured with `base: '/portal/'` and `<BrowserRouter basename="/portal">`.
- The landing app is a separate Next.js app in `landing-page-new/` on port `5174`.
- In local development, Next proxies `/portal/*` to Vite.
- In production, `npm run build:all` builds Vite, copies `dist/*` into `landing-page-new/public/portal`, then publishes the Next app.
- The repo already has duplicate landing components in the root app and Next app, plus known dual-portal/data-store issues documented in `.planning/todos/pending/2026-02-02-consolidate-landing-page-into-portal.md`.

## Task Breakdown

| # | Task | Files | Size | Depends On |
|---|------|-------|------|------------|
| 1 | Make the root Vite app route-ready for `/`, `/proposal/:proposalId`, `/payment/:proposalId`, `/verify-inquiry`, and `/portal/*` in local development | `vite.config.ts`, `App.tsx`, route/link call sites | M | - |
| 2 | Keep the root landing page as the Public Site `/` route and preserve Portal routes under `/portal/*` | `App.tsx`, `pages/LandingPage.tsx`, header/CTA links | S | T1 |
| 3 | Switch local scripts to one frontend runtime plus Netlify Functions | `package.json`, `netlify.toml`, docs as needed | S | T1 |
| 4 | Port remaining Next-owned runtime surfaces into Vite/Netlify functions | proposal pages, payment pages, auth verify, Next API routes | L | T1-T3 |
| 5 | Add tokenized Proposal Review Links, canonical link builders, and compatibility redirects for old public URLs | `netlify.toml`, affected email/link builders, proposal API/function code | M | T4 |
| 6 | Flip production publishing to the Vite build after route/API parity passes | `package.json`, `netlify.toml` | S | T4-T5 |
| 7 | Remove `landing-page-new` from runtime scripts/builds and mark it as temporary legacy reference after production parity verification | `package.json`, `landing-page-new/README.md`, docs/tests | M | T6 |
| 8 | Delete or archive the legacy Next reference after production has run cleanly | `landing-page-new/` | M | T7 |

## Slice A Scope

Slice A is the first implementation slice and should stay deliberately narrow:

- Vite serves the Public Site at `/`.
- Vite serves the Portal at `/portal/*`.
- Vite has route-ready pages for `/proposal/:proposalId`, `/payment/:proposalId`, and `/verify-inquiry`, using existing behavior or placeholders only where parity work is explicitly deferred.
- The Portal should keep its existing internal route assumptions during Slice A by using a `/portal` router boundary, not by mass-editing every internal `navigate('/projects')`, `to="/admin/..."`, or active-path check.
- Portal-only providers such as auth, notifications, and Portal session sync should live inside the `/portal` boundary so the Public Site remains unauthenticated and lightweight.
- Local generated links stop pointing to `localhost:5174`.
- Production publishing remains unchanged.
- `landing-page-new` remains in place and is not deleted.
- Proposal tokenization, payment-link hardening, and final link-security work are deferred to later slices, except where route structure must leave room for them.

## Technical Design
- **Approach**: Convert the root Vite app from a subpath-only SPA into the only browser app. Vite `base` becomes `/`. The Public Site uses root-level routes, while the Portal is rendered behind a `/portal` router boundary so existing internal Portal paths like `/projects` and `/admin/inquiries` keep working during the first slice. Portal-only providers stay inside that boundary. The existing root `pages/LandingPage.tsx` becomes `/`.
- **Backend**: Keep Netlify functions under `netlify/functions` as the single source of truth. Any Next API route still needed must be moved or mapped to an existing Netlify function before removing the Next runtime.
- **Compatibility**: Public links that clients may already have received, especially proposal/payment/auth links, need redirects or route aliases before removing Next.
- **Auth and verification links**: Portal login and user invitation links should use `/portal/login?token=...`; inquiry verification should use a distinct Public Site route such as `/verify-inquiry?token=...`. Existing `/auth/verify` links are transitional aliases only.
- **Production origin**: `https://motionify.studio/` is the canonical production origin. `www`, legacy portal subdomains, and old app-link environment variables should redirect or normalize to this origin.
- **Handoff pages**: Proposal review and advance payment pages are Public Site handoff surfaces until authentication is required. Post-payment project work and Project Payments belong in the Portal through the Project Access Link flow.
- **Proposal review security**: The first routing slice may preserve tokenless `/proposal/:proposalId` links for compatibility, but the final canonical Proposal Review Link must include an unguessable review token before `landing-page-new` is retired.
- **Build**: Production should not flip to the Vite publish path until route/API/link parity is verified. Once parity is reached, `npm run build` should be the deploy build and Netlify `publish` should be `dist`.

## Alternatives Rejected
- **Keep Next as the shell and embed Vite under `/portal`**: Preserves the current two-server split and keeps the dual-runtime problem.
- **Big-bang delete of `landing-page-new`**: Too risky because payment, proposal, and auth routes currently have Next-owned implementations and externally shared URLs.
- **Keep both apps but use one port through proxying**: Reduces local annoyance but does not remove duplicate code or data-flow divergence.

## Key Decisions
- Landing page lives at `/` in the Vite app.
- The Portal remains canonically under `/portal/*`; authenticated workspace routes should not move to top-level paths as part of this migration.
- Proposal review and advance payment remain public handoff surfaces when they are used before Client Access begins.
- Project Payments belong in the Portal unless a separate tokenized payment handoff link is deliberately introduced.
- Canonical Proposal Review Links must be tokenized; tokenless proposal URLs are transitional compatibility links only.
- `/auth/verify` is not canonical after consolidation; Portal login and inquiry verification have separate canonical routes.
- The canonical production origin is `https://motionify.studio/`; the Portal lives under `https://motionify.studio/portal/*`.
- Netlify functions remain the only backend surface.
- `landing-page-new` becomes temporary non-runtime legacy reference during the migration, then is deleted or archived in a follow-up cleanup after production runs cleanly.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing email/payment/proposal links break | M | H | Add route aliases and Netlify redirects before removing Next routes |
| Tokenizing Proposal Review Links invalidates active shared links | M | H | Keep a compatibility period for tokenless links or show a fresh-link request path |
| Static asset paths break after changing Vite `base` | M | M | Audit `/portal/` and `import.meta.env.BASE_URL` asset references during T1 |
| Auth redirects lose their intended `next` URL | M | H | Update login redirect construction alongside route prefix changes |
| Mixed production origins keep generating wrong links | H | H | Normalize link builders and environment variables around `https://motionify.studio/` |
| Next API behavior differs from Netlify functions | M | H | Inventory each Next API route and map it to an existing/new function before deletion |
| E2E tests assume `/portal` base or separate ports | H | M | Update Playwright base URLs and smoke tests in the same migration stage |

## Verification
- Run `npm run build`.
- Run focused smoke tests for `/`, `/proposal/:proposalId`, `/payment/:proposalId`, `/portal/login`, `/portal/projects`, `/portal/admin/inquiries`, and inquiry tracking.
- Run payment/proposal flow tests after moving remaining Next-owned surfaces.
- In local dev, confirm only one frontend runtime plus Netlify Functions are required: Public Site at `http://localhost:5173/`, Portal at `http://localhost:5173/portal/login`, API at `http://localhost:8888/.netlify/functions/*`.
- Rollback plan: keep `landing-page-new` untouched until Vite reaches route/API parity, so Netlify can be pointed back to the old Next publish path if needed.
