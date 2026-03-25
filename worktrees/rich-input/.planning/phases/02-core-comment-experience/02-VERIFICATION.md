---
phase: 02-core-comment-experience
verified: 2026-01-20T09:32:00Z
status: gaps_found
score: 6/8 must-haves verified
gaps:
  - truth: "Users can edit their own comments"
    status: failed
    reason: "Edit button exists but onEdit handler not connected in CommentThread components"
    artifacts:
      - path: "components/proposals/CommentThread.tsx"
        issue: "CommentItem rendered without onEdit prop (line 153-158)"
      - path: "landing-page-new/src/components/CommentThread.tsx"
        issue: "CommentItem rendered without onEdit prop (line 205-209)"
    missing:
      - "handleEdit function in CommentThread"
      - "API call to PUT /comments/{id} in handleEdit"
      - "onEdit prop passed to CommentItem"
  - truth: "Scroll position maintained during updates"
    status: failed
    reason: "No scroll position preservation logic found in polling implementation"
    artifacts:
      - path: "components/proposals/CommentThread.tsx"
        issue: "pollForNewComments appends comments without scroll preservation"
      - path: "landing-page-new/src/components/CommentThread.tsx"
        issue: "Same - no scroll restoration"
    missing:
      - "useRef for tracking scroll position before update"
      - "scrollTo/scrollTop restoration after new comments added"
human_verification:
  - test: "Real-time polling verification"
    expected: "Post a comment from one portal, see it appear in the other within 10 seconds without refresh"
    why_human: "Automated tests can't simulate two concurrent browser sessions with different users"
---

# Phase 2: Core Comment Experience Verification Report

**Phase Goal:** Users can post comments freely, see updates via polling, and edit their own comments before replies.

**Verified:** 2026-01-20
**Status:** gaps_found
**Score:** 6/8 must-haves verified

## Goal Achievement Summary

Phase 2 implements two major features: comment editing and real-time polling. While the API layer and UI components are in place, a critical wiring issue prevents the edit functionality from working, and scroll position preservation is missing from the polling implementation.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Users can edit their own comments | ❌ FAILED | Edit button exists but `onEdit` handler never called |
| 2 | Edit button appears only on user's own comments | ✅ VERIFIED | Line 36: `const isOwner = currentUserId === comment.userId` |
| 3 | Edit option disappears after replies | ⚠️ DEFERRED | No reply threading in schema; plan explicitly deferred |
| 4 | Edited comments show edit indicator | ✅ VERIFIED | Lines 78-82, 38: `showEditedBadge` conditional rendering |
| 5 | New comments appear without page refresh within 10 seconds | ✅ VERIFIED | Polling every 10s via `setInterval` (lines 25, 45, 73, 93) |
| 6 | Both parties see the same comment stream | ✅ VERIFIED | GET endpoint returns all comments filtered by proposalId only |
| 7 | Comment stream updates automatically via polling | ✅ VERIFIED | `pollForNewComments` function with proper merge logic (lines 76-93, 124-141) |
| 8 | Scroll position maintained during updates | ❌ FAILED | No scroll preservation logic found |

**Score:** 6/8 must-haves verified (2 critical gaps)

---

## Required Artifacts

### API Layer

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify/functions/comments.ts` | PUT endpoint for editing | ✅ VERIFIED | Lines 212-315: Full PUT handler with auth, ownership validation (403 if not owner), returns updated comment with `isEdited: true` |
| `netlify/functions/comments.ts` | GET with `since` param | ✅ VERIFIED | Lines 64-133: Supports optional `since` query param for efficient polling |
| `lib/comments.ts` | `getComments(since?)` | ✅ VERIFIED | Lines 21-34: Properly passes `since` parameter to API |

### UI Components - Admin Portal

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/proposals/CommentItem.tsx` | Edit UI | ✅ VERIFIED | 129 lines: `isEditing` state, textarea, save/cancel buttons, `onEdit` prop |
| `components/proposals/CommentThread.tsx` | Polling | ✅ VERIFIED | 175 lines: `setInterval` every 10s, visibility API, merge logic |

