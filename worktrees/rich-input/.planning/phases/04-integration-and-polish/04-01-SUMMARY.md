---
phase: 04-integration-and-polish
plan: 01
subsystem: ui
tags: [react, typescript, component-wiring, attachment-flow]

# Dependency graph
requires:
  - phase: 03-attachments-and-notifications
    provides: CommentInput/CommentThread components with attachment UI and pendingAttachmentsRef
provides:
  - Complete attachment metadata flow from CommentInput to CommentThread via onAttachmentsChange callback
  - PendingAttachment type exported from CommentInput for type safety
  - Verified scroll preservation implementation (already correct)
  - Verified edit handler wiring (already correct)
affects: [milestone-verification, production-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parent-child communication via callback props for ref population"
    - "Export interface from child component for parent type safety"
    - "Call callback on state changes to sync parent ref"

key-files:
  created: []
  modified:
    - components/proposals/CommentInput.tsx
    - components/proposals/CommentThread.tsx
    - landing-page-new/src/components/CommentInput.tsx
    - landing-page-new/src/components/CommentThread.tsx

key-decisions:
  - "Use callback prop pattern instead of lifting state to preserve existing pendingAttachmentsRef architecture"
  - "Export PendingAttachment type from CommentInput for reuse in CommentThread"
  - "Call onAttachmentsChange in setPendingAttachments callback to ensure sync"

patterns-established:
  - "Attachment data flow: CommentInput → onAttachmentsChange callback → CommentThread → pendingAttachmentsRef"
  - "Type export from child component when parent needs child's internal types"

# Metrics
duration: 13min
completed: 2026-01-21
---

# Phase 4 Plan 1: Wire Edit Handlers & Attachment Flow Summary

**Complete attachment metadata flow via onAttachmentsChange callback enables files to link to comments on submit; verified scroll preservation and edit handlers already correctly implemented**

## Performance

- **Duration:** 13 min
- **Started:** 2026-01-21T04:07:58Z
- **Completed:** 2026-01-21T04:20:59Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Wired attachment data flow from CommentInput to CommentThread using callback prop pattern
- Exported PendingAttachment type from CommentInput for parent type safety
- Verified scroll preservation implementation correct in both portals (no changes needed)
- Verified edit handler wiring correct in both portals (no changes needed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire attachment data flow from CommentInput to CommentThread** - `fb1d22e` (feat)
   - Exported PendingAttachment interface from CommentInput
   - Added onAttachmentsChange optional callback prop
   - Called onAttachmentsChange when attachments added/removed
   - Implemented handleAttachmentsChange in CommentThread
   - Wired callback to CommentInput in both admin and client portals

2. **Task 2 & 3: Verify scroll preservation and edit handler implementations** - `06074d8` (docs)
   - Confirmed scrollPosRef initialization correct
   - Confirmed handleScroll wired to onScroll
   - Confirmed handleEdit passed to CommentItem
   - All implementations verified correct, no changes needed

## Files Created/Modified
- `components/proposals/CommentInput.tsx` - Exported PendingAttachment type, added onAttachmentsChange prop, called callback on state changes
- `components/proposals/CommentThread.tsx` - Imported PendingAttachment type, implemented handleAttachmentsChange, wired to CommentInput
- `landing-page-new/src/components/CommentInput.tsx` - Exported PendingAttachment type, added onAttachmentsChange prop, called callback on state changes
- `landing-page-new/src/components/CommentThread.tsx` - Imported PendingAttachment type, implemented handleAttachmentsChange, wired to CommentInput

## Decisions Made

**1. Callback prop pattern vs lifting state**
- **Decision:** Use onAttachmentsChange callback to populate pendingAttachmentsRef
- **Rationale:** Preserves existing architecture where CommentThread uses ref for attachment data; avoids lifting state unnecessarily

**2. Export PendingAttachment type from CommentInput**
- **Decision:** Export interface to enable CommentThread type safety
- **Rationale:** Parent component needs child's type for callback parameter; better than duplicating interface

**3. Call callback within setState**
- **Decision:** Call onAttachmentsChange in setPendingAttachments callback function
- **Rationale:** Ensures parent ref is synced with new state value; prevents timing issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward. The audit correctly identified the missing callback prop as the root cause. Scroll preservation and edit handlers were already correctly implemented, requiring only verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Gap closure complete.** All three critical gaps from v1 milestone audit addressed:

1. **COMM-03 (Attachment metadata dropped):** ✅ Fixed - Attachments now flow from CommentInput to CommentThread
2. **COMM-02 (Scroll jumping):** ✅ Verified - Scroll preservation already correctly implemented
3. **COMM-06 (Edit handler disconnected):** ✅ Verified - Edit handlers already correctly wired

**Ready for:**
- Re-run milestone audit to verify gaps closed
- Production deployment if audit passes

**No blockers or concerns.**

---
*Phase: 04-integration-and-polish*
*Completed: 2026-01-21*
