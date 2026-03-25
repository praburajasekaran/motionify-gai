---
phase: PROD-12
plan: 01
subsystem: testing
tags: [artillery, load-testing, playwright, performance]
dependency-graph:
  requires: []
  provides: ["load-test-infrastructure", "api-load-tests", "frontend-load-tests"]
  affects: ["PROD-12-02", "PROD-12-03", "PROD-12-04", "PROD-12-05"]
tech-stack:
  added: ["artillery@2.0.28", "artillery-engine-playwright@1.25.0"]
  patterns: ["load-testing", "browser-based-performance-testing", "custom-artillery-processors"]
key-files:
  created:
    - load-tests/api-load.yml
    - load-tests/scenarios/auth-processor.js
    - load-tests/frontend-load.yml
    - load-tests/scenarios/proposal-flow.js
  modified:
    - package.json
decisions:
  - id: "PROD-12-01-D1"
    decision: "Three-phase API load ramp: warm-up (5 req/s), ramp-up (5-20 req/s), sustained (20 req/s)"
    rationale: "Gradual ramp prevents overwhelming the system and reveals performance degradation thresholds"
  - id: "PROD-12-01-D2"
    decision: "Lighter frontend load test (arrivalRate 5) vs heavier API test (up to 20 req/s)"
    rationale: "Playwright browser instances are resource-heavy; 5 concurrent browsers is substantial load"
  - id: "PROD-12-01-D3"
    decision: "Cookie-based auth processor using magic link flow"
    rationale: "Matches production auth pattern (httpOnly cookies) for realistic load testing"
metrics:
  duration: "2 minutes 16 seconds"
  completed: "2026-01-29"
---

# Phase PROD-12 Plan 01: Artillery Load Testing Infrastructure Summary

**Artillery load testing with API (3-phase ramp to 20 req/s) and Playwright browser scenarios measuring LCP**

## What Was Built

### Task 1: Artillery Installation and API Load Tests
- Installed `artillery` v2.0.28 and `artillery-engine-playwright` as dev dependencies
- Created `load-tests/api-load.yml` targeting `http://localhost:8888/.netlify/functions`
- Three load phases: warm-up (60s at 5 req/s), ramp-up (120s from 5 to 20 req/s), sustained (300s at 20 req/s)
- Two weighted scenarios: "Proposal CRUD" (60%) creates and reads proposals, "Read-heavy workload" (40%) lists proposals
- Performance thresholds: p99 < 3000ms, error rate < 1%
- Created `auth-processor.js` that authenticates virtual users via magic link flow, storing auth cookie
- Added npm scripts: `test:load:api`, `test:load:frontend`, `test:load`

### Task 2: Frontend Browser-Based Load Tests
- Created `load-tests/frontend-load.yml` using Playwright engine with `aggregateByName`
- Single phase: 120s at arrivalRate 5 (lighter than API due to browser weight)
- Created `proposal-flow.js` Playwright scenario that:
  - Navigates to admin proposals page
  - Measures Largest Contentful Paint (LCP) via Performance API
  - Navigates to proposal detail if available
  - Emits custom counters: `proposals.viewed`, `proposal.detail.viewed`
  - Emits histograms: `proposals.lcp`, `proposal.detail.lcp`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| `npx artillery --version` returns 2.x | Passed (v2.0.28) |
| `api-load.yml` has 3 phases and 2 scenarios | Passed |
| `frontend-load.yml` has playwright engine | Passed |
| `package.json` has load test scripts | Passed |
| All 4 load test files created | Passed |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 000b4b8 | Install Artillery, create API load test config and auth processor |
| 2 | 57ffbef | Create frontend Playwright load test scenario |

## Next Phase Readiness

Load testing infrastructure is ready. To execute tests:
- **API tests:** `npm run test:load:api` (requires Netlify functions running on port 8888)
- **Frontend tests:** `npm run test:load:frontend` (requires app running, Playwright browsers installed)
- Tests target localhost by default; update `target` in YAML files for staging/production
