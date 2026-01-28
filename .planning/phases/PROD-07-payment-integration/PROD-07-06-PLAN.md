---
phase: PROD-07-payment-integration
plan: 06
type: execute
wave: 3
depends_on: ["PROD-07-02", "PROD-07-03", "PROD-07-04", "PROD-07-05"]
files_modified: []
autonomous: false

must_haves:
  truths:
    - "Payment can be created via admin action"
    - "Client receives payment and can pay via Razorpay"
    - "Payment success is confirmed via verify endpoint"
    - "Webhook processes payment.captured event"
    - "Admin sees payment in dashboard"
    - "Client sees payment in portal history"
  artifacts: []
  key_links: []
---

<objective>
Manual verification of complete payment flow end-to-end.

Purpose: Verify all payment components work together in the real application with Razorpay test mode.

Output: Verified payment flow from creation through completion with all parties informed.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@.planning/phases/PROD-07-payment-integration/PROD-07-RESEARCH.md
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete payment integration including webhook, admin dashboard, client portal, and failure handling</what-built>
  <how-to-verify>
### Test PAY-01: Payment Creation
1. Login as admin
2. Accept a proposal (or use an existing accepted proposal)
3. Verify payment record is created in database
4. Check admin /admin/payments dashboard shows the payment as "pending"

### Test PAY-02: Payment Processing (Client Side)
1. Login as client associated with the proposal
2. Navigate to /portal/payments
3. Verify pending payment is visible
4. Click "Pay Now" button
5. Complete payment using Razorpay test card (4111 1111 1111 1111, any expiry, any CVV)
6. Verify redirect to success page
7. Verify success page auto-redirects to project

### Test PAY-03: Payment Verification
1. After successful payment, verify:
   - Database shows payment status = "completed"
   - Admin dashboard shows payment as "completed"
   - Client portal shows payment as "completed"
   - Receipt is available for download

### Test PAY-04: Webhook Processing (Optional - requires ngrok/tunnel)
If testing webhooks with Razorpay:
1. Configure Razorpay webhook URL in dashboard
2. Make a payment
3. Check payment_webhook_logs table for received event
4. Verify payment status updated correctly

### Test PAY-05: Failure Handling
1. Initiate a payment
2. Close the Razorpay modal (dismiss payment)
3. Verify failure page shows with retry button
4. Click retry and complete payment successfully

### Test PAY-06: Admin Manual Reminder
1. Find a pending payment in admin dashboard
2. Click "Send Reminder" button
3. Verify reminder is sent (check email or logs)

Pass criteria:
- All tests pass
- No console errors during flow
- Data persists correctly in database
  </how-to-verify>
  <resume-signal>Type "verified" if all tests pass, or describe any issues found</resume-signal>
</task>

</tasks>

<verification>
1. Admin can see payments in dashboard
2. Client can pay from portal
3. Razorpay modal opens and processes payment
4. Success page redirects to project
5. Failure page shows retry option
6. Database records are accurate
7. All parties can view payment history
</verification>

<success_criteria>
- Complete payment flow works end-to-end
- All PAY-01 through PAY-04 requirements verified
- No blocking errors in production-like environment
- User experience is smooth and clear
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-06-SUMMARY.md`
</output>
