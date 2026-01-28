---
phase: PROD-09-payment-production-wiring
plan: 02
type: execute
wave: 2
depends_on: ["PROD-09-01"]
files_modified: []
autonomous: false

must_haves:
  truths:
    - "Webhook receives and processes payment.captured event from Razorpay"
    - "Webhook receives and processes payment.failed event from Razorpay"
    - "Admin receives email notification on payment failure"
    - "Client receives email confirmation on payment success"
    - "Webhook logs are created in payment_webhook_logs table"
  artifacts:
    - path: "database: payment_webhook_logs"
      provides: "Audit trail of all webhook events"
      contains: "rows with signature_verified=true and status=PROCESSED"
  key_links:
    - from: "Razorpay Dashboard"
      to: "/api/webhooks/razorpay"
      via: "HTTPS POST with signature"
      pattern: "webhook delivery in Razorpay logs"
---

<objective>
Complete end-to-end webhook integration testing with Razorpay

Purpose: Verify the entire payment webhook flow works correctly before production deployment. This includes signature verification, payment status updates, email notifications, and audit logging.

Output: Verified webhook integration with test transaction evidence in database and email inboxes
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-09-payment-production-wiring/PROD-09-RESEARCH.md
@.planning/phases/PROD-09-payment-production-wiring/PROD-09-01-SUMMARY.md

# Relevant source files
@landing-page-new/src/app/api/webhooks/razorpay/route.ts
@netlify/functions/send-email.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify environment variables configured</name>
  <files></files>
  <action>
Check that required environment variables are set for webhook testing:

1. **Check .env.local in landing-page-new:**
```bash
grep -E "RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|ADMIN_NOTIFICATION_EMAIL" landing-page-new/.env.local
```

2. **Document required variables:**
- `RAZORPAY_WEBHOOK_SECRET` - Webhook-specific secret from Razorpay Dashboard (NOT the API key secret)
- `RESEND_API_KEY` - API key from Resend dashboard
- `ADMIN_NOTIFICATION_EMAIL` - Email address to receive payment failure notifications
- `RAZORPAY_KEY_ID` - Razorpay test mode key ID (starts with `rzp_test_`)
- `RAZORPAY_KEY_SECRET` - Razorpay test mode key secret

3. **If any are missing, note them for user setup.**

The webhook handler checks for RAZORPAY_WEBHOOK_SECRET and returns 500 if not configured.
  </action>
  <verify>
Run `grep -c "RAZORPAY_WEBHOOK_SECRET" landing-page-new/.env.local` - should return 1 if set.
Run `grep -c "ADMIN_NOTIFICATION_EMAIL" landing-page-new/.env.local` - should return 1 if set.
List any missing variables that need to be set.
  </verify>
  <done>
Environment variable checklist completed. Missing variables documented for user action.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Environment variable check for webhook testing</what-built>
  <how-to-verify>
**Confirm these environment variables are set in `landing-page-new/.env.local`:**

1. `RAZORPAY_WEBHOOK_SECRET` - Get from Razorpay Dashboard > Settings > Webhooks > Create/Edit Webhook > Secret
2. `ADMIN_NOTIFICATION_EMAIL` - Your email to receive failure notifications
3. `RESEND_API_KEY` - Already set if emails work elsewhere
4. `RAZORPAY_KEY_ID` - Already set if payments work
5. `RAZORPAY_KEY_SECRET` - Already set if payments work

**To set missing variables:**
```bash
# Edit the file
nano landing-page-new/.env.local

# Add missing lines like:
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
ADMIN_NOTIFICATION_EMAIL=your@email.com
```

**Note:** RAZORPAY_WEBHOOK_SECRET is different from RAZORPAY_KEY_SECRET. The webhook secret is generated when you create a webhook endpoint in Razorpay Dashboard.
  </how-to-verify>
  <resume-signal>Type "env configured" to continue, or list which variables are missing</resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Set up ngrok tunnel and configure Razorpay webhook</action>
  <instructions>
**Prerequisites:**
1. Install ngrok if not already: `brew install ngrok` or download from ngrok.com
2. Sign up for free ngrok account to get persistent URLs

**Setup Steps:**

1. **Start the Next.js development server:**
```bash
cd landing-page-new && npm run dev
```

2. **In a new terminal, start ngrok tunnel:**
```bash
ngrok http 3000
```

