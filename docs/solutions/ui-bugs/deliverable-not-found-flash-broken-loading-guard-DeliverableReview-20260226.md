---
title: "Deliverable Not Found Flash — Broken Loading Guard in DeliverableReview"
category: ui-bugs
module: DeliverableReview
tags: [loading-state, useReducer, useContext, race-condition, flash-of-wrong-content]
severity: medium
symptoms:
  - "Deliverable not found" message shows briefly when deliverable exists
  - Misleading empty state during data loading
  - Loading guard never activates despite data still fetching
date: 2026-02-26
---

# Deliverable Not Found Flash — Broken Loading Guard in DeliverableReview

## Problem

When navigating to a deliverable review page, users briefly saw "Deliverable not found" with a "Back to Deliverables" button, even though the deliverable existed. After a moment, the correct content appeared. This was misleading and caused confusion.

## Root Cause

**Bug 1: Wrong `isLoading` reference**

`DeliverableReviewContent` checked `state.isLoading` (line 274), but `state` comes from `useReducer` which has NO `isLoading` property. The actual `isLoading` is a separate `useState` exposed directly on the context provider.

```tsx
// BROKEN — state.isLoading is always undefined
const { state, dispatch, ... } = useDeliverables();
if (state.isLoading) { return <Spinner />; }  // never true!
```

Since `state.isLoading` was always `undefined` (falsy), the loading guard never activated. The component immediately fell through to the "not found" check.

**Bug 2: Race condition gap**

Even after fixing Bug 1, there's a 1-render gap between:
- `isLoading=false` (deliverables array fetched)
- `LOAD_DELIVERABLE_BY_ID` dispatch firing (via `useEffect` on `state.deliverables.length`)

During that single render, `deliverable` is still `null` but `isLoading` is `false`, so the component shows "not found."

## Solution

**File: `pages/DeliverableReview.tsx`**

```tsx
// FIXED — destructure isLoading directly from context
const { state, dispatch, isLoading: deliverablesLoading, ... } = useDeliverables();

// Three-stage loading guard
if (deliverablesLoading) {
  return <LoadingSpinner />;
}
if (!deliverable && state.deliverables.length > 0) {
  return <NotFound />;  // deliverables loaded, this ID doesn't exist
}
if (!deliverable) {
  return <LoadingSpinner />;  // deliverables empty, still resolving
}
```

The three-stage guard ensures:
1. Show spinner while fetching deliverables list
2. Show spinner during the gap before `LOAD_DELIVERABLE_BY_ID` fires
3. Only show "not found" when we're certain the deliverable doesn't exist (list loaded, ID not in it)

## Investigation Notes

Audited similar patterns in `ProposalBuilder.tsx` and `ProposalDetail.tsx` — both already had correct loading guards using React Query's `isLoading` directly.

## Prevention

1. **Never access loading state from reducer state if it's managed separately** — check where `isLoading` is actually defined (useState vs useReducer)
2. **Guard against race conditions between fetch completion and effect dispatch** — if a `useEffect` needs to run after data loads, consider the 1-render gap
3. **Three-stage loading pattern**: loading → resolving → not-found. Don't skip the middle stage
4. **Search for `state.isLoading` patterns** in components using combined reducer + separate loading state — this is a common source of bugs

## Key Files

- `pages/DeliverableReview.tsx` — fixed loading guard
- `components/deliverables/DeliverableContext.tsx` — source of truth for `isLoading` (useState, not in reducer)
