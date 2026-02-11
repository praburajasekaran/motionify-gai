---
phase: 04-integration-and-polish
plan: "04"
subsystem: comments
completed: 2026-01-21
duration: "~5 min"
---

# Phase 4 Plan 4: Smart Auto-Scroll Summary

**Objective:** Implement smart auto-scroll that shows new comments when user near bottom while preserving scroll when reading middle.

**Status:** ✅ Complete

## Implementation Details

### Smart Auto-Scroll Logic

Added two helper functions to both CommentThread components:

1. **isNearBottom()** - Detects if user is within 100px of bottom of comment thread
2. **scrollToBottom()** - Smoothly scrolls to bottom with `behavior: 'smooth'`

### Behavior Changes

**pollForNewComments:**
- Before: Only preserved scroll position if user was actively reading
- After: Auto-scrolls to new comment if user was near bottom; preserves position if reading middle

**handleSubmit:**
- Before: No auto-scroll after posting own comment
- After: Always scrolls smoothly to show newly posted comment immediately

### Files Modified

| File | Portal | Changes |
|------|--------|---------|
| `components/proposals/CommentThread.tsx` | Admin (Vite SPA) | +73/-25 lines |
| `landing-page-new/src/components/CommentThread.tsx` | Client (Next.js) | +73/-25 lines |

### Verification

Both portals build successfully:
- Admin portal (Vite): ✅ 28.84s build time
- Client portal (Next.js): ✅ Build completed

## User Experience

| Scenario | Behavior |
|----------|----------|
| User near bottom, new comment arrives | Smooth auto-scroll to show new comment |
| User reading middle, new comment arrives | Scroll position preserved (no jump) |
| User posts own comment | Smooth auto-scroll to show own comment |

## Technical Notes

- **Threshold:** 100px from bottom = "near bottom"
- **Animation:** Uses `scrollTo({ behavior: 'smooth' })` for smooth transitions
- **Timing:** 50ms timeout after polling to allow DOM update before scrolling
- **Timing:** 100ms timeout after submit to ensure comment is rendered

## Deviation from Plan

None - plan executed exactly as written.
