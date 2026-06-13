# Payment Production Readiness Runbook

This runbook covers Razorpay and Netlify Function readiness for proposal advance payments, project payments, webhook retries, and paid revision unlocks.

## Required Netlify Environment Variables

| Variable | Production expectation |
|---|---|
| `APP_URL` | `https://motionify.studio` |
| `DATABASE_URL` | Production pooled Neon connection, not localhost |
| `JWT_SECRET` | Production-only secret, 32+ characters |
| `RAZORPAY_KEY_ID` | Razorpay live key ID when production checkout is live |
| `RAZORPAY_KEY_SECRET` | Razorpay live key secret matching `RAZORPAY_KEY_ID` |
| `RAZORPAY_WEBHOOK_SECRET` | Secret configured on the active Razorpay webhook endpoint |
| `R2_ACCOUNT_ID` | Production Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Production bucket-scoped key |
| `R2_SECRET_ACCESS_KEY` | Production bucket-scoped secret |
| `R2_BUCKET_NAME` | Production bucket name |
| `R2_PUBLIC_URL` | Public or custom file URL used by the portal |

Optional but expected for production observability:

- `SENTRY_DSN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`

## Razorpay Mode Separation

- Test mode and live mode credentials must never be mixed.
- Checkout verification and webhook verification must use credentials from the same mode.
- Before switching to live payments, confirm the Razorpay webhook dashboard points to the production Netlify Function route and uses the same `RAZORPAY_WEBHOOK_SECRET` stored in Netlify.

## Pre-Deploy Checks

Run:

```bash
npm run build
npm run verify:production-readiness
npm run verify:production-flip
npm run test:e2e:payment
```

Then confirm:

- `netlify/functions/_shared/payment-verification.ts` verifies checkout signatures.
- `netlify/functions/payments.ts` rejects invalid signatures, mismatched order IDs, and already-bound provider payment IDs.
- `netlify/functions/razorpay-webhook.ts` verifies webhook signatures before fulfillment.
- Manual payment completion remains admin-gated and auditable.
- Proposal activation continues through `acceptProposalAndCreateProject`.

## Post-Deploy Smoke Check

1. Create or use a sent proposal with an advance payment due.
2. Open the client handoff/payment URL.
3. Confirm the payment page shows proposal pricing and the Razorpay key ID expected for the deploy mode.
4. Complete or simulate payment.
5. Confirm the proposal is accepted and exactly one linked project exists.
6. Trigger or replay the webhook event and confirm it does not create a second project.
7. For paid revision unlocks, confirm an approved request increases project revision capacity only once after payment completion.

## Rollback

If payment fulfillment fails after deploy:

1. Disable or pause the new payment entry point if possible.
2. Restore the previous Netlify deploy.
3. Keep Razorpay webhooks enabled so already-captured payments can be reconciled.
4. Export affected payment IDs, proposal IDs, and project IDs from the database before manual repair.
5. Re-run the idempotency checks before re-enabling the release.
