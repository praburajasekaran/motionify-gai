---
title: "fix: Client missing approve/reject buttons after admin resubmits revised proposal"
type: fix
date: 2026-02-02
---

# fix: Client missing approve/reject buttons after admin resubmits revised proposal

## Overview

After a client requests a revision on a proposal and the super admin updates and resubmits it, the client sees the updated proposal content but the approve/reject/request-changes buttons do not appear. The buttons should reappear because the proposal status should be back to `sent`.

## Problem Statement

The proposal revision workflow is broken due to a **dual data store synchronization issue** combined with **field-mapping bugs**:

1. The admin SPA (`pages/admin/`) writes to **PostgreSQL** via Netlify functions
2. The client Next.js app (`landing-page-new/`) reads from **JSON file storage** via Next.js API routes
3. When the admin clicks "Resend to Client", it updates PostgreSQL but the JSON storage (which the client reads from) is never updated
4. Additionally, even in the PostgreSQL path, the `version` field is silently dropped due to missing field mappings

## Root Cause Analysis

### Bug 1: Dual Data Store — Admin writes to PostgreSQL, client reads from JSON

**Admin resend flow:**
- `pages/admin/ProposalDetail.tsx:464` → `updateProposal(id, { status: 'sent', version: N+1 })`
- `lib/proposals.ts:206` → sends PUT to `/.netlify/functions/proposal-detail/{id}` (PostgreSQL)

**Client read flow:**
- `landing-page-new/src/app/proposal/[proposalId]/page.tsx:97` → `fetchProposalById(proposalId)`
- `landing-page-new/src/lib/proposals.ts:86` → fetches from `/api/proposals/{id}` (JSON file storage)

The client never sees the updated status because it reads from a different data store.

### Bug 2: Version field silently dropped in admin's `updateProposal`

In `lib/proposals.ts:206-218`, the `updateProposal` function maps camelCase to snake_case for the Netlify API. But there is no mapping for `version`:

```typescript
// lib/proposals.ts:206-218 — version is NOT mapped
if (updates.description !== undefined) snakeCaseUpdates.description = updates.description;
if (updates.deliverables !== undefined) snakeCaseUpdates.deliverables = updates.deliverables;
// ... other fields ...
if (updates.status !== undefined) snakeCaseUpdates.status = updates.status;
// ❌ Missing: if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;
```

### Bug 3: `version` not in `allowedFields` in Netlify API

In `netlify/functions/proposal-detail.ts:68-72`, the PUT handler's `allowedFields` does not include `version`:

```typescript
const allowedFields = [
  'description', 'deliverables', 'currency', 'total_price',
  'advance_percentage', 'advance_amount', 'balance_amount',
  'status', 'feedback', 'revisions_included'
  // ❌ Missing: 'version'
];
```

### Bug 4: Inquiry status not updated back to `proposal_sent` on resend

When the admin resends, only the proposal status is changed to `sent`. The inquiry status remains `negotiating` and is never updated back to `proposal_sent`. This means the client's inquiry dashboard still shows the old status.

## Proposed Solution

Fix the data flow so the admin's "Resend to Client" action propagates correctly to the data store the client reads from. There are two approaches:

### Approach A: Sync to JSON storage on resend (Minimal fix)

After the admin resends, also update the JSON file storage that the client reads from. This maintains the current dual-store architecture but adds a sync step.

### Approach B: Make client read from PostgreSQL (Proper fix, recommended)

Update `landing-page-new/src/lib/proposals.ts` `fetchProposalById` to read from the Netlify function API (PostgreSQL) instead of the JSON file storage. This eliminates the dual-store problem entirely.

**Recommendation: Approach B** — it fixes the root cause and prevents future sync issues.

## Acceptance Criteria

- [x] After admin clicks "Resend to Client", the client sees the approve/reject/request-changes buttons on the proposal page
- [x] The proposal version is correctly incremented and displayed to the client (e.g., "Version 2")
- [x] The "This proposal has been updated based on your feedback" banner shows for version > 1
- [x] The inquiry status updates back to `proposal_sent` when the admin resends
- [x] The revision cycle can repeat: client requests changes again → admin revises again → client sees buttons again

## Technical Approach

### Phase 1: Fix the version field mapping (Bugs 2 & 3)

