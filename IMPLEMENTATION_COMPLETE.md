# Implementation Status

The previous dual-runtime implementation guide is obsolete.

Current production architecture:

- Root Vite app is the only active browser runtime.
- Public Site lives at `/`.
- Public Proposal Review and Advance Payment handoff routes live outside the Portal.
- Authenticated Portal routes live under `/portal/*`.
- Netlify Functions are the only backend runtime.
- The former separate frontend has been removed; recover old implementation details from git history if needed.

Use these checks before deploy:

```bash
npm run verify:production-flip
npm run verify:runtime-retirement
npm run build
```
