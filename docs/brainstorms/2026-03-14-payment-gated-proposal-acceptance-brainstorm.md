# Payment-Gated Proposal Acceptance

**Date:** 2026-03-14
**Status:** Ready for planning

---

## What We're Building

Prevent proposals from being marked as "accepted" unless the client has successfully completed the advance payment. Currently, clients can click "Accept" on a proposal and the system marks it accepted — but no payment is required. Some clients exploit this by accepting and then closing without paying, leaving the system in a misleading "accepted but unpaid" state.

**Goal:** Mirror the Fiverr model where acceptance and payment are the same action. The proposal only becomes `accepted` after a successful advance payment.

---

## Why This Approach

**Selected approach: Accept & Pay (single-action)**

- The "Accept" button on the proposal page becomes "Accept & Pay"
- Clicking it redirects directly to the `/payment/:proposalId` payment page
- No intermediate status change occurs on click — proposal stays `sent`
- Proposal status is set to `accepted` only after payment is successfully verified
- Backend blocks direct status updates to `accepted` unless a completed payment exists

This is simpler than adding a new `payment_pending` status (no schema migration, no new status to handle in UI), and it matches how the existing payment→project flow already works.

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| How client accepts | "Accept & Pay" button → redirect to payment | Clearest UX, no ambiguous intermediate state |
| Where proposal is marked accepted | After payment verified (verify endpoint + webhook + manual-complete) | Single source of truth: payment success = acceptance |
| Backend guard | Block `status: 'accepted'` PATCH unless completed payment exists | Defense-in-depth so direct API calls can't bypass UI |
| Admin exception | Admin can still use `manual-complete` to accept + mark paid | Offline/cash payments need admin override path |

---

## Current Flow (Broken)

```
Client views proposal
  → clicks "Accept"
  → PATCH proposal-detail/:id { status: 'accepted' }  ← BUG: no payment check
  → Proposal = accepted ✓
  → Client goes to /payment/:proposalId (optional — client can skip this)
  → Project only created if payment happens
```

## New Flow (Fixed)

```
Client views proposal
  → clicks "Accept & Pay"
  → Redirected to /payment/:proposalId  (no status change yet)
  → Client completes Razorpay payment
  → /payments/verify endpoint:
      - Verifies payment signature
      - Sets payment status = 'completed'
      - Sets proposal status = 'accepted'  ← NEW
      - Creates project (already exists)
  → (Also covered by razorpay-webhook payment.captured event)
  → (Also covered by admin /payments/manual-complete for offline payments)
```

---

## What Needs to Change

### 1. Client-Facing Proposal Page UI
- **File:** `pages/client/` (proposal detail/view page)
- Change "Accept" button label to "Accept & Pay"
- Change button action: instead of calling `updateProposalStatus('accepted')`, navigate to `/payment/:proposalId`
- Remove or disable the direct acceptance API call from the client

### 2. Set Proposal `accepted` on Payment Success (3 places)
- **`netlify/functions/payments.ts` — `verify` action:** After marking payment `completed` and before/after project creation, set `proposal.status = 'accepted'` and `accepted_at = NOW()`
- **`netlify/functions/payments.ts` — `manual-complete` action:** Same as above (admin path for cash/offline payments)
- **`netlify/functions/razorpay-webhook.ts` — `payment.captured` event:** Set proposal to accepted as the async source of truth

### 3. Backend Guard on Proposal Status Updates
- **`netlify/functions/proposal-detail.ts`** — when PATCH sets `status: 'accepted'`, check for a completed advance payment on this proposal. If none exists, return 400/403.
- **`netlify/functions/proposals.ts`** — same guard for authenticated updates

---

## Open Questions

1. **What if payment fails mid-flow?** Client is already on the payment page. If they abandon or payment fails, proposal stays `sent` — they can try again. This is correct behavior.

2. **What if client wants to go back and accept later?** The "Accept & Pay" button is always available as long as proposal is `sent`. No blocker.

3. **What does the proposal page show to a client who already paid?** The existing logic should handle this — once `status = 'accepted'`, the accept button should not be shown (need to verify current UI behavior).

4. **Balance payment?** This feature only affects advance payments. Balance payments are already tied to an existing project (which only exists after advance payment).

5. **Should the "Reject" and "Request Changes" buttons still work directly?** Yes — only "Accept" needs to go through payment. Rejection and change requests have no financial consequence.

---

## Files to Modify

| File | Change |
|------|--------|
| `pages/client/[ProposalDetail].tsx` | Change Accept button → "Accept & Pay", redirect to payment |
| `netlify/functions/payments.ts` | Set proposal `accepted` in `verify` and `manual-complete` actions |
| `netlify/functions/razorpay-webhook.ts` | Set proposal `accepted` in `payment.captured` handler |
| `netlify/functions/proposal-detail.ts` | Add guard: block `accepted` status unless payment completed |
| `netlify/functions/proposals.ts` | Add same guard for authenticated proposal updates |

---

## Out of Scope

- Adding `payment_pending` status (adds DB migration complexity, not needed)
- Changing balance payment flow (not affected)
- Changing admin's ability to manually manage proposals (admin retains full control via manual-complete)
