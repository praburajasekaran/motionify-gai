---
title: "Client deliverables not visible due to status filter"
type: fix
date: 2026-01-30
---

# fix: Client deliverables not visible due to status filter

## Overview

Clients see "No deliverables yet" on the project detail page even though deliverables were created during proposal creation. The deliverables exist in the database but are hidden by a multi-layer status filter that excludes `pending` and `in_progress` statuses from client view.

## Problem Statement

When a super admin creates a proposal with deliverables and the project is created (via payment or manual conversion), the deliverables are inserted into the `deliverables` table with status `'pending'`. However, clients cannot see any deliverables until an admin uploads files and changes the status to `beta_ready` or later.

This is confusing because clients accepted these deliverables as part of their proposal and expect to see them listed with progress tracking.

**Three filtering layers hide the deliverables:**

1. **API endpoint** (`netlify/functions/deliverables.ts:207-211`) — `viewableStatuses` array excludes `pending`/`in_progress` from client responses
2. **Permission utility** (`utils/deliverablePermissions.ts:80-89`) — `canViewDeliverable()` rejects `pending`/`in_progress` for clients
3. **Permission error messages** (`utils/deliverablePermissions.ts`) — `getPermissionDeniedReason()` returns "Deliverable is not yet ready for client review"

## Existing Fix (Not Merged)

This was already solved on branch `feat/show-all-deliverables-to-clients` in commit `d943cd5`. The fix removes all three filtering layers and adds status-aware UI indicators. However, **this branch was never merged to main**.

## Proposed Solution

Cherry-pick commit `d943cd5` from `feat/show-all-deliverables-to-clients` onto the current branch, resolve any conflicts, and verify the fix works.

### Changes in the existing fix:

| File | Change |
|------|--------|
| `netlify/functions/deliverables.ts` | Remove `viewableStatuses` filter — return all deliverables to clients |
| `utils/deliverablePermissions.ts` | Simplify `canViewDeliverable()` to return `true` for clients; remove status-specific denial message |
| `landing-page-new/src/lib/portal/components/ProjectOverview.tsx` | Add color-coded status badges with human-readable labels |
| `landing-page-new/src/lib/portal/types.ts` | Add `status` field to client Deliverable type |
| `pages/DeliverableReview.tsx` | Complete `statusColors` map for all 8 statuses |
| `pages/ProjectDetail.tsx` | Expand inline Badge variant logic for all statuses |
| `components/deliverables/DeliverableFilesList.tsx` | Status-aware empty state ("Work hasn't started yet" vs generic "No files") |

### Status label mapping for clients:

| Internal Status | Client Label |
|----------------|-------------|
| `pending` | Not Started |
| `in_progress` | In Progress |
| `beta_ready` | Ready for Review |
| `awaiting_approval` | Awaiting Approval |
| `approved` | Approved |
| `revision_requested` | Revision Requested |
| `payment_pending` | Payment Pending |
| `final_delivered` | Delivered |

## Acceptance Criteria

- [x] Client users can see all deliverables on the project detail page, including those with `pending` and `in_progress` status
- [x] Each deliverable shows a color-coded status badge with a client-friendly label
- [x] Empty state for pending deliverables shows "Work hasn't started yet" instead of "No files"
- [x] Admin/super_admin view is unchanged
- [x] Both portals (React SPA in `pages/` and Next.js in `landing-page-new/`) display correctly

## Implementation Steps

1. Cherry-pick `d943cd5` onto current branch (or main)
2. Resolve any merge conflicts (likely in `ProjectDetail.tsx` which has been modified since)
3. Test as client user — verify deliverables are visible
4. Test as admin — verify no regression
5. Merge to main

## References

- Documented solution: `docs/solutions/logic-errors/client-deliverables-hidden-by-status-filter.md`
- Fix commit: `d943cd5` on `feat/show-all-deliverables-to-clients`
- Todo: `docs/plans/2026-01-26-feat-show-all-deliverables-to-clients.md` (original plan)
