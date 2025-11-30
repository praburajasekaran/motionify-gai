# User Journey: Payment Workflow

## Overview

The Payment Workflow manages the financial lifecycle of a project from initial configurable advance payment through final balance payment. This workflow is tightly coupled with project deliverables and ensures no final files are released until payment is complete.

**Integration Points:**
- **Starts After:** Project structure created by admin (from inquiry-to-project workflow)
- **Requires:** Project terms must be accepted by client before production begins
- **Triggers:** Account creation and project activation upon advance payment

**Key Requirements from Client:**
- Configurable advance payment percentage (set per-project by super admin: 40%, 50%, 60%, etc.)
- Automated payment request emails with Razorpay payment links
- Beta delivery with watermark before final payment
- Balance payment required before final delivery release
- Payment gateway integration (Razorpay)
- 365-day access to deliverables post-completion
- Manual invoice upload by admin after each payment
- Customer account created immediately upon successful advance payment

---

## Complete Customer Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT WORKFLOW - CLIENT VIEW                        │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Admin Sets Project & Payment Terms
    ↓
Super admin creates project structure (milestones, deliverables)
Super admin sets total project cost
Super admin sets advance payment percentage (40%, 50%, 60%, etc.)
Super admin clicks "Request Advance Payment"
    ↓

STEP 2: Payment Request Email Sent
    ↓
System generates Razorpay payment link
System sends automated email to customer with payment link
Email includes: project details, total cost, advance amount, payment link
    ↓

STEP 3: Customer Receives Payment Request
    ↓
Customer receives email: "Payment Request: Your [ProjectName] is Ready to Start"
Email contains clear "Pay Now" button with Razorpay link
Customer clicks payment link
    ↓

STEP 4: Advance Payment (Configurable %)
    ↓
Customer redirected to Razorpay payment gateway
Completes payment (₹X,XXX - amount based on configured advance %)
    ↓
Payment webhook received → System processes payment
    ↓
Automatic actions triggered:
  - Customer account created immediately
  - Project record created (if not already created)
  - Portal access granted via magic link
  - System updates project status
    ↓
Automatic notifications sent:
  - Client: "Payment received, production starting" + welcome email with portal access
  - Motionify Team: "Advance payment received for Project #123"
    ↓

STEP 5: Production Phase
    ↓
Motionify team works on project
Client can track progress in dashboard
    ↓

STEP 6: Beta Delivery
    ↓
Motionify uploads beta delivery with watermark/limited resolution
Client receives notification: "Beta delivery ready for review"
Client reviews beta, provides feedback
    ↓

STEP 7: Final Delivery Ready
    ↓
Motionify marks deliverable as "Ready for Final Approval"
System checks: Has client paid balance? NO → Show payment prompt
Client sees: "Pay [balance amount] to access final deliverable"
    ↓

STEP 8: Balance Payment
    ↓
Client clicks "Pay Balance" → Redirected to Razorpay
Completes final payment (₹X,XXX)
    ↓
Payment webhook received → System unlocks final deliverable
    ↓
Automatic notifications sent:
  - Client: "Payment received, final files now available"
  - Motionify Team: "Balance payment received, project complete"
    ↓

STEP 9: Final Delivery Access
    ↓
Client downloads final deliverable (no watermark, full resolution)
Access granted for 365 days from completion date
    ↓

STEP 10: Auto-Expiry (365 days later)
    ↓
System automatically expires deliverable access
Client receives notification 7 days before expiry
Files archived, download links disabled
```

---

## State Transition Diagrams

### Project Payment Status Flow

```
┌──────────────────┐
│ PENDING_ADVANCE  │  ← Initial state (admin sets project & payment terms)
└────────┬─────────┘
         │
         │ [Admin triggers payment request → Email sent]
         │ [Client pays advance (configurable %)]
         ↓
┌──────────────────┐
│ ADVANCE_PAID     │  ← Production can begin
└────────┬─────────┘
         │
         │ [Beta delivery uploaded]
         ↓
┌──────────────────┐
│ BETA_DELIVERED   │  ← Client reviewing beta
└────────┬─────────┘
         │
         │ [Final deliverable ready]
         ↓
┌──────────────────┐
│ AWAITING_BALANCE │  ← Waiting for final 50% payment
└────────┬─────────┘
         │
         │ [Client pays 50% balance]
         ↓
┌──────────────────┐
│ FULLY_PAID       │  ← Final deliverable accessible
└────────┬─────────┘
         │
         │ [365 days elapsed]
         ↓
┌──────────────────┐
│ EXPIRED          │  ← Access revoked, files archived
└──────────────────┘

Alternative paths:

┌──────────────────┐
│ PAYMENT_FAILED   │  ← Payment gateway error, retry available
└────────┬─────────┘
         │
         │ [Client retries payment]
         ↓
     [Return to appropriate payment state]

