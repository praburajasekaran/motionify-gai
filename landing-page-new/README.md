# Retired Legacy Reference

`landing-page-new` is no longer a Motionify Studio runtime.

The active browser runtime is the root Vite app:

- Public Site: `/`
- Proposal Review Links: `/proposal/:proposalId`
- Advance Payment Links: `/payment/:proposalId`
- Inquiry Verification Links: `/verify-inquiry`
- Authenticated Portal: `/portal/*`

Netlify Functions in `netlify/functions` are the only backend runtime.

This directory is retained only as non-runtime historical reference while the migration record remains useful. Its package scripts intentionally fail so it cannot be started, built, tested, or deployed as a product surface.

Use root commands instead:

```bash
npm run dev
npm run dev:all
npm run build
npm run verify:runtime-retirement
```
