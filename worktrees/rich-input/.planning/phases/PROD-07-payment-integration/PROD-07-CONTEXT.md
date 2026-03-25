# Phase PROD-07: Payment Integration - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify Razorpay integration, payment tracking, and milestone payments work correctly for production. Current system supports 2 milestones (advance + final). Scope includes payment creation, processing, webhook handling, and payment visibility for both admin and client.

</domain>

<decisions>
## Implementation Decisions

### Payment UX Flow
- Inline Razorpay modal (not redirect or embedded form)
- Pay button appears in BOTH locations: proposal page after acceptance AND dedicated payments section in portal
- Razorpay handles its modal flow, then redirect to success/failure confirmation page on our site
- Full context shown before checkout: amount + breakdown + payment terms + what happens after payment
- Manual reminder button for admin to send payment reminder emails
- All Razorpay payment methods enabled (cards, UPI, netbanking, wallets)
- Multi-currency: INR and USD supported
- Currency set per-proposal by admin
- Use Razorpay test mode for development/demo (no manual "Mark as Paid" override)

### Post-Payment Flow
- After successful payment, redirect client to project/deliverables view
- PDF receipt: both emailed as attachment AND downloadable from portal
- Email + in-app notification to admin on successful payment

### Milestone Structure
- 2 milestones: advance + final (existing system)
- Advance payment requested automatically on proposal acceptance
- Final payment: admin triggers manually before final delivery
- Soft reminder sent after 7 days for unpaid invoices (no hard deadline)

### Failure & Retry Handling
- Failed payment: show error + retry button immediately, PLUS notify admin via email + in-app
- Full payment attempt history logged in database (timestamp, error code, amount)
- Seamless payment method switching within Razorpay modal on failure
- Auto-timeout: mark as failed if Razorpay doesn't confirm within 30 minutes
- Refunds handled outside the system (directly in Razorpay dashboard)

### Payment Visibility
- **Client portal:** Full payment history + downloadable PDF receipts
- **Admin portal:** Dedicated payments dashboard (not embedded in project view)
- Admin dashboard filters: status + date range + client name + project search
- Optional GST toggle per proposal (show base + 18% GST breakdown if enabled)

### Claude's Discretion
- Advance/final percentage split logic (based on existing implementation)
- Razorpay webhook failure handling (retry vs manual reconciliation)
- Browser close behavior during payment (order persistence vs new session)

</decisions>

<specifics>
## Specific Ideas

- "After successful payment, redirect to project/deliverables" - client should immediately see what they paid for
- "Full context before checkout" - amount + breakdown + payment terms + what happens after payment
- GST is optional because not all clients/projects need it

</specifics>

<deferred>
## Deferred Ideas

- **Multiple milestones (>2):** User mentioned wanting more than advance + final for longer projects. This is a new capability requiring schema changes to support N milestones. → Future phase
- **Automatic reminders:** Currently manual-only. Scheduled/cron-based reminders could be added later.
- **In-app refund handling:** Refunds currently handled in Razorpay dashboard directly.
- **Configurable notification preferences:** Admin notification channels currently fixed (email + in-app).

</deferred>

---

*Phase: PROD-07-payment-integration*
*Context gathered: 2026-01-28*
