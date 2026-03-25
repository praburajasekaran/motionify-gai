---
status: resolved
trigger: "deliverables-tab-vs-dashboard-mismatch"
created: 2026-01-26T10:00:00Z
updated: 2026-01-26T10:12:00Z
---

## Current Focus

hypothesis: CONFIRMED - Dashboard uses hardcoded MOCK_PROJECTS.deliverables, tab uses API
test: Examined both code paths
expecting: N/A - root cause found
next_action: Fix Overview to use API data

## Symptoms

expected: Both the Deliverables tab and the dashboard "Active Deliverables" section should show the same deliverables for a project
actual: Deliverables tab shows 3 items (Test, Testing for Prod-04, Testing again - all "Beta Ready") while dashboard shows 3 different items (Main Launch Video 16:9, Social Teaser 9:16, Product Stills with various statuses)
errors: No errors visible - data just doesn't match
reproduction: Navigate to a project's Overview tab and compare "Active Deliverables" section with the Deliverables tab
started: Has always been like this - the two views never showed matching data

## Eliminated

## Evidence

- timestamp: 2026-01-26T10:02:00Z
  checked: pages/ProjectDetail.tsx lines 633-658
  found: Overview "Active Deliverables" uses `project.deliverables.slice(0, 3)` from MOCK_PROJECTS
  implication: Dashboard reads from hardcoded mock data

- timestamp: 2026-01-26T10:03:00Z
  checked: constants.ts lines 78-83
  found: MOCK_PROJECTS has hardcoded deliverables array with "Main Launch Video", "Social Teaser", "Product Stills"
  implication: This is the source of the mock data shown in Overview

- timestamp: 2026-01-26T10:04:00Z
  checked: components/deliverables/DeliverableContext.tsx lines 384-434
  found: DeliverablesTab fetches from `/api/deliverables?projectId=${currentProject.id}`
  implication: Tab shows real database data while Overview shows mock data

## Resolution

root_cause: ProjectDetail.tsx Overview tab uses hardcoded `project.deliverables` from MOCK_PROJECTS constant (lines 634, 713, 719) while DeliverablesTab fetches real data from /api/deliverables API endpoint via DeliverableContext
fix: Added `deliverables` state and `deliverablesLoading` to ProjectDetail.tsx that fetches from /api/deliverables. Replaced all `project.deliverables` references in Overview tab with the new state.
verification: Build succeeds (npm run build completed). All `project.deliverables` references removed from Overview tab. Both Active Deliverables and Upcoming Deadlines now use API data via `deliverables` state.
files_changed:
  - pages/ProjectDetail.tsx: Added deliverables state, API fetch effect, updated Active Deliverables and Upcoming Deadlines sections to use real data
