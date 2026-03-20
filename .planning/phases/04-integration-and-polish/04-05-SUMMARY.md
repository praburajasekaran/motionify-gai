---
phase: 04-integration-and-polish
plan: "05"
subsystem: comments
tags: [edit-button, visibility-logic, comments, admin-portal, client-portal]
---

# Phase 4 Plan 5: Edit Button Visibility Logic Summary

## Objective
Implement edit button visibility logic that only shows edit option on user's own comments when no subsequent replies exist from other users. This maintains conversation integrity by preventing users from editing comments after the conversation has progressed.

## One-Liner
Edit button appears only on own comments without subsequent replies from other users, hidden after replies in both admin and client portals.

---

## Dependency Graph

| Relationship | Details |
|--------------|---------|
| **requires** | Phase 1: CommentThread and CommentItem base components |
| **provides** | Edit button visibility control with hasSubsequentReplies logic |
| **affects** | All comment interactions requiring edit access control |

---

## Tech Stack Changes

### Added
- `computeHasSubsequentReplies()` helper function in both portals
- `hasSubsequentReplies` prop to CommentItem component interface

### Modified
- Edit button conditional: `isOwner && !hasSubsequentReplies && !isEditing`

---

## Key Files Created/Modified

| File | Change | Commit |
|------|--------|--------|
| `components/proposals/CommentThread.tsx` | Added `computeHasSubsequentReplies` function, passes `hasSubsequentReplies` to CommentItem | 4294f06 |
| `components/proposals/CommentItem.tsx` | Added `hasSubsequentReplies` prop, updated edit button conditional | 4294f06 |
| `landing-page-new/src/components/CommentThread.tsx` | Added `computeHasSubsequentReplies` function, passes `hasSubsequentReplies` to CommentItem | f709e53 |
| `landing-page-new/src/components/CommentItem.tsx` | Added `hasSubsequentReplies` prop, updated edit button conditional | f709e53 |

---

## Decisions Made

### Edit Button Visibility Logic
**Decision:** Check both ownership AND subsequent replies from other users

**Rationale:** 
- Ownership alone (isOwner) allowed editing any of user's comments
- Need to prevent editing after conversation progresses
- Self-replies should NOT hide edit button (same user replying to self is allowed)

**Implementation:**
```typescript
const computeHasSubsequentReplies = (
    comment: Comment,
    allComments: Comment[],
    currentUserId: string
): boolean => {
    const subsequentComments = allComments.filter(
        c => new Date(c.createdAt) > new Date(comment.createdAt)
    );
    return subsequentComments.some(c => c.userId !== currentUserId);
};
```

**Edit button condition:** `{isOwner && !hasSubsequentReplies && !isEditing && ( ... )}`

---

## Deviations from Plan

**None** - Plan executed exactly as written.

---

## Verification Results

### Code Inspection ✓
- [x] `computeHasSubsequentReplies` function exists in both CommentThread files
- [x] `hasSubsequentReplies` prop passed from CommentThread to CommentItem
- [x] `hasSubsequentReplies` prop in CommentItem interface with default value `false`
- [x] Edit button conditional includes `!hasSubsequentReplies` check
- [x] TypeScript compilation successful

### Test Scenarios (Expected Behavior)

| Scenario | Comment Owner | Has Subsequent Reply? | Edit Button? |
|----------|---------------|----------------------|--------------|
| Just posted | User A | No | ✅ Visible |
| User B replied | User A | Yes (from User B) | ❌ Hidden |
| Multiple by User A | User A | No (all by same user) | ✅ On last only |
| Self-reply | User A | No (reply from self) | ✅ Visible |

---

## Metrics

| Metric | Value |
|--------|-------|
| **Duration** | ~5 minutes |
| **Completed** | 2026-01-21 |
| **Tasks Completed** | 3/3 |
| **Files Modified** | 4 |
| **Commits** | 3 |

---

## Authentication Gates

**None** - No authentication requirements for this implementation.

---

## Next Phase Readiness

**Phase 4 Complete** - All integration and polish tasks executed.

**Ready for:** `/gsd:audit-milestone v1` to verify all gaps closed
