---
phase: "02-core-comment-experience"
plan: "01"
subsystem: "comments"
tags: ["comments", "api", "edit", "netlify-functions", "react"]
tech-stack:
  added: []
  patterns: ["REST API", "Component state management", "Inline editing"]
---

# Phase 2 Plan 1: Comment Editing Summary

**One-liner:** PUT endpoint with ownership validation and inline edit UI in both admin and client portals.

## Objective

Implement comment editing functionality: PUT API endpoint and edit UI in both portals.

**Purpose:** Users can correct typos or update content in their comments. Editing is restricted to the author's own comments and disabled after replies to maintain conversation clarity.

**Output:** Working edit feature with PUT endpoint and inline edit UI.

## Dependency Graph

| Direction | Relationship |
|-----------|-------------|
| **requires** | Phase 1 foundation (comments table, GET/POST endpoints) |
| **provides** | Comment editing capability for Phase 2 |
| **affects** | Real-time updates, @mentions (later in Phase 2) |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Inline edit mode with textarea | Familiar UX pattern, keeps context visible |
| Save/Cancel buttons with validation | Prevents empty or unchanged saves |
| Edit button only on own comments | Ownership enforcement at UI level |
| "edited" badge already exists | Reused existing showEditedBadge logic |

## Key Files

### Created
- None (modified existing files)

### Modified

| File | Change |
|------|--------|
| `netlify/functions/comments.ts` | Added PUT handler with auth and ownership check |
| `components/proposals/CommentItem.tsx` | Added edit mode state, textarea, save/cancel |
| `landing-page-new/src/components/CommentItem.tsx` | Added edit mode state, textarea, save/cancel |

## Verification Results

| Check | Status |
|-------|--------|
| PUT /comments/{id} returns 200 with updated comment | ✅ |
| Edit button appears only on user's own comments | ✅ |
| Editing a comment updates and shows "edited" badge | ✅ |
| No edit button on other users' comments | ✅ |
| Admin portal builds | ✅ |
| Client portal builds | ✅ |

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
| **Lines Added** | ~241 |

## Commits

- `7b4fbd4`: feat(02-01): add PUT endpoint for comment editing
- `cb048d2`: feat(02-01): add edit UI to admin CommentItem
- `b735e2b`: feat(02-01): add edit UI to client CommentItem

---

**Completed:** 2026-01-20
