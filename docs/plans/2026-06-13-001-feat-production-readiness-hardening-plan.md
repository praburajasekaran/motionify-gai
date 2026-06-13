---
title: "feat: Production Readiness Hardening"
type: feat
date: 2026-06-13
---

# feat: Production Readiness Hardening

## Summary

Make Motionify GAI production-ready by mapping the existing implementation to the strategy-critical journey, closing the gaps in enquiry-to-project and revision-metering workflows, and replacing smoke-style checks with deterministic production gates.

## Requirements

- R1. Public marketing quiz submissions preserve quiz selections, contact data, recommended video type, and project notes through inquiry creation and admin proposal creation.
- R2. Motionify admins can see whether an enquiry is ready for proposal work, and proposal creation carries deliverables, included revision count, revision description, pricing, and advance terms into the persisted proposal contract.
- R3. The proposal-to-project handoff continues to use completed advance payment as the activation boundary and never creates duplicate projects for the same proposal.
- R4. Proposal deliverables are treated as the v1 milestone unit unless support cannot sequence work under deliverables.
- R5. Support users can attach and sequence work under the chosen milestone unit, move deliverables to client review, and allow only authorized client primary contacts to approve or request revisions.
- R6. Revision quota is derived from the accepted proposal, displayed from project data, decremented server-side on valid revision requests, and never relies on client-only state.
- R7. When the included revision quota is exhausted, additional revisions have a server-backed request and purchase flow that increases project revision capacity only after a valid paid unlock.
- R8. Razorpay order creation, checkout verification, webhook processing, manual completion, and project activation remain signature-verified, idempotent, and auditable.
- R9. Critical journey tests prove quiz enquiry, proposal creation, payment activation, project handoff, deliverable review, revision quota exhaustion, and paid extra revision unlocks.
- R10. Shared contracts, mappers, and allowed-field lists are aligned so DB-to-API-to-frontend field drift cannot silently drop strategy-critical fields.
- R11. Production environment checks cover Netlify Function runtime variables, Razorpay test/live mode separation, webhook secrets, and deploy-time verification of core routes.

## Implementation Units

### U1. Create the Strategy Trace Map

- Requirements: R1, R4, R6, R9, R10.
- Files: `docs/production-readiness/core-journey-map.md`, `CONCEPTS.md`.
- Verification: `npm run verify:production-readiness` confirms the trace map and glossary entries exist.

### U2. Preserve Quiz Enquiry Data End-to-End

- Requirements: R1, R2, R9, R10.
- Files: `components/quiz/useQuiz.ts`, `components/quiz/ContactForm.tsx`, `lib/inquiries.ts`, `netlify/functions/inquiries.ts`, `shared/contracts/inquiry.contract.ts`, `pages/admin/InquiryDashboard.tsx`, `pages/admin/InquiryDetail.tsx`, `e2e/public-work.spec.ts`, `e2e/admin-functional.spec.ts`.
- Verification: the production readiness gate asserts the shared inquiry contract and mapper preserve quiz answers.

### U3. Re-Audit Proposal-to-Project Activation Contracts

- Requirements: R2, R3, R6, R8, R10.
- Files: `lib/proposals.ts`, `shared/contracts/proposal.contract.ts`, `netlify/functions/proposal-detail.ts`, `netlify/functions/projects.ts`, `netlify/functions/_shared/proposal-payment-helpers.ts`, `e2e/proposal-to-project-flow.spec.ts`.
- Verification: the production readiness gate asserts revision terms, handoff shape, payment helper, and proposal journey e2e coverage are present.

### U4. Make Deliverables the Explicit V1 Milestone Model

- Requirements: R4, R5, R9, R10.
- Files: `database/migrations/028_add_task_deliverable_link.sql`, `services/taskApi.ts`, `netlify/functions/tasks.ts`, `netlify/functions/_shared/schemas.ts`, `components/tasks/TaskCreateForm.tsx`, `components/tasks/TaskEditModal.tsx`, `components/deliverables/DeliverablesTab.tsx`, `e2e/deliverable-review.spec.ts`.
- Verification: task create/update/read paths preserve `deliverableId`, and the migration adds `tasks.deliverable_id`.

### U5. Implement Paid Additional Revision Unlocks

- Requirements: R6, R7, R8, R9, R10.
- Files: `components/deliverables/AdditionalRevisionRequestModal.tsx`, `components/admin/AdminRevisionRequestsPanel.tsx`, `netlify/functions/revision-requests.ts`, `netlify/functions/payments.ts`, `services/paymentApi.ts`, `e2e/deliverable-review.spec.ts`, `e2e/payment-flow.spec.ts`.
- Verification: the readiness gate asserts server-side revision quota handling and the additional revision endpoint surface exist.

### U6. Harden Payment and Environment Readiness

- Requirements: R3, R8, R11.
- Files: `netlify/functions/payments.ts`, `netlify/functions/razorpay-webhook.ts`, `netlify/functions/_shared/payment-verification.ts`, `netlify/functions/_shared/env.ts`, `scripts/verify-production-readiness.mjs`, `docs/production-readiness/payment-runbook.md`.
- Verification: the readiness gate asserts checkout and webhook signature verification plus payment secret coverage.

### U7. Replace Smoke Tests with Critical Journey Tests

- Requirements: R1, R3, R5, R6, R7, R8, R9.
- Files: `e2e/public-work.spec.ts`, `e2e/admin-functional.spec.ts`, `e2e/proposal-to-project-flow.spec.ts`, `e2e/payment-flow.spec.ts`, `e2e/deliverable-review.spec.ts`.
- Verification: critical specs are tracked and proposal journey assertions cover payment activation.

### U8. Add a Production Readiness Gate

- Requirements: R9, R10, R11.
- Files: `package.json`, `scripts/verify-production-readiness.mjs`, `docs/production-readiness/release-checklist.md`, `docs/production-readiness/core-journey-map.md`.
- Verification: `npm run verify:production-readiness` must pass before production release.
