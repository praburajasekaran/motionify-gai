# Gap: Missing "Send for Review" Button

**Created:** 2026-01-27
**Source:** PROD-04 manual testing
**Priority:** Medium

## Problem

Deliverables transition from `pending` → `beta_ready` automatically when a file is uploaded, but there's no UI button for admins to transition from `beta_ready` → `awaiting_approval`.

Currently requires manual API call or browser console:
```javascript
fetch(`/api/deliverables/${deliverableId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ status: 'awaiting_approval' })
})
```

## Expected Behavior

Admin should see a "Send for Client Review" or "Notify Client" button on the deliverable detail page when status is `beta_ready`. Clicking it should:

1. Update status to `awaiting_approval`
2. Send email notification to client (already implemented in API)
3. Update UI to reflect new status

## Location

- **Page:** `pages/DeliverableReview.tsx`
- **API:** `netlify/functions/deliverables.ts` (PATCH handler already supports this)

## Workaround

Use browser console to PATCH the status directly.
