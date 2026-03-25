---
title: "Missing sendForReview implementation breaks client approval workflow"
date: 2026-02-02
category: logic-errors
tags:
  - deliverable-approval
  - client-workflow
  - permissions
  - role-based-rendering
  - beta-ready
module: Deliverable Review System
symptoms:
  - Client sees no approve/reject buttons on beta_ready deliverables
  - sendForReview destructured but undefined at runtime
  - Client sees internal "Beta Ready" label instead of user-friendly status
  - Client can view uploaded files before team sends for review
  - Progress bar shows hardcoded percentage (50% for beta_ready) unrelated to actual work
root_cause: >
  sendForReview function was destructured in DeliverableReview.tsx but never
  implemented in DeliverableContext.tsx. No permission function existed to gate
  the beta_ready → awaiting_approval transition. Additionally, internal team
  concepts (beta_ready status, fake progress bars) were exposed to clients.
---

# Missing sendForReview implementation breaks client approval workflow

## Problem

A client viewing a `beta_ready` deliverable saw no approve/reject buttons, the internal "Beta Ready" label, uploaded files they shouldn't access yet, and a meaningless 50% progress bar. The approval workflow was broken because the `sendForReview` function — which transitions `beta_ready` → `awaiting_approval` — was referenced but never implemented.

## Investigation

1. Screenshot showed client sees "BETA READY" badge, files visible, no action buttons
2. `DeliverableReview.tsx:42` destructures `sendForReview` from context — but `DeliverableContext.tsx` never defines it
3. `canApproveDeliverable` in `deliverablePermissions.ts:148` gates on `status === 'awaiting_approval'` — correct, but no way to reach that status
4. `DeliverableMetadataSidebar` props interface missing `onSendForReview`
5. Backend PATCH endpoint already supports `awaiting_approval` transition and sends email notifications (`deliverables.ts:420-439`)

## Root Cause

Five interconnected gaps:

1. **Missing function**: `sendForReview` destructured but not on `DeliverableContextType`
2. **Missing permission**: No `canSendForReview` function to gate who can trigger the transition
3. **Missing UI**: Sidebar had no button for team to send for review
4. **Leaked internal status**: Clients saw "Beta Ready" — an internal team concept
5. **Fake progress**: Hardcoded `STATUS_PROGRESS_MAP` mapped status to percentage (not real tracking)

## Solution

### Files modified (9)

| File | Change |
|------|--------|
| `utils/deliverablePermissions.ts` | Added `canSendForReview` (admin/PM only, `beta_ready` status) |
| `hooks/useDeliverablePermissions.ts` | Exposed `canSendForReview` in hook return |
| `components/deliverables/DeliverableContext.tsx` | Implemented `sendForReview` with permission check and PATCH call |
| `components/deliverables/DeliverableMetadataSidebar.tsx` | Added Send for Review button (team), info message (client), removed progress bar |
| `components/deliverables/DeliverableFilesList.tsx` | Hide files from clients when `beta_ready` |
| `components/deliverables/DeliverableListItem.tsx` | Show "In Progress" to clients instead of "Beta Ready", removed progress bar |
| `components/deliverables/DeliverablesList.tsx` | Hide "Beta Ready" filter option from clients |
| `pages/DeliverableReview.tsx` | Show "In Progress" label to clients |
| `pages/ProjectDetail.tsx` | Show "In Progress" label to clients, removed progress bar |

### Key implementation: `sendForReview`

```typescript
// DeliverableContext.tsx
const sendForReview = async (deliverableId: string) => {
  if (!currentUser) throw new Error('You must be logged in');

  const deliverable = state.deliverables.find(d => d.id === deliverableId);
  if (!deliverable) throw new Error('Deliverable not found');

  if (!canSendForReview(currentUser, deliverable, currentProject)) {
    throw new Error(getPermissionDeniedReason('send_for_review', currentUser, deliverable, currentProject));
  }

  const response = await fetch(`/api/deliverables/${deliverableId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: 'awaiting_approval' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to send for review');
  }
};
```

### Key implementation: hiding files from clients

```typescript
// DeliverableFilesList.tsx
const filesHiddenForClient = currentUser && isClient(currentUser) && deliverable.status === 'beta_ready';

if (filesHiddenForClient) {
  return (
    <div className="space-y-4">
      <h3>Files</h3>
      <div>
        <EyeOff />
        <p>Files will be available once this deliverable is sent for your review.</p>
      </div>
    </div>
  );
}
```

### Key implementation: client-friendly status label

```typescript
// DeliverableListItem.tsx
const statusConfig = (currentUser?.role === 'client' && deliverable.status === 'beta_ready')
  ? STATUS_CONFIG['in_progress']
  : rawStatusConfig;
```

## Design Decisions

- **`beta_ready` is internal only** — clients see "In Progress" instead
- **Files hidden, not deliverable items** — deliverables agreed in proposal are always visible to clients
- **Only admin/PM can send for review** — team_member cannot trigger client notification
- **No backend changes needed** — PATCH endpoint already handles `awaiting_approval` + email notifications
- **Progress bars removed** — hardcoded status-to-percentage mapping was misleading, not actual work tracking

## Client vs Team View

```
Team sees:     Pending → In Progress → Beta Ready → [Send for Review] → Awaiting Approval
Client sees:   Pending → In Progress → In Progress (no files) → Awaiting Approval (files + approve/reject)
```

## Prevention

- When adding context functions that are destructured in components, implement them immediately — don't leave stubs
- Internal workflow states should always have a client-facing equivalent label
- Progress indicators should reflect real data, not hardcoded mappings from status
- Test the client view separately when building team-facing features

## Related

- [client-status-labels-show-admin-terminology](../ui-bugs/client-status-labels-show-admin-terminology.md) — same pattern of internal labels leaking to clients
- [task-visibility-hardcoded-false-for-clients](./task-visibility-hardcoded-false-for-clients.md) — similar role-based visibility issue
- [Plan: client-deliverable-feedback-approval-workflow](../../plans/2026-02-02-feat-client-deliverable-feedback-approval-workflow-plan.md) — original plan document