┌──────────────────┐
│ REFUND_ISSUED    │  ← Edge case: project cancelled, refund processed
└──────────────────┘
```

### Individual Payment Transaction Status

```
┌─────────────┐
│  INITIATED  │  ← Payment button clicked, redirecting to gateway
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  PROCESSING │  ← At payment gateway, user completing payment
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ↓                 ↓
┌─────────────┐   ┌─────────────┐
│  COMPLETED  │   │   FAILED    │  ← Payment rejected/cancelled
└─────────────┘   └──────┬──────┘
                         │
                         │ [User can retry]
                         ↓
                  [Return to INITIATED]
```

---

## Decision Points

### Admin: Manual Invoice Upload
```
Payment completed successfully

AUTOMATIC                         MANUAL
  │                                 │
  ↓                                 ↓
System updates                  Admin uploads invoice PDF
payment status                  System emails invoice to client
automatically                   Invoice stored in project documents
```

### Client: Beta Approval Decision
```
Beta delivery received - review and decide

APPROVE                          REQUEST CHANGES
  │                                 │
  ↓                                 ↓
Motionify prepares              Submit revision feedback
final deliverable               (within revision limit)
  │                                 │
  ↓                                 ↓
System shows                    Motionify makes revisions
"Pay balance to                 Re-submits beta
access final"                       │
                                    ↓
                              [Return to review]
```

### System: Access Control Check
```
Client attempts to download final deliverable

CHECK: Balance paid?

YES                              NO
  │                               │
  ↓                               ↓
Allow download                Show payment prompt
Show expiry date              "Pay ₹X,XXX to access final"
(365 days remaining)          Redirect to payment gateway
```

---

## Automation Triggers

### Email Notifications (Automatic)

| Trigger Event | Recipients | Email Type |
|--------------|------------|------------|
| Advance payment completed | Client + Motionify Admin | `payment-advance-confirmation.html` |
| Balance payment completed | Client + Motionify Admin | `payment-balance-confirmation.html` |
| Payment failed | Client | `payment-failed-retry.html` |
| Invoice uploaded by admin | Client | `invoice-ready.html` |
| Final deliverable unlocked | Client | `final-deliverable-ready.html` |
| 7 days before access expiry | Client | `access-expiring-soon.html` |
| Access expired | Client | `access-expired.html` |
| Payment refund issued | Client + Motionify Admin | `refund-processed.html` |

### Status Updates (Automatic)

| Trigger Event | Status Change |
|--------------|---------------|
| Advance payment webhook success | Project payment_status → `ADVANCE_PAID` |
| Balance payment webhook success | Project payment_status → `FULLY_PAID` |
| Final deliverable uploaded | Deliverable status → `AWAITING_FINAL_PAYMENT` |
| Balance payment completed | Deliverable status → `AVAILABLE` |
| 365 days after project completion | Project status → `EXPIRED`, Deliverable status → `EXPIRED` |

### System Actions (Automatic)

| Trigger Event | System Action |
|--------------|---------------|
| Advance payment completed | Enable production workflow, notify assigned team members |
| Balance payment completed | Unlock final deliverable downloads, enable full-resolution access |
| Payment webhook failure | Create error log, notify admin, allow client retry |
| Access expiry (365 days) | Disable download links, archive files to cold storage |
| 7 days before expiry | Send warning email, prompt client to download before expiry |

---

## Timeline Estimates

### Typical Flow (Happy Path)
```
Day 0:   Admin sets project structure & payment terms
         → Admin sets total cost and advance percentage (e.g., 50%)
         → Admin triggers payment request
         → System sends payment request email to customer
         → Payment status: PENDING_ADVANCE

Day 0:   Customer receives email and pays advance immediately
         → Payment webhook received
         → Customer account created immediately
         → Project record created
         → Welcome email with portal access sent
         → Payment status: ADVANCE_PAID
         → Admin uploads invoice (manually)
         → Client receives invoice email

Day 1-7: Production phase (Motionify working)

Day 8:   Beta delivery uploaded with watermark
         → Client receives notification
         → Client reviews beta

Day 9:   Client approves beta (or requests minor revisions)

Day 10-12: Motionify prepares final deliverable

Day 13:  Final deliverable marked ready
         → Payment status: AWAITING_BALANCE
         → Client sees payment prompt

Day 13:  Client pays 50% balance
         → Payment status: FULLY_PAID
         → Final deliverable unlocked
         → Admin uploads final invoice
         → Client receives invoice email

Day 13+: Client downloads final files
         → 365-day countdown begins

Day 378: System sends "7 days until expiry" warning

Day 385: Access automatically expires
         → Download links disabled
         → Files archived

