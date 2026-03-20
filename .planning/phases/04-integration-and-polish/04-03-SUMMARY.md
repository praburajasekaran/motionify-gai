---
phase: 04-integration-and-polish
plan: 03
subsystem: attachments
tags: [react, file-upload, bug-fix, ui]
tech-stack:
  added: []
  patterns: [state-cleanup, duplicate-prevention]
---

# Phase 4 Plan 3: Fix Duplicate File Preview Summary

**One-liner:** Removed completed uploads from uploadingFiles array after adding to pendingAttachments to prevent duplicate file preview display.

## Objective

Fix duplicate file preview by removing completed uploads from uploadingFiles array after adding to pendingAttachments.

**Purpose:** Resolve Gap 1 - files currently appear twice (once as "uploading complete" and once as "pending attachment").
**Output:** Clean attachment preview showing files only once.

## Root Cause

From UAT diagnosis:
- **Gap 1: Duplicate file preview (minor)**
- User reported: "I uploaded one file less than 10mb but I'm seeing the file being displayed twice... once with the complete tag and another with file size info"
- **Root cause:** Completed files remain in uploadingFiles array while also being added to pendingAttachments
- **Location:** CommentInput.uploadFileItem function (both portals)
- **Fix:** Remove from uploadingFiles after adding to pendingAttachments

## Decisions Made

| Decision | Rationale | Status |
|----------|-----------|--------|
| Remove from uploadingFiles after adding to pendingAttachments | Prevents duplicate display - completed files should only appear in pendingAttachments | Applied |

## Files Modified

| File | Change |
|------|--------|
| `components/proposals/CommentInput.tsx` | Added `setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id))` after setPendingAttachments |
| `landing-page-new/src/components/CommentInput.tsx` | Same fix applied for client portal |

## Key Files

**Created:** N/A (bug fix only)

**Modified:**
- `components/proposals/CommentInput.tsx` - Admin portal CommentInput component
- `landing-page-new/src/components/CommentInput.tsx` - Client portal CommentInput component

## Implementation Details

The fix adds a single line after the file is successfully uploaded and added to pendingAttachments:

```typescript
setPendingAttachments(prev => { /* ... add file to pending ... */ });

// Remove from uploadingFiles to prevent duplicate display
setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
```

**Why this works:** Completed files should only appear in pendingAttachments (showing "ready to submit"). Leaving them in uploadingFiles causes duplicate rendering - once as "uploading complete" (with green "Complete" tag) and once as "pending attachment" (with file size info).

## Verification

**Manual test:**
1. Upload a file <10MB
2. Wait for upload to complete
3. Verify file appears ONCE in preview (not twice)
4. Check that only one file preview element is rendered

**Test in both portals:**
- Admin portal (Vite SPA)
- Client portal (Next.js)

## Success Criteria

- [x] Uploaded files appear once in preview (no duplicate display)
- [x] File removed from uploadingFiles after adding to pendingAttachments
- [x] Both admin and client portals handle preview correctly
- [x] No duplicate rendering in UI

## Dependencies

**Requires:** N/A (standalone fix)

**Provides:** Clean file preview without duplicates

**Affects:** Future uploads - files will display correctly without duplication

## Deviations from Plan

**None** - Plan executed exactly as written.

## Authentication Gates

**None** - No authentication requirements for this fix.

## Metrics

| Metric | Value |
|--------|-------|
| Tasks Completed | 1/1 |
| Files Modified | 2 |
| Lines Added | 4 |
| Duration | ~2 minutes |

## Commits

- `126b15d`: fix(04-03): remove completed uploads from uploadingFiles to prevent duplicate preview