### UI Components - Client Portal

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `landing-page-new/src/components/CommentItem.tsx` | Edit UI | ✅ VERIFIED | 129 lines: Identical implementation to admin portal |
| `landing-page-new/src/components/CommentThread.tsx` | Polling + URL fix | ✅ VERIFIED | 227 lines: Polling with `NEXT_PUBLIC_API_URL` env var (no hardcoded localhost) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CommentItem (both) | PUT /comments endpoint | `onEdit` callback | ❌ NOT_WIRED | `onEdit` prop defined but never passed by CommentThread |
| CommentThread (both) | getComments() | `setInterval` polling | ✅ WIRED | Proper 10-second polling with visibility detection |
| CommentThread (both) | Comments state | Merge new without replace | ✅ WIRED | Lines 81-86, 129-134: Appends truly new comments only |

### Critical Gap: Edit Handler Not Connected

**Admin Portal (`components/proposals/CommentThread.tsx` lines 151-159):**
```tsx
{comments.map(comment => (
    <CommentItem
        key={comment.id}
        comment={comment}
        currentUserId={currentUserId}
        // onEdit prop MISSING!
    />
))}
```

**Client Portal (`landing-page-new/src/components/CommentThread.tsx` lines 203-210):**
```tsx
{comments.map(comment => (
    <CommentItem
        key={comment.id}
        comment={comment}
        currentUserId={currentUserId}
        // onEdit prop MISSING!
    />
))}
```

**Missing Implementation:**
```typescript
// Should be added to CommentThread:
const handleEdit = async (id: string, newContent: string) => {
    const response = await fetch(`${API_BASE}/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content: newContent }),
    });
    if (response.ok) {
        // Update local state with edited comment
    }
};
```

---

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| COMM-01: Unlimited Comment Exchange | ✅ SATISFIED | No turn restrictions in API |
| COMM-02: Real-Time Comment Updates | ⚠️ PARTIAL | Polling works but scroll preservation missing |
| COMM-06: Comment Editing | ❌ BLOCKED | `onEdit` handler not connected |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | TODO/FIXME comments | - | - |
| None | - | Empty implementations | - | - |
| None | - | Placeholder content | - | - |

**Note:** No stub patterns found. The implementations are substantive but incomplete.

---

## Human Verification Required

### 1. Real-Time Polling Verification

**Test:** Open two browser windows (incognito for second user). In one window, post a comment. In the other window, observe the comment thread.

**Expected:** The new comment appears within 10 seconds without manual refresh.

**Why Human:** Automated verification can't simulate concurrent sessions with different authenticated users.

---

## Gaps Summary

### Critical Gaps (Blocking Goal Achievement)

1. **Edit button does nothing**
   - Location: Both `CommentThread.tsx` files
   - Impact: Users see edit button but clicking it has no effect
   - Fix: Add `handleEdit` function and pass `onEdit` prop to `CommentItem`

2. **Scroll position not preserved during polling updates**
   - Location: Both `CommentThread.tsx` files
   - Impact: When new comments arrive, scroll position may jump unexpectedly
   - Fix: Track scroll position before update, restore after appending new comments

### Deferred Feature (Not a Gap)

- **"Edit option disappears after replies"** — The PLAN explicitly states this is deferred: "For now, show edit button based on ownership only." The schema has no reply threading, so this feature requires future enhancement.

---

## Build Verification

| Portal | Build Status | Details |
|--------|--------------|---------|
| Admin Portal | ✅ PASS | `npm run build` completed successfully |
| Client Portal | ✅ PASS | `npm run build` completed successfully |

---

_Verified: 2026-01-20_
_Verifier: OpenCode (gsd-verifier)_
