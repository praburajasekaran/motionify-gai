---
title: "fix: Payment-Gated Proposal Acceptance"
type: fix
date: 2026-03-14
---

# fix: Payment-Gated Proposal Acceptance

## Overview

Proposals are currently marked `accepted` the instant a client clicks the "Accept" button — before any payment is made. Clients exploit this by accepting proposals and never paying, leaving the system with stale "accepted but unpaid" state and no project.

This fix gates proposal acceptance behind a successful Razorpay advance payment, mirroring the Fiverr model: **payment IS acceptance**. The proposal only moves to `accepted` after payment is verified on the backend.

---

## Problem Statement

**Current broken flow:**
```
Client clicks "Accept"
  → PATCH /proposal-detail/:id { status: 'accepted' }   ← immediate DB write, no payment check
  → proposal.status = 'accepted', inquiry.status = 'accepted'
  → Redirect to /payment/:proposalId  (client may close tab and never pay)
  → Project only created IF payment eventually happens
```

**Result:** The system shows a proposal as `accepted` even when no project exists and no payment was made. Admins have no reliable signal distinguishing "accepted and paid" from "accepted but abandoned."

---

## Proposed Solution

1. **Frontend:** Change "Accept" button to "Accept & Pay". On click, redirect directly to `/payment/:proposalId` with **no** status change.
2. **Backend — payments:** Add proposal acceptance logic (set `status = 'accepted'`, `accepted_at`) inside the payment success path: `verify`, `manual-complete`, and the Razorpay webhook `payment.captured` handler.
3. **Backend — shared helper:** Extract the proposal-acceptance + project-creation sequence into a single reusable function to eliminate the current copy-paste duplication across three callers.
4. **Backend — guards:** Reject any direct PATCH/PUT request that tries to set `status: 'accepted'` on a proposal unless a completed advance payment already exists.
5. **Security fix:** Add admin role check to `manual-complete` (currently callable by any authenticated user including clients).

---

## Technical Approach

### Architecture

```
BEFORE:
Client → ProposalActions.tsx
           → updateProposalStatus('accepted')   [PATCH /proposal-detail/:id]
           → updateInquiryStatus('accepted')    [PATCH /inquiries/:id]
           → router.push('/payment/:proposalId')

AFTER:
Client → ProposalActions.tsx
           → router.push('/payment/:proposalId')   [no status changes]
           ↓
     /payment/:proposalId (Razorpay)
           ↓
     POST /payments/verify
     POST /payments/manual-complete   (admin offline)
     Webhook: payment.captured        (server fallback)
           ↓
     completePaymentAndAcceptProposal()  [shared helper]
           → UPDATE proposals SET status='accepted', accepted_at=NOW()
           → UPDATE inquiries SET status='converted'   (skips 'accepted' transient state)
           → INSERT projects (idempotent — check first)
           → INSERT deliverables
           → UPDATE payments SET project_id=...
```

### Idempotency

The shared helper must guard against duplicate execution (verify + webhook racing):

```sql
-- Check before creating project
SELECT id FROM projects WHERE proposal_id = $1
```

If a project already exists, skip INSERT and return existing project ID. All three callers (`verify`, webhook, `manual-complete`) go through this same guard.

### Inquiry Status

The `inquiry.status = 'accepted'` transient state is intentionally eliminated. Under the new flow, inquiries transition directly from `proposal_sent` → `converted` when payment succeeds. This is correct: in the old flow, `'accepted'` was meaningless because it didn't guarantee payment. Any admin queries filtering on `inquiry.status = 'accepted'` will return zero results for new conversions after this fix ships.

---

## Implementation Phases

### Phase 1: Extract Shared Helper + Extend Webhook (Critical Path)

**File: `netlify/functions/payments.ts`**

Extract the project-creation block (currently duplicated verbatim between `verify` ~lines 335–447 and `manual-complete` ~lines 502–615) into a shared async function:

