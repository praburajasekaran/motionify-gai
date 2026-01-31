---
title: "Clients can't see pending/in-progress deliverables due to status filter"
date: 2026-01-29
category: logic-errors
tags:
  - deliverables
  - permissions
  - client-portal
  - status-filter
  - dual-portal
module: deliverables
symptoms:
  - "Clients cannot see deliverables in pending or in_progress status"
  - "Client portal shows fewer deliverables than admin portal"
  - "Clients think work hasn't started because deliverables are hidden"
severity: medium
resolved: true
---

# Clients can't see pending/in-progress deliverables due to status filter

## Problem

Clients could only see deliverables with statuses `beta_ready`, `awaiting_approval`, `approved`, `revision_requested`, `payment_pending`, or `final_delivered`. Deliverables in `pending` or `in_progress` status were filtered out at both the API and permissions layers.

This was confusing because clients accepted these deliverables when they approved the proposal. Hiding them until files were uploaded made it seem like work hadn't started.

**Observable symptoms:**
- Client portal showed fewer deliverables than the admin portal
- Newly created deliverables were invisible to clients
- No progress tracking for early-stage work

## Root Cause

The filtering was enforced at **three separate layers**, all of which needed changes:

1. **API endpoint** (`netlify/functions/deliverables.ts:206-210`) — A `viewableStatuses` array filtered the response for client role users
2. **Permission utility** (`utils/deliverablePermissions.ts:80-89`) — `canViewDeliverable()` checked status against an allowlist
3. **Permission error messages** (`utils/deliverablePermissions.ts:399-403`) — `getPermissionDeniedReason()` returned a specific denial for pending/in_progress

## Solution

### 1. Remove API-level status filter

```typescript
// BEFORE — netlify/functions/deliverables.ts
const viewableStatuses = ['beta_ready', 'awaiting_approval', 'approved', 'revision_requested', 'payment_pending', 'final_delivered'];
const filteredDeliverables = userRole === 'client'
  ? deliverables.filter(d => viewableStatuses.includes(d.status))
  : deliverables;
return { statusCode: 200, headers, body: JSON.stringify(filteredDeliverables) };

// AFTER — just return all deliverables
return { statusCode: 200, headers, body: JSON.stringify(deliverables) };
```

### 2. Simplify canViewDeliverable()

```typescript
// BEFORE — utils/deliverablePermissions.ts
if (isClient(user)) {
  const viewableStatuses: DeliverableStatus[] = [
    'beta_ready', 'awaiting_approval', 'approved', 'payment_pending', 'final_delivered',
  ];
  return viewableStatuses.includes(deliverable.status);
}

// AFTER
if (isClient(user)) {
  return true;
}
```

### 3. Remove status-specific denial message

```typescript
// REMOVED from getPermissionDeniedReason()
if (deliverable && isClient(user)) {
  if (deliverable.status === 'pending' || deliverable.status === 'in_progress') {
    return 'Deliverable is not yet ready for client review';
  }
}
```

### 4. Add UI status indicators (both portals)

Since clients now see all deliverables, the UI needed clear status communication:

- **Client portal** (`ProjectOverview.tsx`): Added `CLIENT_STATUS_CONFIG` map with human-readable labels, colors, and icons for all 8 statuses (e.g., `pending` -> "Not Started", `in_progress` -> "In Progress")
- **Admin portal** (`DeliverableReview.tsx`): Completed `statusColors` map to include `pending`, `in_progress`, and `payment_pending`
- **Admin portal** (`ProjectDetail.tsx`): Expanded inline Badge variant logic to handle all statuses
- **Files list** (`DeliverableFilesList.tsx`): Made empty state status-aware — shows a Clock icon with "Work hasn't started yet" for pending/in_progress instead of a generic "No files" message

## Prevention

### Pattern: Multi-layer permission changes

When modifying visibility/permission rules in this codebase, check all three layers:

1. **API endpoint** — the Netlify function handler (server-side filter)
2. **Permission utility** — `utils/deliverablePermissions.ts` (shared logic)
3. **Permission error messages** — `getPermissionDeniedReason()` (user-facing messages)

Missing any one layer creates inconsistency between what the API returns and what the UI allows.

### Pattern: Status-aware empty states

When making previously hidden items visible, ensure the UI communicates *why* there's no content yet rather than showing a generic empty state. For deliverables, a "Work hasn't started yet" message is more informative than "No files uploaded."

## Files Changed

| File | Change |
|------|--------|
| `netlify/functions/deliverables.ts` | Removed `viewableStatuses` filter |
| `utils/deliverablePermissions.ts` | Simplified `canViewDeliverable()`, removed denial message |
| `landing-page-new/src/lib/portal/components/ProjectOverview.tsx` | Added status badges with icons |
| `landing-page-new/src/lib/portal/types.ts` | Added `status` field to client Deliverable type |
| `pages/DeliverableReview.tsx` | Completed `statusColors` map for all 8 statuses |
| `pages/ProjectDetail.tsx` | Expanded inline Badge variant logic |
| `components/deliverables/DeliverableFilesList.tsx` | Status-aware empty state |

## Related

- Commit: `d943cd5`
- Branch: `feat/show-all-deliverables-to-clients`
