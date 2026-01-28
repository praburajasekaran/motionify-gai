---
phase: PROD-07-payment-integration
plan: 01
subsystem: payments
tags: [razorpay, webhooks, payment-verification, postgresql]

# Dependency graph
requires:
  - phase: PROD-05-credential-wiring
    provides: Database connection pool and query utilities
provides:
  - Razorpay webhook endpoint for async payment confirmation
  - payment_webhook_logs table for audit trail and idempotency
  - Zod schema for webhook payload validation
affects: [PROD-07-02, PROD-07-03, payment-admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw body text for webhook signature verification (not parsed JSON)"
    - "Idempotency via x-razorpay-event-id header check"
    - "Return 200 quickly for Razorpay webhooks (5s timeout)"

key-files:
  created:
    - database/migrations/009_payment_webhook_logs.sql
    - landing-page-new/src/app/api/webhooks/razorpay/route.ts
  modified:
    - netlify/functions/_shared/schemas.ts

key-decisions:
  - "Used migration 009 instead of 002 (002 already exists for comments)"
  - "Return 200 even for processing errors to prevent Razorpay retry loops"
  - "Log failed signature attempts for security audit"

patterns-established:
  - "Webhook handler pattern: raw body -> verify signature -> check idempotency -> process -> log"
  - "Use transaction() wrapper for atomic webhook processing"

# Metrics
duration: 4min
completed: 2026-01-28
---

# Phase PROD-07 Plan 01: Razorpay Webhook Handler Summary

**Razorpay webhook endpoint with HMAC SHA256 signature verification, idempotent event processing, and audit logging**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-28T02:09:50Z
- **Completed:** 2026-01-28T02:13:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created payment_webhook_logs table with idempotency support via razorpay_event_id UNIQUE constraint
- Implemented POST /api/webhooks/razorpay endpoint with raw body signature verification
- Added handlers for payment.captured, payment.failed, and order.paid events
- Created Zod schema for webhook payload type safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Create webhook migration and logging table** - `9388fd8` (feat)
2. **Task 2: Implement Razorpay webhook endpoint** - `861d260` (feat)
3. **Task 3: Add webhook schema validation** - `d656839` (feat)

## Files Created/Modified
- `database/migrations/009_payment_webhook_logs.sql` - Webhook audit log table with idempotency
- `landing-page-new/src/app/api/webhooks/razorpay/route.ts` - Webhook endpoint handler
- `netlify/functions/_shared/schemas.ts` - Added razorpayWebhookSchema

## Decisions Made
- Used migration number 009 instead of 002 as specified in plan (002 already exists for comments/notifications)
- Return 200 OK even for processing errors to prevent Razorpay from retrying indefinitely (errors are logged for review)
- Log failed signature verification attempts for security auditing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed migration file number from 002 to 009**
- **Found during:** Task 1 (Create webhook migration)
- **Issue:** Plan specified 002_payment_webhook_logs.sql but 002_add_comments_and_notifications.sql already exists
- **Fix:** Used next available number (009_payment_webhook_logs.sql)
- **Files modified:** database/migrations/009_payment_webhook_logs.sql
- **Verification:** Migration file created with correct schema
- **Committed in:** 9388fd8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor file naming change, no functional impact.

## Issues Encountered
None - implementation followed Razorpay webhook best practices from RESEARCH.md.

## User Setup Required

**Environment variable required:** `RAZORPAY_WEBHOOK_SECRET`

This is separate from `RAZORPAY_KEY_SECRET` and must be configured in Razorpay Dashboard:
1. Go to Razorpay Dashboard > Settings > Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/razorpay`
3. Select events: payment.captured, payment.failed, order.paid
4. Copy the generated webhook secret
5. Add to environment: `RAZORPAY_WEBHOOK_SECRET=your_webhook_secret`

**Database migration required:** Run `database/migrations/009_payment_webhook_logs.sql` on the database.

## Next Phase Readiness
- Webhook endpoint ready for Razorpay configuration
- payment_webhook_logs table ready for audit queries
- PROD-07-02 (Payment Attempt Logging) can use the logged data
- PROD-07-03 (Admin Dashboard) can query payment_webhook_logs for debugging

---
*Phase: PROD-07-payment-integration*
*Completed: 2026-01-28*
