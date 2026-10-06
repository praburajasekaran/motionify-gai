# Motionify verification map

This is the maintained map of Motionify Studio's user-facing verification paths. Read the matching file before testing a feature. The starter map covers five areas; other portal administration/settings features remain outside this initial scope.

## Baseline preconditions

- Run from the repo root with locked dependencies and Playwright Chromium installed.
- Launch a unique `.scratch/verify-motionify/runs/` directory with `scripts/control.mjs` as described in the parent skill.
- Use the URL in `instance.json`, a fresh browser context, and the run's own built output.
- Require a passing `doctor` before each drive. Relaunch after source changes.
- Baseline cases have no authenticated user, database fixture, or backend success mock. They abort API and external network requests and record the decisions.
- Full-stack cases require a disposable database, controlled inbox, real magic-link auth, role/membership fixtures, and sandbox external services. Their ports alone do not isolate their data.

## Driving conventions

- Use Playwright roles, labels, placeholders, and route paths. Prefer exact names where possible; scope duplicate header/footer controls to their landmark.
- Start each case from its stated preconditions. Pair user actions with assertions and before/after evidence.
- `control.mjs drive` provides `quiz`, `work`, and `portal-entry` baseline recipes. Full-stack snippets use Playwright's `page`, `context`, and `expect` in a focused spec against the owned dev URL.
- File-specific URLs and IDs in full-stack recipes come from the disposable app's visible fixture records or captured sandbox emails. Do not substitute production links or invented data.
- Restore only test state created by the run. Never remove evidence during cleanup.

## Proof and skip reporting

- Save artifacts under the run's `evidence/` directory with feature ID and entry point.
- Browser proof needs the action trace, screenshot, ARIA snapshot, and network observations; mutation proof also needs a read-only confirmation of stored state.
- Report every requested entry point as passed, failed, skipped, or blocked with its unmet precondition. A convenient direct URL does not verify a menu or email entry point.
- Starter automation coverage: `work` tests desktop header, footer, mobile menu, lazy player insertion, and mobile width; `quiz` tests the hero entry, selected-answer Back behavior, recommendation, validation, and reset; `portal-entry` tests the desktop login popup, signed-out protected redirect, and legacy login alias.
- Not yet proven by starter automation: footer/direct quiz entries, live inquiry submission/tracking, magic-link delivery, authenticated projects, proposal mutations, or payment processing.

## Features

- [Public discovery](public-discovery.md): Work entry points, lazy video loading, mobile navigation, and contact links.
- [Video quiz and inquiry](video-quiz.md): quiz entry points, recommendations, Back/reset, contact validation, submission, and tracking.
- [Portal authentication](portal-authentication.md): login popup, protected redirects, real magic links, and logout.
- [Project workspace](project-workspace.md): project search/view modes, tabs, and deliverable review entry points.
- [Proposal and payment handoff](proposal-payment.md): proposal review links, change requests, decline, advance payment, and project access.
