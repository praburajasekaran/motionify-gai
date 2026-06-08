# Plan: Completed Payment Supersedes Pending History

> Created: 2026-06-08
> Status: completed
> Trigger: User reported that completed payments should not keep showing historical pending payment rows in the admin Payments table.

## Goal & Success Criteria
- **Goal**: Show only the current canonical payment state for a proposal/project payable in the admin Payments table, so completed payments suppress older pending attempts.
- **Done when**: A completed advance payment for the same proposal/payment type or project/payment type appears once as `completed`, and older pending attempts no longer appear as actionable pending rows.
- **Non-goals**: Delete historical payment rows, change Razorpay order creation, change client payment handoff behavior, or remove audit history from the database.

## Current State
- `pages/admin/Payments.tsx` renders every payment returned by `fetchAllPayments`; pending rows show the `Remind` action.
- `services/paymentApi.ts` calls `/api/payments/admin` and normalizes the backend response without grouping client-side.
- `netlify/functions/payments.ts` builds the admin query with `ROW_NUMBER()` and currently ranks one canonical row per `proposal_id + payment_type` when `proposal_id` exists.
- Rows without `proposal_id` fall back to `payment.id` as the partition key, so multiple pending records can survive for the same project/payment type even when a completed record exists.
- `netlify/functions/__tests__/payments-admin-query.test.ts` already covers canonical admin payment query structure.
- Relevant memory: payment completion and project activation must stay transaction-bound; this task only changes list/read behavior, not completion writes.

## Task Breakdown

| # | Task | Files | Size | Depends On |
|---|------|-------|------|------------|
| 1 | Extend canonical payment partitioning to project-linked rows without a proposal | `netlify/functions/payments.ts` | S | - |
| 2 | Add query tests for project fallback grouping and completed-over-pending precedence | `netlify/functions/__tests__/payments-admin-query.test.ts` | S | T1 |
| 3 | Run focused tests and a build/type sanity check if available | package scripts, test command | S | T1, T2 |

## Technical Design
- **Approach**: Keep the canonical filtering in the backend admin query so summary cards and row actions use the same source of truth. Update the `ROW_NUMBER()` partition key to use `proposal_id + payment_type` first, then `project_id + payment_type`, then `payment.id` only for truly unlinked payments. Preserve the existing status precedence where `completed` ranks before `processing`, `pending`, `refunded`, and `failed`.
- **Alternatives rejected**: Hiding pending rows in `Payments.tsx` would make the visible table look right while summary totals could still count obsolete pending records. Deleting or mutating pending history would destroy useful audit data and is unnecessary.
- **Key decisions**: Historical pending rows remain in `payments`; the admin list is a canonical operational view, not a raw audit log.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Collapsing unrelated unlinked payments | L | M | Only group by `project_id` when present; otherwise keep `payment.id` fallback. |
| Status filter behavior surprises users | M | M | Keep ranking before filtering so `status=pending` does not show a pending record that has been superseded by a completed canonical payment. |
| Summary numbers change | M | M | Treat this as intended: summary cards should reflect current operational payment state, not stale attempts. |

## Verification
- Run the focused Node test for `netlify/functions/__tests__/payments-admin-query.test.ts`.
- Run `npm run build` if dependencies/environment permit.
- Optionally verify `/portal/admin/payments` against the screenshot scenario: the completed row remains, the older pending rows for the same payable disappear, and `Remind` is unavailable for that completed payable.
- Rollback plan: revert the query partition-key change and the matching tests.
