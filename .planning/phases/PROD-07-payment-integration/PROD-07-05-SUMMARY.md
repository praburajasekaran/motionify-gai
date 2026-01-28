---
phase: PROD-07-payment-integration
plan: 05
subsystem: payments
tags: [razorpay, payment-failure, notifications, auto-redirect, retry-flow]

# Dependency graph
requires:
  - phase: PROD-07-01
    provides: Payment webhook logs table and Razorpay signature verification
provides:
  - Payment attempt logging to payment_webhook_logs table
  - Admin notification on payment failure (in-app)
  - Enhanced failure page with retry button
  - Success page auto-redirect to project deliverables
affects: [PROD-07-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Payment attempt audit trail via payment_webhook_logs
    - In-app notifications for admin alerts
    - Auto-redirect countdown with user cancel option

key-files:
  modified:
    - landing-page-new/src/app/api/payments/verify/route.ts
    - landing-page-new/src/app/payment/failure/page.tsx
    - landing-page-new/src/app/payment/success/page.tsx
    - netlify/functions/send-email.ts

key-decisions:
  - "Reuse payment_webhook_logs table for verify attempt logging"
  - "In-app notifications to all admins (super_admin + project_manager)"
  - "5-second countdown with 'Stay here' cancel option"
  - "Redirect to /portal/projects/[projectId] if available, else /portal/projects"

patterns-established:
  - "Admin notification pattern: INSERT into notifications + console log for email"
  - "Auto-redirect with countdown and cancel option"

# Metrics
duration: 5min
completed: 2026-01-28
---

# Phase PROD-07 Plan 05: Payment Failure Handling Summary

**Payment failure handling with admin notifications, enhanced retry flow, and success page auto-redirect to project deliverables**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-28T02:17:27Z
- **Completed:** 2026-01-28T02:25:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Payment attempts (success and failure) now logged to payment_webhook_logs table
- Admin users (super_admin, project_manager) receive in-app notification on payment failure
- Failure page shows error details with proposalId-based retry button
- Success page auto-redirects to project page after 5-second countdown
- Email template added for payment failure notifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance payment verify to log attempts and notify on failure** - `5f6c95b` (feat)
2. **Task 2: Enhance failure page with retry button** - `26901f3` (feat)
3. **Task 3: Update success page to redirect to deliverables** - `c4a222f` (feat)

## Files Created/Modified
- `landing-page-new/src/app/api/payments/verify/route.ts` - Added logPaymentAttempt() and notifyAdminPaymentFailure() functions
- `landing-page-new/src/app/payment/failure/page.tsx` - Enhanced with retry button, error code display, order reference
- `landing-page-new/src/app/payment/success/page.tsx` - Added 5-second countdown auto-redirect to project page
- `netlify/functions/send-email.ts` - Added sendPaymentFailureNotificationEmail template

## Decisions Made
1. **Reuse payment_webhook_logs table** - The PROD-07-01 webhook logs table already exists, so we use it for verify attempt logging instead of creating a new payment_attempts table
2. **In-app notifications over email** - For MVP, admin notifications are in-app with console logging; email sending via Resend can be added later
3. **5-second countdown** - Gives user time to see success confirmation before redirect, with option to stay
4. **Query params for failure context** - Pass orderId, errorCode, errorDescription, proposalId via URL params for retry and support reference

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed smoothly.

## User Setup Required

None - no external service configuration required. Payment failure notifications use existing notifications table.

## Next Phase Readiness
- Payment failure handling complete
- Admin receives in-app alerts for failed payments
- Clients can retry failed payments easily
- Successful payments redirect to project view
- Ready for PROD-07-06: Payment webhooks testing and integration

---
*Phase: PROD-07-payment-integration*
*Completed: 2026-01-28*
