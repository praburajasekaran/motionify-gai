---
title: "Client missing approve/reject buttons after admin resends revised proposal"
date: 2026-02-02
category: integration-issues
module: proposals
tags:
  - dual-data-store
  - data-sync
  - postgresql
  - json-storage
  - snake-case-mapping
  - auth-middleware
  - proposal-resend
  - client-portal
symptoms:
  - Client sees no approve/reject buttons on revised proposal
  - Proposal version stuck at 1 after resend
  - Client gets 401 on shared proposal link
  - Inquiry status remains negotiating after admin resends
  - PostgreSQL has updated data but client sees stale proposal
files_modified:
  - lib/proposals.ts
  - netlify/functions/proposal-detail.ts
  - landing-page-new/src/lib/proposals.ts
  - pages/admin/ProposalDetail.tsx
severity: critical
---

## Problem

After a client requests a revision on a proposal and the super admin updates and resubmits it, the client sees the updated proposal content but the approve/reject/request-changes buttons do not appear. The buttons only render when `proposal.status === 'sent'`, but the client was reading stale data.

## Root Causes

Five bugs combined to cause this:

### 1. Dual data store not synced on resend

The admin SPA writes to **PostgreSQL** via Netlify functions. The client Next.js app reads from **JSON file storage** via Next.js API routes. When the admin clicks "Resend to Client", PostgreSQL is updated but JSON storage is not.

- Admin resend: `pages/admin/ProposalDetail.tsx` -> `lib/proposals.ts:updateProposal()` -> `PUT /.netlify/functions/proposal-detail/{id}` (PostgreSQL)
- Client read: `landing-page-new/src/lib/proposals.ts:fetchProposalById()` -> `GET /api/proposals/{id}` (JSON file)

### 2. Version field missing from snake_case mapping

`lib/proposals.ts:updateProposal()` maps camelCase fields to snake_case for the Netlify API, but `version` had no mapping. It was silently dropped.

### 3. Version not in allowedFields

`netlify/functions/proposal-detail.ts` PUT handler has an `allowedFields` whitelist. `version` was not included, so even if sent it would be ignored.

### 4. Inquiry status not reset on resend

When admin resends, only the proposal status changes to `sent`. The inquiry status stayed at `negotiating` instead of returning to `proposal_sent`.

### 5. Auth middleware blocking public GET

The `proposal-detail` Netlify function used `withAuth()` globally, returning 401 for unauthenticated clients viewing proposals via shared links.

## Solution

### Fix 1: Client reads from PostgreSQL first

Updated `landing-page-new/src/lib/proposals.ts:fetchProposalById()` to try the Netlify function backend (PostgreSQL) first, falling back to JSON storage:

```typescript
export async function fetchProposalById(id: string): Promise<Proposal | null> {
  // Try Netlify function backend (PostgreSQL — source of truth) first
  try {
    const netlifyBase = getApiBase();
    const response = await fetch(`${netlifyBase}/proposal-detail/${id}`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return mapProposal(data);
    }
  } catch (error) {
    console.error('Error fetching proposal from backend, falling back to local:', error);
  }

  // Fallback to local JSON storage
  // ...existing logic
}
```

Also added sync-back to PostgreSQL in `updateProposalStatus()` via PATCH.

### Fix 2: Add version to field mapping and allowedFields

In `lib/proposals.ts`:
```typescript
if (updates.version !== undefined) snakeCaseUpdates.version = updates.version;
```

In `netlify/functions/proposal-detail.ts`:
```typescript
const allowedFields = [
  'description', 'deliverables', 'currency', 'total_price',
  'advance_percentage', 'advance_amount', 'balance_amount',
  'status', 'feedback', 'revisions_included', 'version'  // Added
];
```

### Fix 3: Update inquiry status on resend

In `pages/admin/ProposalDetail.tsx:handleResend()`:
```typescript
if (proposal.inquiryId) {
  await import('../../lib/inquiries').then(({ updateInquiryStatus }) =>
    updateInquiryStatus(proposal.inquiryId, 'proposal_sent')
  );
}
```

Also clears stale feedback: `feedback: ''` in the update payload.

### Fix 4: Make proposal GET public

Changed `netlify/functions/proposal-detail.ts` from `withAuth()` in compose chain to conditional auth inside the handler:

```typescript
export const handler = compose(
  withCORS(['GET', 'PUT', 'PATCH']),
  withRateLimit(RATE_LIMITS.api, 'proposal_detail')
)(async (event: NetlifyEvent) => {
  // GET is public (clients view proposals via shared links)
  // PUT and PATCH require authentication
  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    const auth = await requireAuthFromCookie(event);
    if (!auth.authorized) {
      return { statusCode: auth.statusCode || 401, ... };
    }
  }
  // ...
});
```

## Prevention

1. **Use `!== undefined` checks** (not truthy) when mapping fields — allows clearing fields to `null` or empty string. See also: `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md`

2. **When adding new fields to a data model**, check all three layers: TypeScript type, snake_case mapping function, and backend `allowedFields` whitelist.

3. **Dual data store is an anti-pattern** — the long-term fix is consolidating `landing-page-new` to only serve landing page and quiz, moving all API/portal functionality to the main portal (5173). See `.planning/todos/pending/2026-02-02-consolidate-landing-page-into-portal.md`.

4. **Auth middleware pattern**: When an endpoint needs mixed auth (some methods public, others authenticated), use conditional auth inside the handler instead of `withAuth()` in the compose chain. Follow the pattern in `netlify/functions/inquiries.ts`.

## Related

- `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — Same class of bug (field mapping drops data)
- `docs/solutions/logic-errors/missing-deliverable-send-for-review-workflow.md` — Similar state transition gap
- `.planning/todos/pending/2026-02-02-consolidate-landing-page-into-portal.md` — Architectural todo to eliminate dual data store