3. **Copy the ngrok forwarding URL** (e.g., `https://abc123.ngrok-free.app`)

4. **Configure webhook in Razorpay Dashboard:**
   - Log in to https://dashboard.razorpay.com
   - Go to **Settings > Webhooks**
   - Click **Add New Webhook**
   - URL: `{ngrok-url}/api/webhooks/razorpay`
   - Select events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy the **Webhook Secret** shown (starts with something like `Jb3...`)
   - Click **Create Webhook**

5. **Add webhook secret to environment:**
   - Edit `landing-page-new/.env.local`
   - Add: `RAZORPAY_WEBHOOK_SECRET=<paste-secret-here>`
   - Restart Next.js dev server
  </instructions>
  <resume-signal>Type "webhook configured" with ngrok URL to continue, or describe any issues</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Webhook handler with signature verification, payment status updates, and email notifications</what-built>
  <how-to-verify>
**Test Flow - Payment Success:**

1. **Create a test payment** (use existing proposal or create test data):
   - Navigate to a proposal with pending payment
   - Click Pay Now to initiate Razorpay checkout
   - Use test card: `4111 1111 1111 1111`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - OTP: `754081` (Razorpay test OTP)
   - Complete payment

2. **Check ngrok terminal** for incoming webhook request

3. **Verify database update:**
```bash
# Run in project root
psql $DATABASE_URL -c "SELECT id, status, razorpay_payment_id, updated_at FROM payments ORDER BY updated_at DESC LIMIT 1;"
```
Expected: status = 'completed', razorpay_payment_id populated

4. **Verify webhook log:**
```bash
psql $DATABASE_URL -c "SELECT event, status, signature_verified, error FROM payment_webhook_logs ORDER BY received_at DESC LIMIT 3;"
```
Expected: event = 'payment.captured', status = 'PROCESSED', signature_verified = true

5. **Check email inbox:**
   - Client email should receive payment success confirmation
   - If using Resend test mode, check Resend dashboard logs

**Test Flow - Payment Failure:**

1. **Initiate another payment**
2. **Use failing test card:** `4000 0000 0000 0002`
3. **Complete checkout** - payment will fail

4. **Verify webhook log shows payment.failed:**
```bash
psql $DATABASE_URL -c "SELECT event, status, error FROM payment_webhook_logs WHERE event = 'payment.failed' ORDER BY received_at DESC LIMIT 1;"
```

5. **Check admin email** for failure notification

**Expected Results:**
- [x] Webhook receives events (visible in ngrok terminal)
- [x] Signature verification passes (no 401 errors)
- [x] Payment status updated in database
- [x] Webhook logs created with PROCESSED status
- [x] Success email sent to client
- [x] Failure email sent to admin
  </how-to-verify>
  <resume-signal>Type "verified" with test results, or describe issues found</resume-signal>
</task>

<task type="auto">
  <name>Task 5: Document test results and cleanup</name>
  <files></files>
  <action>
After verification checkpoint passes:

1. **Remove test webhook from Razorpay Dashboard** (optional - can keep for staging)

2. **Document production setup requirements** in summary:
   - Production webhook URL: `https://motionify.studio/api/webhooks/razorpay`
   - Different webhook secret for production vs test
   - ADMIN_NOTIFICATION_EMAIL must be set in Netlify/Vercel production environment

3. **Note any issues encountered** during testing for future reference

4. **Clean up test data** if needed:
```sql
-- Optional: Clean up test webhook logs (keep for audit)
-- DELETE FROM payment_webhook_logs WHERE razorpay_order_id LIKE 'order_test%';
```
  </action>
  <verify>
Test results documented in summary.
Production setup requirements noted.
  </verify>
  <done>
E2E webhook testing complete. Production deployment checklist documented.
  </done>
</task>

</tasks>

<verification>
1. At least one payment.captured webhook logged with status=PROCESSED
2. At least one payment.failed webhook logged (if failure test performed)
3. All logged webhooks have signature_verified=true
4. Client received payment success email
5. Admin received payment failure email (if failure test performed)
6. No 401 or 500 errors in webhook logs
</verification>

<success_criteria>
- Razorpay webhook configured and receiving events
- Signature verification working correctly
- Payment status updates correctly on webhook receipt
- Email notifications sent on both success and failure
- Webhook audit logs created in database
- Production deployment requirements documented
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-09-payment-production-wiring/PROD-09-02-SUMMARY.md`
</output>
