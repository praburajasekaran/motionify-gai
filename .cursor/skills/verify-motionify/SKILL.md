---
name: verify-motionify
description: "Drive Motionify Studio's React web UI with Playwright to prove public portfolio, video quiz, and portal-entry behavior; consult its feature map for authenticated project and proposal/payment verification. Use after user-facing changes or when browser evidence is needed."
---

# Verify Motionify Studio

Motionify's primary surface is the root React 19/Vite web app: marketing pages, a five-question video quiz, public proposal/payment links, and the project portal under `/portal`. Its secondary surface is the Netlify Functions API backed by PostgreSQL, Resend, Cloudflare R2, and Razorpay. There is no second landing-page runtime.

Read [features/README.md](features/README.md) first. It is the maintained verification map. Select the relevant feature and entry points before driving; a pass through one route does not cover other mapped entry points.

## Launch

Run from the repository root. Node 22, npm, `rtk`, and the repository's locked dependencies are required:

```sh
rtk npm ci --no-audit --no-fund
rtk npx --no-install playwright install chromium
VERIFY_RUN=".scratch/verify-motionify/runs/$(rtk date +%Y%m%d-%H%M%S)-$$"
rtk node .cursor/skills/verify-motionify/scripts/control.mjs launch "$VERIFY_RUN"
```

Reuse an installed Chromium if present; do not download it again unnecessarily. If dependency installation fails, record the actual error and stop before driving. A previous Mac install can lack `@rollup/rollup-darwin-arm64`; use a clean install from the checked-in lockfile, never delete or rewrite that lockfile as a workaround.

The launch helper runs the documented `npm run build` with `--outDir <run>/runtime/dist --emptyOutDir`, then starts Vite's preview API, equivalent to `npm run preview -- --host 127.0.0.1 --port <allocated-port> --strictPort --outDir <run>/runtime/dist`. It sets `preview.proxy` to an empty map. Read the actual URL from the printed JSON or `<run>/instance.json`; do not assume 4173 or 5173. Readiness requires the owned process to serve the exact SHA-256 of this run's `index.html`. Build and server logs are retained in `<run>/evidence/`.

This executable baseline needs no `.env`, account, seed data, or backend server. It covers public browsing, quiz recommendation/form validation, and signed-out portal navigation. API and external requests are aborted by the browser harness and logged, with no fabricated success responses. YouTube player insertion is observable; playback and chat delivery are outside this baseline.

Each run has its own built output, port, and fresh Playwright browser contexts. Two baseline runs can coexist. Never reuse an unknown server, the user's browser profile, or another run directory. Strict port binding prevents attaching to an occupied port.

For database-backed feature recipes, use the full local stack described in `START_SERVERS.md`: `rtk npm run dev:all` starts Vite on 5173 and Functions on 8888. Inspect port ownership before starting it; this command is shared unless you explicitly isolate it. For separate ports, use `rtk npx --no-install netlify functions:serve -p 18888` and `VITE_NETLIFY_FUNCTIONS_ORIGIN=http://127.0.0.1:18888 rtk npm run dev -- --host 127.0.0.1 --port 15173 --strictPort` in separate owned exec/PTY sessions. Record both session IDs and stop those sessions with Ctrl-C in cleanup. Do not double-drive shared database accounts, inquiry tokens, or payment records merely because the ports differ.

Full-stack prerequisites are an explicitly disposable PostgreSQL database with the repo migrations, `DATABASE_URL`, `JWT_SECRET`, a controlled email inbox and Resend configuration, and feature-specific test R2/Razorpay configuration. There is no verified automatic seed or backend isolation helper here. If these cannot be established, report the affected cases as blocked; keep running independent baseline cases. The shipped `drive` command deliberately operates only on its own baseline instance.

## Doctor

```sh
rtk node .cursor/skills/verify-motionify/scripts/control.mjs doctor "$VERIFY_RUN"
```

This checks the recorded PID's command and run directory, repository HEAD, tracked app/public-file and production-env fingerprints, HTTP readiness, and the served build hash without changing app state. It prints `status: ready` and writes the diagnostic to `<run>/evidence/doctor.json`. Run it before driving and whenever a route, screenshot, or server response looks wrong. A failure means relaunch in a new run directory; do not silently switch to an existing server. Relaunch after source edits to avoid proving an older build.

