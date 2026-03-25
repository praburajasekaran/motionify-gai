---
title: "Add Send for Review Button to Deliverable Detail"
type: feat
date: 2026-01-29
---

# Add "Send for Client Review" Button to Deliverable Detail

## Overview

Admins currently have no UI button to transition a deliverable from `beta_ready` → `awaiting_approval`. This transition notifies the client that work is ready for their review. Today it requires a manual API call via browser console.

The PATCH API already supports this transition and sends email notifications — this is purely a frontend gap.

## Problem Statement

When an admin uploads a beta file, the deliverable status changes to `beta_ready`. The next step in the workflow is to mark it `awaiting_approval` so the client gets notified and can approve/reject. There is no button for this — admins must use the browser console.

```
beta_ready  →  awaiting_approval  →  approved / revision_requested
     ↑              ↑
  (upload)    (MISSING BUTTON)
```

## Proposed Solution

Add a "Send for Client Review" button to `DeliverableMetadataSidebar.tsx` that:

1. Shows only when deliverable status is `beta_ready` and user is admin/PM
2. Opens a `ConfirmDialog` (warning variant) confirming the action
3. PATCHes the deliverable status to `awaiting_approval`
4. Triggers the existing email notification (backend already handles this)
5. Updates local state via the existing `DeliverableContext` dispatch

## Acceptance Criteria

- [ ] "Send for Client Review" button visible in sidebar when status is `beta_ready`
- [ ] Button only shows for admin/PM roles (not clients, not team members)
- [ ] Clicking opens ConfirmDialog with clear messaging
- [ ] Confirming calls PATCH `/api/deliverables/:id` with `{ status: 'awaiting_approval' }`
- [ ] Request includes `credentials: 'include'` for cookie auth
- [ ] On success: local state updates, success toast shown, button disappears
- [ ] On error: error toast shown, button remains clickable
- [ ] Client receives email notification (already handled by backend PATCH handler)

## Technical Approach

### Files to Modify

1. **`components/deliverables/DeliverableMetadataSidebar.tsx`** — Add button + handler
2. **`pages/DeliverableReview.tsx`** — Add `handleSendForReview` handler, pass to sidebar
3. **`components/deliverables/DeliverableContext.tsx`** — Add `SEND_FOR_REVIEW` action (or reuse status update pattern)

### Implementation Details

**Button placement** — In `DeliverableMetadataSidebar.tsx`, add before the existing approve/reject buttons (which only show at `awaiting_approval`):

```tsx
// DeliverableMetadataSidebar.tsx
// After "Next Steps" section, before approve/reject buttons

{status === 'beta_ready' && isAdmin && (
  <button
    onClick={onSendForReview}
    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
    disabled={isSending}
  >
    <Send className="w-4 h-4" />
    {isSending ? 'Sending...' : 'Send for Client Review'}
  </button>
)}
```

**Confirmation dialog** — Reuse existing `ConfirmDialog` component (`components/ui/ConfirmDialog.tsx`):

```tsx
// DeliverableReview.tsx
const [showSendForReviewDialog, setShowSendForReviewDialog] = useState(false);

<ConfirmDialog
  isOpen={showSendForReviewDialog}
  onClose={() => setShowSendForReviewDialog(false)}
  onConfirm={handleSendForReview}
  title="Send for Client Review?"
  message="This will notify the client that the deliverable is ready for their review. They will be able to approve or request revisions."
  confirmLabel="Send for Review"
  cancelLabel="Cancel"
  variant="warning"
  isLoading={isSendingForReview}
/>
```

**API call** — Follow existing pattern from `handleApprove`:

```tsx
// DeliverableReview.tsx
const handleSendForReview = async () => {
  setIsSendingForReview(true);
  try {
    const response = await fetch(
      `/.netlify/functions/deliverables?id=${deliverable.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'awaiting_approval' }),
      }
    );
    if (!response.ok) throw new Error('Failed to send for review');
    // Update local state
    // Show success toast
    setShowSendForReviewDialog(false);
  } catch (error) {
    console.error('Failed to send for review:', error);
    // Show error toast
  } finally {
    setIsSendingForReview(false);
  }
};
```

**Permission check** — Use existing role check pattern:

```tsx
const isAdmin = user?.role === 'super_admin' || user?.role === 'project_manager';
const canSendForReview = isAdmin && deliverable?.status === 'beta_ready';
```

### No Backend Changes Required

The PATCH handler in `netlify/functions/deliverables.ts` already:
- Accepts `{ status: 'awaiting_approval' }`
- Sends email notification to client on status change
- Requires authentication via `withAuth` middleware

### Existing Patterns Referenced

| Pattern | Source | Usage |
|---------|--------|-------|
| ConfirmDialog | `components/ui/ConfirmDialog.tsx` | Warning variant with loading state |
| PATCH + toast | `DeliverableReview.tsx:handleApprove` | API call → dispatch → toast |
| credentials: 'include' | All fetch calls | Cookie-based auth |
| Lucide icons | Project convention | `Send` icon from lucide-react |
| Success toast | `DeliverableReview.tsx:295-312` | Fixed position, auto-dismiss |

## References

- Todo: `.planning/todos/pending/2026-01-27-send-for-review-button.md`
- Deliverable sidebar: `components/deliverables/DeliverableMetadataSidebar.tsx`
- Review page: `pages/DeliverableReview.tsx`
- PATCH API: `netlify/functions/deliverables.ts:275-440`
- ConfirmDialog: `components/ui/ConfirmDialog.tsx`
- DeliverableContext: `components/deliverables/DeliverableContext.tsx`
- Permission utils: `utils/deliverablePermissions.ts`