**File: `lib/proposals.ts:206-218`** — Add version to the snake_case mapping:

```typescript
if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;
```

**File: `netlify/functions/proposal-detail.ts:68-72`** — Add `version` to `allowedFields`:

```typescript
const allowedFields = [
  'description', 'deliverables', 'currency', 'total_price',
  'advance_percentage', 'advance_amount', 'balance_amount',
  'status', 'feedback', 'revisions_included', 'version'
];
```

### Phase 2: Fix the data store mismatch (Bug 1)

**File: `landing-page-new/src/lib/proposals.ts`** — Update `fetchProposalById` to read from the Netlify function backend (PostgreSQL) as a fallback when the JSON store doesn't have the latest data, OR switch entirely to PostgreSQL reads.

Option: Update the `fetchProposalById` to call the Netlify function API:

```typescript
// landing-page-new/src/lib/proposals.ts
export async function fetchProposalById(id: string): Promise<Proposal | null> {
  // Try Netlify function backend (source of truth)
  const response = await fetch(`${NETLIFY_API_URL}/proposal-detail/${id}`);
  if (response.ok) {
    const data = await response.json();
    return mapProposal(data);
  }

  // Fallback to JSON storage
  const localResponse = await fetch(`${API_BASE_URL}/${id}`);
  // ...existing logic
}
```

OR: Update the admin's `handleResend` to also write to the Next.js JSON storage:

**File: `pages/admin/ProposalDetail.tsx:440-477`** — After updating via Netlify function, also PUT to the Next.js API:

```typescript
// After updating PostgreSQL, sync to JSON storage
await fetch(`${NEXT_APP_URL}/api/proposals/${proposal.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'sent',
    version: (proposal.version || 1) + 1,
  }),
});
```

### Phase 3: Fix inquiry status on resend (Bug 4)

**File: `pages/admin/ProposalDetail.tsx:440-477`** — After updating the proposal, also update the inquiry status back to `proposal_sent`:

```typescript
// In handleResend, after updating proposal:
await updateInquiryStatus(proposal.inquiryId, 'proposal_sent');
```

### Phase 4: Clear stale client-side fields on resend

When the admin resends, clear the `feedback`, `acceptedAt`, and `rejectedAt` fields so the proposal is in a clean state for the client:

```typescript
const updatedProposal = await updateProposal(proposal.id, {
  status: 'sent',
  version: (proposal.version || 1) + 1,
  feedback: null,  // Clear previous feedback
});
```

## Files to Modify

| File | Change |
|------|--------|
| `lib/proposals.ts:206-218` | Add `version` to snake_case mapping in `updateProposal` |
| `netlify/functions/proposal-detail.ts:68-72` | Add `version` to `allowedFields` array |
| `pages/admin/ProposalDetail.tsx:440-477` | Update `handleResend` to sync to JSON storage + update inquiry status |
| `landing-page-new/src/lib/proposals.ts` | Update `fetchProposalById` to read from PostgreSQL backend |

## Dependencies & Risks

- **Risk: Dual data store divergence** — The root architectural issue is having two separate data stores. This fix patches the immediate problem but the long-term solution is to consolidate to a single source of truth (PostgreSQL).
- **Risk: Cross-origin calls** — The admin SPA and Next.js app may be on different origins. Ensure CORS headers allow the sync calls.
- **Gotcha from institutional learnings** — Per `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md`: use `!== undefined` checks (not truthy checks) when mapping fields, to allow clearing fields to `null`.

## References

- Admin proposal detail: `pages/admin/ProposalDetail.tsx:440-477`
- Admin updateProposal lib: `lib/proposals.ts:206-218`
- Netlify proposal API: `netlify/functions/proposal-detail.ts:68-72`
- Client proposal page: `landing-page-new/src/app/proposal/[proposalId]/page.tsx`
- Client ProposalActions: `landing-page-new/src/components/proposal/ProposalActions.tsx:27`
- Client proposals lib: `landing-page-new/src/lib/proposals.ts:86`
- Next.js proposal API route: `landing-page-new/src/app/api/proposals/[id]/route.ts`
- Institutional learning (field mapping): `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md`
- Institutional learning (state transitions): `docs/solutions/logic-errors/missing-deliverable-send-for-review-workflow.md`