For a full-stack run, supplement the frontend check with `rtk curl --fail-with-body http://127.0.0.1:18888/.netlify/functions/health`. Require `checks.database.status: pass`, `checks.environment.status: pass`, and configured services needed by the selected feature. Check `auth-me` through the browser after a real magic-link login; do not manufacture cookies or localStorage users. Health alone does not prove authentication or sandbox credentials.

## Drive

Run one or more shipped recipes; each invocation gets its own browser context and evidence folder:

```sh
rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" quiz
rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" work
rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" portal-entry
```

The helper uses the repo's `@playwright/test`, Chromium, and a dedicated config with one worker, no retries, no `reuseExistingServer`, and traces always enabled. It never runs the whole legacy `e2e/` suite. Current selectors include `#video-style-quiz`, the `Find Your Video Style` link, `Get Started`, quiz answer buttons, `Start This Project`, `Send Me a Proposal`, `Open menu`, and the login `Email address` label. Exact commands and unautomated paths are in the feature files.

For additional mapped cases, adapt `scripts/smoke.spec.mjs` or write a focused Playwright spec. Use user controls and browser navigation; do not call React setters, inject auth users, synthesize proposal `?data=` payloads, or fulfill internal API success responses to claim end-to-end verification. Existing `e2e/helpers/auth.ts` is useful for isolated UI tests but bypasses login and the backend. Several older `portal-smoke`, `admin-functional`, and `proposal-acceptance` tests click obsolete demo role buttons; they are not current proof recipes.

## Evidence

All proof survives at `.scratch/verify-motionify/runs/<run-id>/evidence/` (ignored by Git). Keep `instance.json` alongside it for provenance. Each baseline feature contains:

- `results.json`, `playwright.log`, and `report/index.html` with pass/fail results.
- `test-results/` with `trace.zip`, before/after screenshots, ARIA snapshots, `actions.json`, `network.json`, `page-errors.json`, and the final test screenshot.
- Run-level `build.log`, `server.log`, `source-status.txt`, `doctor.json`, and `cleanup.json`.

Open the local report with `rtk npx --no-install playwright show-report "$VERIFY_RUN/evidence/quiz/report"`; save its exec session ID and stop that report server after viewing. Inspect a trace with `rtk npx --no-install playwright show-trace` followed by the actual trace path listed by `rtk proxy find "$VERIFY_RUN/evidence" -name trace.zip`.

Proof standards:

- Capture the real entry point, action, and resulting state. A final screen alone is insufficient.
- Verify persisted mutations from a second user-facing view or a read-only DB query, in addition to a toast or response. For inquiry submission, observe the record and controlled email; for payments, observe the stored payment and activated project; for file uploads, observe the stored object.
- Mock only at an existing external production boundary, identify that boundary, and scope the claim accordingly. Baseline request abortion proves local UI behavior only.
- Inspect the recorded network decisions and mutation requests. A label such as test mode or dry-run is not evidence that no writes, emails, requests, or browser popups occurred. In the shipped quiz case, the incomplete contact form must show `Project details are required` and issue zero non-GET requests.
- Report feature IDs and entry points covered, skipped, or blocked. Never convert missing auth/data into a passing test or claim YouTube playback from iframe insertion. Keep tokens, cookies, credentials, and customer details out of shareable artifacts.

## Cleanup

```sh
rtk node .cursor/skills/verify-motionify/scripts/control.mjs cleanup "$VERIFY_RUN"
rtk proxy find "$VERIFY_RUN/evidence" -type f
```

Cleanup validates the recorded process command before sending SIGTERM to that PID, waits for it to stop, and removes only `<run>/runtime/`. It retains evidence, logs, ownership metadata, and the cleanup result. Never kill by process name or port. Launch/drive errors automatically attempt this same cleanup; run it again if anything failed, and inspect `cleanup.json`. A failed drive requires a new run ID so failed evidence is retained. Evidence must still exist after teardown before claiming completion.

For manually launched full-stack sessions, stop only the sessions you created and remove only their disposable test data and files. Retain their evidence. Never run `db:migrate:down`, truncate shared tables, or delete a shared R2 bucket as generic cleanup.

## Helpers

`scripts/control.mjs` is executable. Its invocations above are the supported interface: `launch RUN_DIR`, `doctor RUN_DIR`, `drive RUN_DIR work|quiz|portal-entry`, and `cleanup RUN_DIR`. `scripts/playwright.config.mjs` and `scripts/smoke.spec.mjs` are harness inputs imported by that interface.

After app routes, labels, or workflows change, use `/maintain-verification-skill` to update the feature map and rerun the affected recipe.