Total: 13 days to full payment, 385 days until expiry
```

### Delayed Payment Scenario
```
Day 0:   Client accepts terms but delays payment

Day 3:   System sends payment reminder
         → "Complete advance payment to start production"

Day 7:   Admin manually follows up (outside system)

Day 10:  Client finally pays advance
         → Production starts late

[Rest follows same flow as typical, but delayed]
```

---

## Edge Cases & Error Handling

### Payment Gateway Timeout
- **Description**: Client completes payment at Razorpay but webhook fails to reach server
- **Expected behavior**: Payment marked as "PROCESSING" for up to 15 minutes
- **Resolution**:
  - System polls Razorpay payment status API every 2 minutes
  - If confirmed externally, manually update payment status
  - Admin receives alert for stuck payments after 15 minutes

### Duplicate Payment Attempt
- **Description**: Client accidentally clicks "Pay" button twice
- **Expected behavior**: Second payment attempt fails with error message
- **Resolution**:
  - Check if payment already exists for this milestone
  - Show message: "Payment already completed for this milestone"
  - Prevent duplicate Razorpay order creation

### Partial Refund Request
- **Description**: Client requests refund after advance but before work starts
- **Expected behavior**: Admin initiates refund through Razorpay dashboard
- **Resolution**:
  - Admin marks payment as "REFUND_REQUESTED"
  - Process refund manually (outside system initially)
  - Admin updates payment status to "REFUNDED"
  - System sends refund confirmation email
  - Project status changes to "CANCELLED"

### Balance Payment Overdue
- **Description**: Client approves beta but delays balance payment for weeks
- **Expected behavior**: Final deliverable remains locked, reminders sent
- **Resolution**:
  - Automated reminder emails at Day 3, Day 7, Day 14 after final deliverable ready
  - Admin receives notification of overdue payments
  - Admin can manually follow up
  - No auto-cancellation (client can pay anytime)

### Invoice Upload Delay
- **Description**: Admin forgets to upload invoice after payment
- **Expected behavior**: Payment completes successfully but invoice missing
- **Resolution**:
  - Payment workflow proceeds normally
  - Dashboard shows admin alert: "Invoice pending for Project #123"
  - Client can still access all features
  - Admin uploads invoice later, system emails to client retroactively

### Access After Expiry Request
- **Description**: Client requests file access after 365-day expiry
- **Expected behavior**: System shows "Access expired" message
- **Resolution**:
  - Client contacts Motionify support manually
  - Admin can manually extend access (if approved)
  - Admin updates `expiry_date` field in deliverables table
  - System re-enables download links
  - Client receives "Access restored" email

### Payment Gateway Maintenance
- **Description**: Razorpay is down during client payment attempt
- **Expected behavior**: Show friendly error message with retry option
- **Resolution**:
  - Catch payment gateway errors gracefully
  - Show message: "Payment gateway temporarily unavailable. Please try again in a few minutes."
  - Log error for admin review
  - Client can retry when gateway is back online

### Currency Conversion Issues (Future)
- **Description**: International client paying in USD vs INR pricing
- **Expected behavior**: Not currently supported
- **Resolution**:
  - Phase 1: INR only
  - Future phase: Add multi-currency support
  - Currently show error: "International payments coming soon"

---

## Integration Points

### With Project Terms Workflow
- **Note:** Terms are accepted during proposal acceptance, not during payment workflow
- Payment workflow begins AFTER admin creates project structure and triggers payment request
- Client receives payment request email and pays advance payment
- After payment, account is created with `hasAgreed: true` (terms already accepted)
- Client logs in and immediately has full project access (no blocking modal)
- Production can begin immediately after payment is received

### With Deliverable Workflow
- Beta delivery upload does NOT require balance payment
- Final deliverable upload requires balance payment check
- Download links conditionally rendered based on payment status

### With Invoice Management
- Admin manually uploads invoices after each payment
- Invoices stored in project documents
- Automatic email sent to client when invoice uploaded

### With Notification System
- All payment events trigger notifications
- Email + in-app notifications for both client and admin
- Payment reminders sent automatically

---

## Security & Compliance

### Payment Data Security
- NO credit card data stored in system
- All payment processing handled by Razorpay (PCI DSS compliant)
- Only store Razorpay order_id and payment_id references

### Webhook Verification
- Verify Razorpay webhook signatures before processing
- Reject unsigned or tampered webhooks
- Log all webhook attempts for audit trail

### Access Control
- Only project client lead can initiate payments
- Only Motionify admin can upload invoices
- Only admin can issue refunds

### Audit Trail
- All payment transactions logged with timestamps
- Track who initiated payment, completion time, amount
- Store payment gateway response codes
- Maintain complete history for accounting/legal purposes
