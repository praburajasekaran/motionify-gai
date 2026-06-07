# Plan: Remove Retired Landing Page App

> Created: 2026-06-07
> Status: completed
> Trigger: User approved fully discarding the retired landing-page app now that portal and landing pages are unified in the root repo.

## Goal & Success Criteria
- **Goal**: Remove the retired landing-page app from the repository.
- **Done when**: The directory is gone, active config/docs no longer expect it to exist, and runtime-retirement verification still passes.
- **Non-goals**: Rewriting generated caches or unrelated worktree state.

## Current State
- The root Vite app owns public pages, proposal/payment/verification links, and `/portal/*`.
- The retired landing-page app was already documented as inactive with intentionally failing scripts.
- `scripts/verify-production-flip.mjs` still reads files inside the retired app path, so deletion requires verifier changes.

## Task Breakdown

| # | Task | Files | Size | Depends On |
|---|------|-------|------|------------|
| 1 | Remove the retired app directory | retired landing app path | S | - |
| 2 | Update production-flip verifier to assert absence | `scripts/verify-production-flip.mjs` | S | T1 |
| 3 | Remove obsolete TypeScript exclude | `tsconfig.json` | S | T1 |
| 4 | Remove docs and learning references to the retired path | tracked markdown/text docs | S | T1 |
| 5 | Verify cleanup | npm scripts/build | S | T2-T4 |

## Technical Design
- **Approach**: Delete the old app directory and move the verifier from "old app is safely inert" checks to "old app is absent" checks. Clean tracked markdown/text references so docs point at the current root Vite runtime.
- **Alternatives rejected**: Keeping a stub directory preserves clutter and keeps scripts/documents coupled to a dead runtime.
- **Key decisions**: Git history is now the source of truth for old implementation details.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A script still reads deleted files | M | M | Run `npm run verify:runtime-retirement` and search remaining non-historical references |
| Documentation points users to missing files | M | L | Remove tracked docs/learnings references to the deleted path |
| Mechanical rewrite creates awkward phrasing | M | L | Scan remaining matches and inspect representative diffs |

## Verification
- Run `npm run verify:runtime-retirement`.
- Run `npm run build`.
- Search tracked docs/text for the removed path and legacy runtime wording.
- Rollback plan: recover the old app from git history if an implementation detail is needed.