```typescript
// netlify/functions/payments.ts (new helper function)
async function completePaymentAndAcceptProposal(
  client: PoolClient,
  paymentId: string,
  proposalId: string
): Promise<{ projectId: string }> {
  // 1. Fetch proposal + inquiry
  const proposalResult = await client.query(
    `SELECT p.id, p.total_price, p.deliverables, p.advance_percentage,
            p.revisions_included, i.id as inquiry_id, i.client_user_id
     FROM proposals p
     JOIN inquiries i ON i.id = p.inquiry_id
     WHERE p.id = $1`,
    [proposalId]
  );
  const proposal = proposalResult.rows[0];

  // 2. Set proposal to accepted (idempotent)
  await client.query(
    `UPDATE proposals
     SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status != 'accepted'`,
    [proposalId]
  );

  // 3. Check for existing project (idempotency guard)
  const existingProject = await client.query(
    `SELECT id FROM projects WHERE proposal_id = $1`,
    [proposalId]
  );
  if (existingProject.rows.length > 0) {
    const projectId = existingProject.rows[0].id;
    // Link payment if not already linked
    await client.query(
      `UPDATE payments SET project_id = $1 WHERE id = $2 AND project_id IS NULL`,
      [projectId, paymentId]
    );
    return { projectId };
  }

  // 4. Generate project number
  const projectNumberResult = await client.query(
    `SELECT COALESCE(MAX(CAST(SPLIT_PART(project_number, '-', 3) AS INTEGER)), 0) + 1 as next_num
     FROM projects WHERE project_number LIKE $1`,
    [`PROJ-${new Date().getFullYear()}-%`]
  );
  const projectNumber = `PROJ-${new Date().getFullYear()}-${String(projectNumberResult.rows[0].next_num).padStart(3, '0')}`;

  // 5. Create project
  const projectResult = await client.query(
    `INSERT INTO projects (project_number, inquiry_id, proposal_id, client_user_id, status, total_revisions_allowed)
     VALUES ($1, $2, $3, $4, 'active', $5)
     RETURNING id`,
    [projectNumber, proposal.inquiry_id, proposalId, proposal.client_user_id, proposal.revisions_included ?? 2]
  );
  const projectId = projectResult.rows[0].id;

  // 6. Create deliverables
  const deliverables = proposal.deliverables ?? [];
  for (const deliverable of deliverables) {
    await client.query(
      `INSERT INTO deliverables (id, project_id, name, description, estimated_completion_week, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (id) DO NOTHING`,
      [deliverable.id, projectId, deliverable.name, deliverable.description, deliverable.estimated_completion_week]
    );
  }

  // 7. Mark inquiry converted
  await client.query(
    `UPDATE inquiries SET status = 'converted', updated_at = NOW() WHERE id = $1`,
    [proposal.inquiry_id]
  );

  // 8. Link payment to project
  await client.query(
    `UPDATE payments SET project_id = $1 WHERE id = $2`,
    [projectId, paymentId]
  );

  return { projectId };
}
```

Replace the copy-pasted project creation blocks in both `verify` and `manual-complete` with calls to this helper.

**File: `netlify/functions/razorpay-webhook.ts`**

Extend `handlePaymentCaptured` to call the same helper:

```typescript
// netlify/functions/razorpay-webhook.ts — inside handlePaymentCaptured
// After updating payment status to 'completed':
if (payment.payment_type === 'advance') {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    await completePaymentAndAcceptProposal(dbClient, payment.id, payment.proposal_id);
    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('Webhook: failed to accept proposal/create project:', err);
  } finally {
    dbClient.release();
  }
}
```

> ⚠️ The helper can be co-located in `payments.ts` and imported, OR it can live in `_shared/` if preferred. Since `razorpay-webhook.ts` currently imports from `_shared/`, putting it in `_shared/proposal-payment-helpers.ts` is cleanest.

---

### Phase 2: Backend Guards + Security Fixes

**File: `netlify/functions/proposal-detail.ts`** (~lines 138–204)

Add payment check before allowing `status: 'accepted'` in the PATCH handler:

```typescript
// netlify/functions/proposal-detail.ts — inside PATCH handler, before the UPDATE
if (status === 'accepted') {
  const paymentCheck = await client.query(
    `SELECT id FROM payments
     WHERE proposal_id = $1 AND payment_type = 'advance' AND status = 'completed'
     LIMIT 1`,
    [id]
  );
  if (paymentCheck.rows.length === 0) {
    return {
      statusCode: 402,
      body: JSON.stringify({
        error: 'Payment required',
        message: 'Proposal can only be accepted after advance payment is completed.'
      })
    };
  }
}
```

Apply same guard to `netlify/functions/proposals.ts` PATCH handler (~lines 348–429) and PUT handler (~lines 224–345).

**File: `netlify/functions/payments.ts`** — `manual-complete` action

Add admin role check (currently missing, any authenticated user can call this):

```typescript
// netlify/functions/payments.ts — inside manual-complete action, after auth check
const { role } = req.user;
if (!['super_admin', 'support'].includes(role)) {
  return {
    statusCode: 403,
    body: JSON.stringify({ error: 'Admin access required' })
  };
}
```

---

### Phase 3: Frontend UI Change

**File: `landing-page-new/src/components/proposal/ProposalActions.tsx`**

Change the `handleAccept` function:

```typescript
// BEFORE (broken):
const handleAccept = async () => {
  setLoading(true);
  await updateProposalStatus(proposal.id, 'accepted');    // ← REMOVE
  await updateInquiryStatus(inquiry.id, 'accepted');      // ← REMOVE
  router.push(`/payment/${proposal.id}`);
  setLoading(false);
};

// AFTER (fixed):
const handleAccept = () => {
  router.push(`/payment/${proposal.id}`);
};
```

Change button label from `"Accept Proposal"` (or whatever current label is) to `"Accept & Pay"`:

```tsx
// Accept button
<Button onClick={handleAccept} variant="default">
  Accept &amp; Pay
</Button>
```

---

## Acceptance Criteria

### Functional

- [ ] Clicking "Accept & Pay" on the proposal page redirects to the payment page without changing `proposals.status`
- [ ] After successful Razorpay payment and `verify` call: `proposals.status = 'accepted'`, `accepted_at` is set, project is created
- [ ] After `razorpay-webhook.ts` `payment.captured` event fires (without prior `verify`): same outcome
- [ ] After admin `manual-complete`: same outcome
- [ ] Direct PATCH to `/proposal-detail/:id` or `/proposals/:id` with `{ status: 'accepted' }` and no completed payment returns HTTP 402
- [ ] Direct PATCH to `/proposal-detail/:id` or `/proposals/:id` with `{ status: 'accepted' }` when a completed payment EXISTS returns 200 (for admin use cases)
- [ ] `manual-complete` returns 403 for non-admin roles
- [ ] Calling `verify` and then having the webhook fire for the same payment does not create a duplicate project
- [ ] Proposal that is already `accepted` shows "You have already responded" state on the proposal page (no change to existing logic)

### Non-Functional

- [ ] All DB writes in the helper are wrapped in a transaction
- [ ] Helper is idempotent: calling it twice for the same proposal produces the same result (no duplicate projects, no errors)

### Edge Cases

- [ ] Payment failure: proposal stays `sent`, client can retry
- [ ] Client navigates back to proposal page after paying: sees "already responded" state
- [ ] Client navigates back to payment page after paying: proposal is already `accepted`, page should not allow re-purchase (existing payment page logic — verify this handles it)
- [ ] Admin changes proposal status back to `sent` (re-send) after rejection: this is NOT blocked by the guard (guard only fires when target status is `'accepted'`)

---

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| verify + webhook race creating duplicate projects | High | Idempotency guard in shared helper (check for existing project before INSERT) |
| Existing `accepted` proposals with no payment | Medium | Guard allows PATCH to `accepted` if completed payment exists — legacy records have no payment so admin cannot set back to `accepted` without a payment. Admin still has `manual-complete` path. |
| `inquiry.status = 'accepted'` skipped as transient state | Low | Intentional — document in PR. Admin queries filtering this state will show zero new records post-deploy. |
| Client auth on payment page | High | Client must be authenticated to hit `create-order`. Verify the magic-link / auth flow on `/proposal/:proposalId` page before shipping. |

---

## Files to Modify

| File | Change |
|------|--------|
| `netlify/functions/_shared/proposal-payment-helpers.ts` | **NEW** — shared `completePaymentAndAcceptProposal()` helper |
| `netlify/functions/payments.ts` | Replace copy-pasted project creation in `verify` + `manual-complete` with helper call; add admin role guard to `manual-complete` |
| `netlify/functions/razorpay-webhook.ts` | Call helper inside `handlePaymentCaptured` for `advance` payments |
| `netlify/functions/proposal-detail.ts` | Add 402 guard in PATCH handler when `status === 'accepted'` |
| `netlify/functions/proposals.ts` | Add 402 guard in PATCH and PUT handlers when `status === 'accepted'` |
| `landing-page-new/src/components/proposal/ProposalActions.tsx` | Remove acceptance API calls from `handleAccept`; rename button to "Accept & Pay" |

---

## Out of Scope

- Adding `payment_pending` intermediate status
- Changing balance payment flow
- Adding proposal expiry/versioning
- Post-acceptance UX (linking to project from proposal page)
- `create-order` idempotency (deduplicating pending payment records)
- Razorpay signature verification on `verify` endpoint (separate security hardening task)

---

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-03-14-payment-gated-proposal-acceptance-brainstorm.md`
- ProposalActions component: `landing-page-new/src/components/proposal/ProposalActions.tsx:30–70`
- Proposal PATCH handler (public): `netlify/functions/proposal-detail.ts:138–204`
- Proposal PATCH/PUT handler (auth): `netlify/functions/proposals.ts:224–429`
- Payments verify + manual-complete: `netlify/functions/payments.ts:307–631`
- Webhook handler: `netlify/functions/razorpay-webhook.ts:121–208`
- Institutional learning (API response safety): `docs/solutions/runtime-errors/payments-crash-response-format-mismatch-Payments-20260226.md`
