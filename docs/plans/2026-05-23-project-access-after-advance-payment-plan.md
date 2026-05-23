# Plan: Project Access After Advance Payment

> Created: 2026-05-23
> Status: completed
> Trigger: User requested implementation of the ADR-backed proposal payment to project access flow.

## Goal & Success Criteria

- **Goal**: Make a successful advance payment activate the project and give the Primary Client Contact a durable Project Access Link to the specific project.
- **Done when**: `/payments/verify`, webhook capture, and admin manual-complete all use the same idempotent activation path; payment success email links to a project access entry route; anonymous clients can request a magic link with email prefilled and return to the project after login; already-authenticated users land on the project or see an account mismatch.
- **Non-goals**: Changing Razorpay provider behavior, extending magic-link token lifetimes, building a full admin activation-failure dashboard in this slice.

## Current State

- `netlify/functions/_shared/proposal-payment-helpers.ts` already accepts proposals, creates projects, creates deliverables, links payment, and returns a project ID, but it does not return client email/access-link context.
- `netlify/functions/payments.ts` calls `acceptProposalAndCreateProject(client, ...)` even though `client` is undefined in both verify and manual-complete paths.
- `netlify/functions/razorpay-webhook.ts` uses a real DB client and sends payment success email, but the email currently links to `/portal/projects` rather than a project-specific Project Access Link.
- `pages/Login.tsx` verifies `token` links but does not prefill `?email=` for normal login or preserve a `next` redirect after magic-link verification.
- `App.tsx` has project detail routes but no neutral Project Access Link route.

## Task Breakdown

| # | Task | Files | Size | Depends On |
|---|------|-------|------|------------|
| 1 | Return activation access context from shared helper | `netlify/functions/_shared/proposal-payment-helpers.ts` | S | — |
| 2 | Fix verify/manual-complete to use DB transactions and activation return value | `netlify/functions/payments.ts` | M | T1 |
| 3 | Send project-specific Project Access Link from webhook/payment success email | `netlify/functions/razorpay-webhook.ts`, `netlify/functions/send-email.ts` | S | T1 |
| 4 | Add Project Access Link route behavior | `pages/ProjectAccess.tsx`, `App.tsx` | M | T1 |
| 5 | Prefill login email and preserve `next` through magic-link verification | `pages/Login.tsx`, `netlify/functions/auth-request-magic-link.ts` | M | T4 |
| 6 | Update tests/docs if existing checks require changed copy/routes | relevant docs/tests if touched by verification | S | T1-T5 |

## Technical Design

- **Approach**: Keep `acceptProposalAndCreateProject` as the single idempotent Project Activation function and extend its return value to include project ID, project number, primary contact email/name, and whether a new project was created. Wrap payment completion plus activation in the existing `transaction()` helper in `payments.ts`, which also fixes the undefined `client` bug. Use a `/project-access` frontend route with `projectId` and `email` query params as the durable email entry point; authenticated users are redirected to the project, anonymous users are sent to login with email and next prefilled.
- **Alternatives rejected**: Long-lived magic links are rejected by ADR-0001 because they weaken the existing short-lived magic-link model. Generic `/projects` links are rejected because they lose project-specific handoff. Database-only access is rejected because Client Access requires a user-visible route into the project.
- **Key decisions**: Keep magic links short-lived; make Project Access Link durable; make failed activation explicit in the UI with a setup/pending message when the access route cannot find the project.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing webhook email behavior changes unexpectedly | M | M | Keep same email function and only change the CTA target/copy. |
| Login redirect flow conflicts with current token verification | M | H | Preserve existing token verification behavior and add `next` handling only after successful verification. |
| Payment marked completed without project activation | M | H | Transaction-wrap verify/manual-complete and keep webhook activation idempotent. |
| `project_team` assumptions are unclear | M | M | Do not introduce a new membership write until schema/current UI behavior is verified; keep `client_user_id` as the current access grant. |

## Verification

- Run `npm run typecheck` or the repo's closest TypeScript check.
- Run `npm run lint` if available.
- Inspect build/type errors in payment, webhook, auth, and new route code.
- Manual smoke target: `/portal/project-access?projectId=<id>&email=<email>` should route authenticated users to `/projects/<id>` and anonymous users to `/login?email=<email>&next=...`.
- Rollback: revert the touched files plus this plan/ADR/context docs if the flow must be restored.
