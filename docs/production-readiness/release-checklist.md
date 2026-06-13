# Production Readiness Release Checklist

Use this checklist before enabling or announcing a production release that changes inquiry, proposal, payment, project, deliverable, or revision behavior.

## Automated Gates

- [ ] `npm run build`
- [ ] `npm run verify:production-readiness`
- [ ] `npm run verify:production-flip`
- [ ] `npm run verify:spa-redirects`
- [ ] `npm run test:e2e`
- [ ] `npm run test:e2e:payment`

## Journey Checks

| Strategy track | Release question | Evidence |
|---|---|---|
| Inquiry to proposal | Does a public quiz inquiry preserve contact data, quiz selections, recommended video type, and project notes? | `docs/production-readiness/core-journey-map.md`, `e2e/public-work.spec.ts`, `e2e/admin-functional.spec.ts` |
| Proposal to project | Does completed advance payment remain the only project activation boundary? | `netlify/functions/_shared/proposal-payment-helpers.ts`, `e2e/proposal-to-project-flow.spec.ts` |
| Deliverables as milestones | Can support attach task work to deliverables and keep that relationship after refresh? | `database/migrations/028_add_task_deliverable_link.sql`, `services/taskApi.ts`, `netlify/functions/tasks.ts` |
| Revision governance | Is revision quota decremented by server logic and blocked when exhausted? | `netlify/functions/revision-requests.ts`, `components/deliverables/RevisionQuotaIndicator.tsx` |
| Paid extra revisions | Does extra capacity come from a persisted request and paid unlock path? | `components/deliverables/AdditionalRevisionRequestModal.tsx`, `components/admin/AdminRevisionRequestsPanel.tsx`, `netlify/functions/revision-requests.ts` |
| Payment readiness | Are checkout verification, webhook verification, and manual completion signature-verified or admin-gated? | `docs/production-readiness/payment-runbook.md`, `netlify/functions/payments.ts`, `netlify/functions/razorpay-webhook.ts` |

## Environment Checks

- [ ] `APP_URL` is `https://motionify.studio` in production.
- [ ] `DATABASE_URL` is the production pooled connection and not localhost.
- [ ] `JWT_SECRET` is production-specific and at least 32 characters.
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are from the same Razorpay mode.
- [ ] Razorpay webhook endpoint points at the production Netlify Function URL.
- [ ] R2 variables point at the production bucket: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`.
- [ ] `RESEND_API_KEY` and sender identity are production-approved.
- [ ] `SENTRY_DSN` is configured when error monitoring is part of the release gate.

## Manual Go/No-Go

- [ ] A support user can open an inquiry, inspect quiz context, and start proposal creation.
- [ ] A client can reach the payment handoff from a sent proposal without direct unpaid acceptance.
- [ ] A paid proposal opens or creates exactly one project.
- [ ] A support user can create or update a task attached to a deliverable.
- [ ] A client primary contact can approve a deliverable or request a revision, while non-primary contacts are blocked.
- [ ] Exhausted revision quota routes to additional revision request instead of silently allowing unpaid work.
- [ ] A payment retry or webhook retry does not double-activate a project or double-increase revision capacity.

## Deferred Items

Any skipped requirement from `docs/plans/2026-06-13-001-feat-production-readiness-hardening-plan.md` must be listed here with an owner and explicit release risk before production approval.
