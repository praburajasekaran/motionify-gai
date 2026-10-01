# Production Readiness Core Journey Map

This map ties Motionify Studio's production-critical journey to code, data, and verification coverage. It is intentionally concise: the goal is to make release review answerable from repo artifacts instead of memory.

## Verification Commands

| Gate | Command | Purpose |
|---|---|---|
| Build | `npm run build` | Confirms the Vite production bundle compiles |
| Runtime flip | `npm run verify:production-flip` | Confirms production publishes the single Vite runtime |
| SPA redirects | `npm run verify:spa-redirects` | Confirms direct-refresh routes do not depend on a catch-all asset fallback |
| Production readiness | `npm run verify:production-readiness` | Confirms strategy-critical files, docs, mappers, env coverage, and tests are present |
| E2E | `npm run test:e2e` | Runs the browser regression suite for portal and public journeys |
| Payment E2E | `npm run test:e2e:payment` | Runs payment-focused browser coverage |

## Inquiry to Proposal Setup

| Surface | Files |
|---|---|
| Public quiz and contact capture | `components/quiz/useQuiz.ts`, `components/quiz/ContactForm.tsx` |
| Frontend mapper/API client | `lib/inquiries.ts` |
| Shared contract | `shared/contracts/inquiry.contract.ts` |
| Server function | `netlify/functions/inquiries.ts` |
| Admin review surfaces | `pages/admin/InquiryDashboard.tsx`, `pages/admin/InquiryDetail.tsx`, `pages/admin/ProposalBuilder.tsx` |
| Coverage | `e2e/public-work.spec.ts`, `e2e/admin-functional.spec.ts` |

Production expectations:

- Quiz selections, contact fields, recommended video type, and project notes survive public POST and admin reads.
- Admin proposal creation starts from inquiry context instead of a generic contact payload.
- Invalid email or missing required fields fail through server validation.

## Proposal to Project Activation

| Surface | Files |
|---|---|
| Proposal mapper/API client | `lib/proposals.ts` |
| Shared contract | `shared/contracts/proposal.contract.ts` |
| Proposal detail and creation functions | `netlify/functions/proposal-detail.ts`, `netlify/functions/proposals.ts` |
| Project creation function | `netlify/functions/projects.ts` |
| Payment-owned handoff helper | `netlify/functions/_shared/proposal-payment-helpers.ts` |
| Browser coverage | `e2e/proposal-to-project-flow.spec.ts`, `e2e/payment-flow.spec.ts` |

Production expectations:

- Completed advance payment remains the activation boundary for accepted proposals.
- Duplicate activation returns the existing project rather than creating another one.
- Proposal deliverables, revisions included, revision description, inquiry ID, proposal ID, and client identity carry into the project contract.

## Deliverables as V1 Milestones

| Surface | Files |
|---|---|
| Deliverable model/UI | `types/deliverable.types.ts`, `components/deliverables/DeliverablesTab.tsx` |
| Task-to-deliverable schema | `database/migrations/028_add_task_deliverable_link.sql` |
| Task API client | `services/taskApi.ts` |
| Task server function and schemas | `netlify/functions/tasks.ts`, `netlify/functions/_shared/schemas.ts` |
| Task forms | `components/tasks/TaskCreateForm.tsx`, `components/tasks/TaskEditModal.tsx` |
| Coverage | `e2e/deliverable-review.spec.ts`, `e2e/proposal-to-project-flow.spec.ts` |

Production expectations:

- Proposal deliverables are the v1 milestone unit.
- Support can attach tasks to a deliverable, and that attachment survives create, update, API read, and refresh.
- Only authorized client primary contacts can approve deliverables or request revisions.

## Revision Governance and Paid Unlocks

| Surface | Files |
|---|---|
| Revision quota display/actions | `components/deliverables/RevisionQuotaIndicator.tsx`, `components/deliverables/DeliverableReviewActions.tsx` |
| Additional revision request UI | `components/deliverables/AdditionalRevisionRequestModal.tsx`, `components/admin/AdminRevisionRequestsPanel.tsx` |
| Server state machine | `netlify/functions/revision-requests.ts` |
| Payment functions | `netlify/functions/payments.ts`, `netlify/functions/razorpay-webhook.ts` |
| Coverage | `e2e/deliverable-review.spec.ts`, `e2e/payment-flow.spec.ts` |

Production expectations:

- Revision quota is derived from project data, not client-only state.
- Valid revision requests decrement quota server-side.
- Exhausted quota blocks unpaid revision submission and routes to a persisted additional revision request.
- Capacity increases only after an approved paid unlock path.

## Payment and Environment Readiness

| Surface | Files |
|---|---|
| Checkout verification | `netlify/functions/_shared/payment-verification.ts`, `netlify/functions/payments.ts` |
| Webhook verification | `netlify/functions/razorpay-webhook.ts` |
| Environment validation | `netlify/functions/_shared/env.ts`, `docs/production-readiness/payment-runbook.md` |
| Deploy checks | `scripts/verify-production-readiness.mjs`, `scripts/verify-production-flip.mjs`, `scripts/verify-spa-redirects.mjs` |
| Coverage | `netlify/functions/__tests__/*payment*.test.ts`, `e2e/payment-flow.spec.ts` |

Production expectations:

- Razorpay checkout and webhook completion are signature-verified.
- Checkout verification, webhook retries, and manual completion are idempotent.
- Production deploys name required Netlify Function env vars and test/live mode checks before flipping traffic.

## Release Owner Checklist

Before declaring production-ready:

- Run the verification commands at the top of this document.
- Confirm Netlify production env vars match `docs/production-readiness/payment-runbook.md`.
- Confirm the E2E suite includes assertions, not only screenshots or console notes, for the core path being released.
- Confirm any planned requirement intentionally deferred is listed in `docs/production-readiness/release-checklist.md`.
