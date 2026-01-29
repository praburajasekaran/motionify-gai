---
title: "feat: Show all deliverables to clients regardless of status"
type: feat
date: 2026-01-29
---

# Show All Deliverables to Clients Regardless of Status

## Overview

Remove the `viewableStatuses` filter that hides `pending` and `in_progress` deliverables from clients. Add client-friendly status indicators so clients can track progress on all deliverables they agreed to in their proposal.

## Problem Statement / Motivation

Clients accepted deliverables as part of their proposal, but can only see them once they reach `beta_ready` status. This creates confusion:

- Clients don't know work has started on their deliverables
- It appears as if fewer deliverables exist than were agreed upon
- No visibility into production progress before first file upload

## Proposed Solution

1. Remove the API-level status filter for client deliverable listings
2. Update the permission utility to allow clients to view all statuses
3. Add status labels to the client portal UI (currently shows name only)
4. Keep file download restrictions in place for statuses with no files
5. Handle empty states gracefully when clients view deliverables with no files yet

## Technical Approach

### Filter Locations to Update (3 places)

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `netlify/functions/deliverables.ts` | 207-211 | Remove `viewableStatuses` filter for clients |
| 2 | `utils/deliverablePermissions.ts` | 80-90 | Update `canViewDeliverable()` to return `true` for all statuses when client |
| 3 | `netlify/functions/r2-presign.ts` | 163-178 | **Keep as-is** — file downloads should remain gated; `pending`/`in_progress` have no files |

### Client Portal UI Updates

The client portal (`landing-page-new`) currently defines `Deliverable` as `{ id: string; name: string }` with no status field. The `ProjectOverview` component renders deliverables as simple clickable name items.

**Changes needed:**

| # | File | Change |
|---|------|--------|
| 4 | `landing-page-new/src/lib/portal/types.ts` | Add `status` field to `Deliverable` type |
| 5 | `landing-page-new/src/lib/portal/components/ProjectOverview.tsx` | Add status badge next to deliverable name |

**Client-facing status labels:**

| Internal Status | Client Label | Color | Icon |
|----------------|-------------|-------|------|
| `pending` | Not Started | zinc/gray | Circle |
| `in_progress` | In Progress | blue | Loader |
| `beta_ready` | Ready for Review | purple | Eye |
| `awaiting_approval` | Awaiting Your Approval | amber | Clock |
| `approved` | Approved | emerald | CheckCircle |
| `revision_requested` | Revision Requested | red | AlertCircle |
| `payment_pending` | Payment Pending | amber | CreditCard |
| `final_delivered` | Delivered | emerald | Download |

### Admin Portal Updates

The admin portal already has full `STATUS_CONFIG` mappings in both `DeliverableCard.tsx` and `DeliverableListItem.tsx`. However, several related views need fixes:

| # | File | Lines | Change |
|---|------|-------|--------|
| 6 | `pages/DeliverableReview.tsx` | 297-303 | Add missing `pending`, `in_progress`, `payment_pending` to `statusColors` map |
| 7 | `pages/ProjectDetail.tsx` | 902-903 | Expand inline badge logic to cover all statuses (currently only `approved` and `awaiting_approval` have variants) |

### DeliverableReview Page: Empty State for No Files

When a client navigates to a `pending` or `in_progress` deliverable (via project overview), the DeliverableReview page needs to handle the case where no files exist:

| # | File | Change |
|---|------|--------|
| 8 | `pages/DeliverableReview.tsx` | Add empty state: "This deliverable is currently being worked on. Files will appear here once ready for review." |
| 9 | `components/deliverables/DeliverableFilesList.tsx` | Ensure empty state message is status-aware (don't say "no files uploaded" for `pending` — say "not started yet") |

### What NOT to Change

- **R2 presign file download filter** (`r2-presign.ts:163-178`) — Keep gated. Pending/in_progress deliverables have no files, so download access restrictions are correct.
- **Action buttons** (approve, reject, upload) — These are already permission-gated by `useDeliverablePermissions` hook. Clients can't approve a `pending` deliverable because `canApproveDeliverable()` checks for `awaiting_approval` status. No changes needed.
- **Email notification links** — These already link to specific deliverable IDs. The single-deliverable GET endpoint (`deliverables.ts:41-134`) does NOT filter by status, so direct links already work. No changes needed.

## Acceptance Criteria

- [x] Clients see all deliverables in their project, including `pending` and `in_progress`
- [x] Each deliverable shows a client-friendly status label with appropriate color
- [x] Clicking a `pending` or `in_progress` deliverable shows a meaningful empty state (not a broken page)
- [x] File download buttons are hidden/disabled for deliverables with no files
- [x] Admin views continue to work unchanged
- [x] `DeliverableReview.tsx` statusColors map covers all 8 statuses
- [x] `ProjectDetail.tsx` inline badge handles all statuses

## Known Pre-existing Issues (Out of Scope)

These exist today and are not introduced by this change:

1. **Status naming inconsistency:** `types.ts:70` uses `rejected` while `types/deliverable.types.ts:29` uses `revision_requested`. The admin `DeliverableCard.tsx` uses the `rejected` key; `DeliverableListItem.tsx` uses `revision_requested`. This should be fixed separately.

2. **No automated permission tests:** Permission logic has zero test coverage (documented in `.planning/codebase/CONCERNS.md:131-136`). Adding tests is recommended but not blocking for this feature.

3. **R2 presign key ownership validation gap:** Documented as CRITICAL in `PROD-04-RESEARCH.md`. This is a separate security issue — not made worse by this feature since we're not changing download access.

## Dependencies & Risks

- **Low risk:** This is a visibility expansion, not a permission change. Clients still can't perform actions they couldn't before (approve, upload, etc.).
- **No migration needed:** No database changes required.
- **Dual-portal sync:** Must update both Vite admin SPA and Next.js client portal consistently.

## References

- Todo: `.planning/todos/pending/2026-01-26-show-all-deliverables-to-clients.md`
- Deliverable permissions: `utils/deliverablePermissions.ts`
- API endpoint: `netlify/functions/deliverables.ts:207-211`
- Client portal types: `landing-page-new/src/lib/portal/types.ts:32-35`
- Client portal render: `landing-page-new/src/lib/portal/components/ProjectOverview.tsx:498-505`
- Status config pattern: `components/deliverables/DeliverableCard.tsx:53-97`
- PROD-04 research: `.planning/phases/PROD-04-deliverables-system/PROD-04-RESEARCH.md`
