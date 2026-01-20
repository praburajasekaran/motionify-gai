---
phase: "02-core-comment-experience"
plan: "02"
subsystem: "comments"
tags: ["comments", "polling", "real-time", "netlify-functions", "react"]
tech-stack:
  added: []
  patterns: ["Polling", "Page Visibility API", "Efficient API filtering"]
---

# Phase 2 Plan 2: Real-time Polling Summary

**One-liner:** 10-second polling with since parameter for efficient comment updates in both admin and client portals.

## Objective

Implement real-time comment updates via polling and fix hardcoded API URL.

**Purpose:** Users see new comments from the other party within 10 seconds without manually refreshing. This provides a near real-time experience using simple polling (WebSockets/Ably deferred to v2).

**Output:** Automatic comment stream updates via polling in both portals.

## Dependency Graph

| Direction | Relationship |
|-----------|-------------|
| **requires** | Phase 2 Plan 1 (comment editing) |
| **provides** | Real-time comment updates for Phase 2 |
| **affects** | Phase 3 (attachments, notifications) |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 10-second polling interval | Balances freshness with server load |
| Page Visibility API for battery efficiency | Only poll when page is visible |
| since parameter for efficient polling | Reduces data transfer by fetching only new comments |
| Environment variable for API URL | Removes hardcoded localhost, allows per-environment configuration |

## Key Files

### Created
- None (modified existing files)

### Modified

| File | Change |
|------|--------|
| `netlify/functions/comments.ts` | Added `since` query parameter to GET endpoint |
| `lib/comments.ts` | Updated `getComments()` to accept optional `since` parameter |
| `components/proposals/CommentThread.tsx` | Added 10-second polling with visibility detection |
| `landing-page-new/src/components/CommentThread.tsx` | Added polling + fixed hardcoded localhost URL |

## Verification Results

| Check | Status |
|-------|--------|
| GET /comments?since={timestamp} returns only newer comments | ✅ |
| Admin portal polls every 10 seconds | ✅ |
| Client portal polls every 10 seconds | ✅ |
| Polling stops when page is not visible | ✅ |
| New comments merge without replacing existing state | ✅ |
| Hardcoded localhost URL replaced with env var | ✅ |

## Deviations from Plan

**None** - Plan executed exactly as written.

## Authentication Gates

**None** - No authentication gates encountered during execution.

## Metrics

| Metric | Value |
|--------|-------|
| **Duration** | ~2 minutes |
| **Tasks Completed** | 3/3 |
| **Commits** | 3 |
| **Lines Added** | ~165 |

## Commits

- `261a5d1`: feat(02-02): add polling to client CommentThread and fix hardcoded URL
- `9c5a50d`: feat(02-02): add polling to admin CommentThread
- `1d5cc83`: feat(02-02): add since parameter to GET endpoint for efficient polling

---

**Completed:** 2026-01-20
