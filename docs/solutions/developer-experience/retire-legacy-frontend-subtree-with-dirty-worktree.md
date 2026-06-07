---
title: "Retire a Legacy Frontend Subtree with a Dirty Worktree"
date: 2026-06-07
category: developer-experience
module: "Repository consolidation"
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "A retired app directory remains after the active runtime has moved elsewhere"
  - "The repository has unrelated local changes that must survive cleanup, rebase, and merge"
  - "Docs, validation scripts, and deployment notes still mention old runtime paths"
tags:
  - legacy-cleanup
  - vite-runtime
  - documentation
  - git-workflow
  - rebase
---

# Retire a Legacy Frontend Subtree with a Dirty Worktree

## Context

After the portal and landing pages were consolidated into the root Vite app, the old separate frontend subtree was no longer part of the production runtime. Removing that subtree was not only a file deletion: active docs, historical learnings, deployment notes, TypeScript config, and runtime-retirement checks still referred to the old path.

The cleanup also happened in a dirty worktree with unrelated user changes. That made the main risk accidentally committing or reverting work outside the retirement task while rebasing onto the latest `main`.

## Guidance

Treat a legacy app retirement as a coordinated repository cleanup:

1. Remove the retired app source and any tracked nested copies.
2. Search docs and learning notes for exact old-path references, then update active guidance to point at the current runtime or git history instead of the deleted directory.
3. Update guard scripts so they assert the retired path is absent, rather than reading files inside the deleted app.
4. Remove build or compiler exclusions that only existed for the deleted subtree.
5. Stage only the cleanup hunks. If a touched file also has unrelated edits, stage the intended hunks interactively and leave the rest alone.
6. Before rebasing, stash unrelated tracked and untracked work separately when those files could conflict.
7. During rebase conflicts where `main` modified files inside the retired app, resolve by keeping the deletion only after confirming the subtree is intentionally gone.
8. Re-run the retirement verifier and production build after the rebase, because generated or untracked files can recreate the old path and invalidate the guard.

The runtime guard should check for absence without hard-coding a live dependency on the deleted directory. For example, construct the retired path name inside the verifier and fail if that directory reappears:

```js
const removedLandingDir = ['landing-page', 'new'].join('-');

assertAbsent(removedLandingDir, 'Retired landing app source should not exist');
```

## Why This Matters

Deleting the directory alone leaves stale instructions behind. Future agents or developers may revive the old path, run dead scripts, or treat archived security findings as active runtime issues. Updating the documentation and verifier at the same time makes the new architecture explicit: the root Vite app is the active frontend runtime, and old app code is recoverable only from git history.

The dirty-worktree handling matters just as much. Cleanup branches often touch docs and shared config, which are also common places for unrelated local edits. Separating those changes before rebase prevents the retirement commit from silently absorbing or discarding someone else's work.

## When to Apply

- A formerly independent app has been superseded by a consolidated runtime.
- A security, deployment, or build audit still references a retired path.
- A cleanup branch must be rebased while local unrelated edits are present.
- A verifier previously proved an app was non-runtime but the desired final state is full removal.

## Examples

In this cleanup, the retired app was removed from the repository and from a tracked nested worktree copy. Documentation was updated to describe the root Vite/Netlify runtime as the source of truth, while old source references were rewritten as historical context or removed when they were no longer useful.

The verification flow was:

```bash
npm run verify:runtime-retirement
npm run build
```

After rebasing onto `origin/main`, the runtime-retirement verifier initially failed because an untracked file recreated the deleted directory path. Removing the recreated directory and rerunning both commands confirmed the retirement remained valid after the rebase.

## Related

- `docs/adr/0002-single-vite-frontend-runtime.md`
- `docs/production-flip.md`
- `docs/netlify-deployment.md`
- `docs/plans/2026-06-07-remove-retired-landing-app.md`
