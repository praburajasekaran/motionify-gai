# Test Cases: Payment Workflow

Comprehensive test scenarios for the payment workflow feature. Total: 62 test cases.

## Test Case Format

Each test case includes:
- **ID**: Unique identifier (TC-PW-###)
- **Feature**: Which component is being tested
- **Scenario**: What we're testing
- **Steps**: How to execute the test
- **Expected Result**: What should happen
- **Priority**: High/Medium/Low

---

## 1. Payment Initiation (10 test cases)

### TC-PW-001: Admin Sets Payment Terms with Configurable Advance Percentage
**Priority:** High
**Feature:** Payment Terms Setup

**Steps:**
1. Login as super admin
2. Navigate to project setup
3. Set total amount: ₹80,000
4. Set advance percentage: 40%
5. Click "Request Advance Payment"

**Expected:**
- ✓ Payment terms saved with advance_percentage = 40
- ✓ advance_amount calculated: ₹32,000 (40% of ₹80,000)
- ✓ balance_amount calculated: ₹48,000 (60% of ₹80,000)
- ✓ Razorpay payment link generated
- ✓ Payment request email sent to customer
- ✓ Payment status: PENDING_ADVANCE

---

### TC-PW-002: System Calculates Correct Advance and Balance Amounts
**Priority:** High
**Feature:** Payment Calculation

**Steps:**
1. Admin sets total amount: ₹100,000
2. Admin sets advance percentage: 50%
3. System calculates amounts

**Expected:**
- ✓ advance_amount = ₹50,000 (50% of ₹100,000)
- ✓ balance_amount = ₹50,000 (remaining 50%)
- ✓ Calculations accurate to 2 decimal places

**Test with different percentages:**
- 40% advance: advance = 40%, balance = 60%
- 60% advance: advance = 60%, balance = 40%
- 30% advance: advance = 30%, balance = 70%

---

### TC-PW-003: Payment Request Email Sent Automatically
**Priority:** High
**Feature:** Automated Email

**Steps:**
1. Admin sets payment terms
2. Admin clicks "Request Advance Payment"
3. Check customer email

**Expected:**
- ✓ Email sent within 1 minute
- ✓ Subject: "Payment Request: Your [ProjectName] is Ready to Start"
- ✓ Email contains: project name, total amount, advance amount, advance percentage, payment link
- ✓ Payment link is valid Razorpay link
- ✓ Email includes clear "Pay Now" CTA button

---

### TC-PW-004: Customer Account Created Immediately After Payment
**Priority:** High
**Feature:** Account Creation

**Steps:**
1. Customer receives payment request email
2. Customer completes advance payment
3. Payment webhook received
4. Check user accounts

**Expected:**
- ✓ Customer user account created immediately
- ✓ Account email matches customer email from inquiry
- ✓ Account role: 'client'
- ✓ is_primary_contact: true
- ✓ Magic link generated for portal access
- ✓ Welcome email sent with portal access link
- ✓ Project record created (if not already created)

---

### TC-PW-005: Initiate Advance Payment Successfully
**Priority:** High
**Feature:** Payment Initiation

**Steps:**
1. Login as client lead
2. Navigate to project with accepted terms
3. Click "Pay Advance" button
4. Verify redirect to payment page

**Expected:**
- ✓ Payment record created with status INITIATED
- ✓ Razorpay order created successfully
- ✓ Order ID and amount displayed correctly
- ✓ Razorpay checkout opens with correct details
- ✓ Currency matches project currency (INR or USD)

---

### TC-PW-006: Initiate Balance Payment Successfully
**Priority:** High
**Feature:** Payment Initiation

**Steps:**
1. Login as client lead
2. Navigate to project with advance paid and beta approved
3. Click "Pay Balance" button
4. Verify redirect to payment page

**Expected:**
- ✓ Payment record created with status INITIATED
- ✓ Razorpay order created with balance amount
- ✓ Final deliverable preview shown but locked
- ✓ Payment page displays "Unlock Final Deliverable" message

---

### TC-PW-007: Prevent Duplicate Advance Payment
**Priority:** High
**Feature:** Payment Initiation

**Steps:**
1. Login as client lead
2. Navigate to project with advance already paid
3. Attempt to initiate advance payment again

**Expected:**
- ✓ Error message displayed: "Advance payment already completed"
- ✓ No new payment record created
- ✓ No Razorpay order created
- ✓ User redirected to project dashboard

---

### TC-PW-008: Prevent Balance Payment Before Advance
**Priority:** High
**Feature:** Payment Initiation

**Steps:**
1. Login as client lead
2. Navigate to project with no advance payment
3. Attempt to initiate balance payment

**Expected:**
- ✓ Error: "Advance payment required before balance"
- ✓ User cannot access balance payment page
- ✓ System shows advance payment prompt instead

---

### TC-PW-009: Non-Client Lead Cannot Initiate Payment
**Priority:** High
**Feature:** Payment Authorization

**Steps:**
1. Login as client team member (not lead)
2. Navigate to project payment page
3. Attempt to initiate payment

**Expected:**
- ✓ 403 Forbidden error
- ✓ Message: "Only client lead can initiate payments"
- ✓ Pay button disabled or hidden
- ✓ Contact client lead message displayed

---

### TC-PW-010: INR Payment Initiation
**Priority:** High
**Feature:** Multi-Currency

**Steps:**
1. Login as client lead for INR project
2. Initiate advance payment for ₹80,000 project
3. Verify Razorpay order

**Expected:**
- ✓ Amount displayed: ₹40,000.00
- ✓ Currency: INR
- ✓ Razorpay amount: 4000000 paise
- ✓ UPI payment option available

---

### TC-PW-011: USD Payment Initiation
**Priority:** High
**Feature:** Multi-Currency

**Steps:**
1. Login as client lead for USD project
2. Initiate advance payment for $1,000 project
3. Verify Razorpay order

**Expected:**
- ✓ Amount displayed: $500.00
- ✓ Currency: USD
- ✓ Razorpay amount: 50000 cents
- ✓ Card payment required (UPI not available)

---

### TC-PW-012: Payment Initiation Without Terms Acceptance
**Priority:** High
**Feature:** Payment Prerequisites

**Steps:**
1. Login as client lead
2. Navigate to project without accepted terms
3. Attempt to access payment page

**Expected:**
- ✓ Redirect to terms acceptance page
- ✓ Error: "Accept project terms before payment"
- ✓ Payment button not visible

---

## 2. Razorpay Integration (10 test cases)

### TC-PW-013: Successful UPI Payment
**Priority:** High
**Feature:** Razorpay Gateway

**Steps:**
1. Initiate advance payment (INR)
2. Select UPI payment method
3. Enter test UPI ID: success@razorpay
4. Complete payment

**Expected:**
- ✓ Webhook received with payment.captured event
- ✓ Payment status updated to COMPLETED
- ✓ Project payment status: ADVANCE_PAID
- ✓ Email sent to client and admin
- ✓ Production unlocked

---

### TC-PW-010: Successful Card Payment
**Priority:** High
**Feature:** Razorpay Gateway

**Steps:**
1. Initiate advance payment
2. Select card payment
3. Enter test card: 4111 1111 1111 1111
4. Complete payment

**Expected:**
- ✓ Payment processed successfully
- ✓ Payment method stored as CARD
- ✓ Transaction ID captured
- ✓ Payment completed timestamp recorded

---

### TC-PW-011: Failed Payment - Insufficient Funds
**Priority:** High
**Feature:** Payment Failure Handling

**Steps:**
1. Initiate payment
2. Use test card: 4000 0000 0000 0002 (decline)
3. Attempt payment

**Expected:**
- ✓ Payment status: FAILED
- ✓ Failure reason captured
- ✓ Error email sent to client
- ✓ Retry link provided
- ✓ Admin notified
- ✓ Project status unchanged

---

### TC-PW-012: Payment Gateway Timeout
**Priority:** Medium
**Feature:** Error Handling

**Steps:**
1. Initiate payment
2. Simulate gateway timeout (network interruption)
3. Wait for timeout period

**Expected:**
- ✓ Payment status remains PROCESSING
- ✓ System polls Razorpay API every 2 minutes
- ✓ After 15 minutes, admin alert triggered
- ✓ Manual review option available

---

### TC-PW-013: Webhook Signature Verification
**Priority:** High
**Feature:** Security

**Steps:**
1. Send webhook with invalid signature
2. Verify system response

**Expected:**
- ✓ Webhook rejected with 401 Unauthorized
- ✓ Payment status not updated
- ✓ Security alert logged
- ✓ Invalid webhook logged in payment_webhook_logs

---

### TC-PW-014: Duplicate Webhook Handling
**Priority:** High
**Feature:** Idempotency

**Steps:**
1. Complete payment successfully
2. Resend same webhook payload
3. Verify system behavior

**Expected:**
- ✓ Second webhook accepted (200 OK)
- ✓ No duplicate payment processing
- ✓ No duplicate emails sent
- ✓ Logged as duplicate in payment_webhook_logs

---

### TC-PW-015: Payment Verification After Redirect
**Priority:** High
**Feature:** Payment Verification

**Steps:**
1. Complete payment at Razorpay
2. Redirect back to portal
3. Verify payment signature

**Expected:**
- ✓ Signature validated successfully
- ✓ Payment marked as COMPLETED
- ✓ Success page displayed
- ✓ Project status updated

---

### TC-PW-016: Invalid Payment Signature
**Priority:** High
**Feature:** Security

**Steps:**
1. Complete payment
2. Tamper with redirect signature parameter
3. Return to portal

**Expected:**
- ✓ Signature verification fails
- ✓ Payment not marked complete
- ✓ Error: "Invalid payment signature"
- ✓ Security log entry created

---

### TC-PW-017: Razorpay Order Expiry
**Priority:** Medium
**Feature:** Order Management

**Steps:**
1. Initiate payment
2. Wait without completing (order expires after 24h)
3. Attempt to pay expired order

**Expected:**
- ✓ Razorpay rejects expired order
- ✓ Client prompted to reinitiate payment
- ✓ New order created if client retries

---

### TC-PW-018: Currency Mismatch Detection
**Priority:** High
**Feature:** Data Integrity

**Steps:**
1. Initiate INR payment
2. Webhook returns USD currency
3. Verify system response

**Expected:**
- ✓ Error detected: Currency mismatch
- ✓ Payment not completed
- ✓ Admin alerted immediately
- ✓ Manual review required

---

## 3. Invoice Management (6 test cases)

### TC-PW-019: Admin Upload Invoice Successfully
**Priority:** High
**Feature:** Invoice Upload

**Steps:**
1. Login as admin
2. Navigate to completed payment
3. Upload valid PDF invoice
4. Enter invoice number: INV-2025-00123

**Expected:**
- ✓ Invoice uploaded to S3
- ✓ Invoice record created in database
- ✓ Payment linked to invoice
- ✓ Email sent to client with attachment
- ✓ Invoice downloadable from portal

---

### TC-PW-020: Invoice Upload Validation - Wrong Format
**Priority:** Medium
**Feature:** Invoice Validation

**Steps:**
1. Login as admin
2. Attempt to upload .docx file as invoice

**Expected:**
- ✓ Error: "Only PDF files allowed"
- ✓ Upload rejected
- ✓ File not saved

---

### TC-PW-021: Invoice Upload - File Too Large
**Priority:** Medium
**Feature:** Invoice Validation

**Steps:**
1. Login as admin
2. Attempt to upload 15MB PDF

**Expected:**
- ✓ Error: "File exceeds 10MB limit"
- ✓ Upload rejected
- ✓ Suggestion to compress file

---

### TC-PW-022: Duplicate Invoice Number Prevention
**Priority:** High
**Feature:** Data Integrity

**Steps:**
1. Upload invoice with number INV-2025-00123
2. Attempt to upload another invoice with same number

**Expected:**
- ✓ Error: "Invoice number already exists"
- ✓ Second upload rejected
- ✓ Suggested unique invoice number displayed

---

### TC-PW-023: Invoice Email Resend
**Priority:** Medium
**Feature:** Invoice Distribution

**Steps:**
1. Navigate to completed payment with invoice
2. Click "Resend Invoice Email"
3. Verify email sent

**Expected:**
- ✓ Email sent immediately
- ✓ Success message displayed
- ✓ Email_sent_at timestamp updated
- ✓ Client receives invoice attachment

---

### TC-PW-024: Client Download Invoice
**Priority:** High
**Feature:** Invoice Access

**Steps:**
1. Login as client
2. Navigate to payment with invoice
3. Click "Download Invoice"

**Expected:**
- ✓ Signed S3 URL generated
- ✓ PDF downloads successfully
- ✓ Invoice displays correct details
- ✓ URL expires after 15 minutes

---

## 4. Payment Status & Tracking (7 test cases)

### TC-PW-025: Project Payment Status - Pending Advance
**Priority:** High
**Feature:** Status Tracking

**Steps:**
1. Login as client
2. View project with accepted terms, no payment
3. Check payment status

**Expected:**
- ✓ Status: PENDING_ADVANCE
- ✓ Amount due: 50% shown
- ✓ "Pay Now" button visible
- ✓ Production locked message displayed

---

### TC-PW-026: Project Payment Status - Advance Paid
**Priority:** High
**Feature:** Status Tracking

**Steps:**
1. View project after advance payment
2. Check payment status

**Expected:**
- ✓ Status: ADVANCE_PAID
- ✓ Paid amount: 50% displayed
- ✓ Remaining: 50% shown
- ✓ Production in progress indicator
- ✓ Invoice download link available

---

### TC-PW-027: Project Payment Status - Awaiting Balance
**Priority:** High
**Feature:** Status Tracking

**Steps:**
1. View project after beta approval
2. Check payment status

**Expected:**
- ✓ Status: AWAITING_BALANCE
- ✓ "Pay Balance" button prominent
- ✓ Final deliverable preview with lock icon
- ✓ Payment prompt displayed

---

### TC-PW-028: Project Payment Status - Fully Paid
**Priority:** High
**Feature:** Status Tracking

**Steps:**
1. View project after balance payment
2. Check payment status

**Expected:**
- ✓ Status: FULLY_PAID
- ✓ 100% paid indicator
- ✓ Both invoices accessible
- ✓ Final deliverable unlocked
- ✓ Expiry countdown displayed

---

### TC-PW-029: Payment History View
**Priority:** Medium
**Feature:** Transaction History

**Steps:**
1. Login as client
2. Navigate to project with multiple payments
3. View payment history

**Expected:**
- ✓ All payments listed chronologically
- ✓ Each payment shows: type, amount, date, status
- ✓ Invoice links for completed payments
- ✓ Receipt download available

---

### TC-PW-030: Admin Payment Dashboard
**Priority:** High
**Feature:** Admin Monitoring

**Steps:**
1. Login as admin
2. Navigate to payments dashboard
3. View payment summary

**Expected:**
- ✓ Total received displayed
- ✓ Pending payments count
- ✓ Overdue payments highlighted
- ✓ Recent transactions listed
- ✓ Filter and search functional

---

### TC-PW-031: Payment Analytics Report
**Priority:** Medium
**Feature:** Reporting

**Steps:**
1. Login as admin
2. Navigate to analytics
3. Select date range
4. View payment analytics

**Expected:**
- ✓ Total revenue by month/week
- ✓ Payment method breakdown
- ✓ Currency distribution
- ✓ Average payment time
- ✓ Exportable report

---

## 5. Access Control & Deliverables (7 test cases)

### TC-PW-032: Beta Deliverable Access (Before Balance)
**Priority:** High
**Feature:** Access Control

**Steps:**
1. Login as client with advance paid
2. Navigate to deliverable
3. Attempt to download

**Expected:**
- ✓ Beta version accessible
- ✓ Watermark visible
- ✓ Limited resolution (1080p max)
- ✓ Final version locked with payment prompt

---

### TC-PW-033: Final Deliverable Access (After Balance)
**Priority:** High
**Feature:** Access Control

**Steps:**
1. Complete balance payment
2. Navigate to deliverable
3. Download files

**Expected:**
- ✓ Final version unlocked
- ✓ No watermark
- ✓ Full resolution (4K) available
- ✓ All file formats accessible
- ✓ Source files included

---

### TC-PW-034: Deliverable Access Without Balance Payment
**Priority:** High
**Feature:** Access Control

**Steps:**
1. Navigate to final deliverable without balance paid
2. Attempt to download

**Expected:**
- ✓ Access blocked
- ✓ Payment prompt displayed
- ✓ "Pay ₹X to unlock" message shown
- ✓ Redirect to payment page option

---

### TC-PW-035: Deliverable Expiry Warning (7 Days)
**Priority:** Medium
**Feature:** Access Expiry

**Steps:**
1. Set system date to 358 days after delivery
2. Login as client
3. View deliverable

**Expected:**
- ✓ Warning banner displayed
- ✓ "7 days remaining" message
- ✓ Download prompt shown
- ✓ Email reminder sent

---

### TC-PW-036: Deliverable Access After Expiry
**Priority:** High
**Feature:** Access Expiry

**Steps:**
1. Set system date to 366 days after delivery
2. Login as client
3. Attempt to access deliverable

**Expected:**
- ✓ Access blocked
- ✓ "Access expired" message
- ✓ Contact support prompt
- ✓ Download links disabled

---

### TC-PW-037: Multiple Team Members Access
**Priority:** Medium
**Feature:** Team Access

**Steps:**
1. Login as different client team members
2. Access deliverables after balance paid

**Expected:**
- ✓ All team members can access
- ✓ Download tracked per user
- ✓ Same expiry date for all
- ✓ Access log recorded

---

### TC-PW-038: Admin Extend Deliverable Access
**Priority:** Low
**Feature:** Manual Override

**Steps:**
1. Login as admin
2. Navigate to expired deliverable
3. Manually extend access by 30 days

**Expected:**
- ✓ Expiry date updated
- ✓ Access re-enabled
- ✓ Client notified
- ✓ Audit log entry created

---

## 6. Email Notifications (10 test cases)

### TC-PW-039: Advance Payment Confirmation Email
**Priority:** High
**Feature:** Notifications

**Steps:**
1. Complete advance payment
2. Check client email

**Expected:**
- ✓ Email received within 1 minute
- ✓ Subject: "Payment Received - Production Starting Soon"
- ✓ Invoice attached as PDF
- ✓ Project link included
- ✓ Next steps clearly outlined

---

### TC-PW-040: Balance Payment Confirmation Email
**Priority:** High
**Feature:** Notifications

**Steps:**
1. Complete balance payment
2. Check client email

**Expected:**
- ✓ Email received within 1 minute
- ✓ Subject includes "Final Payment Received"
- ✓ Invoice attached
- ✓ Download link to final deliverable
- ✓ Expiry date mentioned

---

### TC-PW-041: Payment Failed Email
**Priority:** High
**Feature:** Notifications

**Steps:**
1. Fail payment intentionally
2. Check client email

**Expected:**
- ✓ Email sent immediately
- ✓ Failure reason explained
- ✓ Retry link provided
- ✓ Support contact included

---

### TC-PW-042: Advance Payment Reminder (Day 3)
**Priority:** Medium
**Feature:** Automated Reminders

**Steps:**
1. Accept terms but don't pay
2. Wait 3 days (or simulate)
3. Check client email

**Expected:**
- ✓ Reminder email sent on day 3
- ✓ Friendly tone maintained
- ✓ Payment link included
- ✓ Project details summarized

---

### TC-PW-043: Balance Payment Reminder (Day 3)
**Priority:** Medium
**Feature:** Automated Reminders

**Steps:**
1. Approve beta but don't pay balance
2. Wait 3 days
3. Check email

**Expected:**
- ✓ Reminder sent after 3 days
- ✓ Final deliverable mentioned
- ✓ Payment link active
- ✓ Benefits listed

---

### TC-PW-044: Invoice Ready Email
**Priority:** Medium
**Feature:** Notifications

**Steps:**
1. Admin uploads invoice
2. Check client email

**Expected:**
- ✓ Email sent immediately
- ✓ Invoice attached
- ✓ Invoice number in subject
- ✓ Portal link included

---

### TC-PW-045: Access Expiring Soon Email
**Priority:** Medium
**Feature:** Automated Reminders

**Steps:**
1. Simulate 7 days before expiry
2. Check client email

**Expected:**
- ✓ Warning email sent
- ✓ Urgency conveyed
- ✓ File sizes listed
- ✓ Download link prominent

---

### TC-PW-046: Admin Payment Received Notification
**Priority:** High
**Feature:** Admin Alerts

**Steps:**
1. Complete any payment
2. Check admin email (hello@motionify.studio)

**Expected:**
- ✓ Email sent immediately
- ✓ Subject includes [PAYMENT] tag
- ✓ Client and project details included
- ✓ Next action items listed
- ✓ Admin panel link provided

---

### TC-PW-047: Admin Payment Failed Alert
**Priority:** High
**Feature:** Admin Alerts

**Steps:**
1. Payment fails
2. Check admin email

**Expected:**
- ✓ Alert email sent immediately
- ✓ Subject includes [ALERT] tag
- ✓ Failure reason included
- ✓ Client contact info provided
- ✓ Action required stated

---

### TC-PW-048: Admin Overdue Payment Daily Digest
**Priority:** Medium
**Feature:** Admin Monitoring

**Steps:**
1. Have 3+ overdue payments
2. Wait for daily digest time (9 AM)
3. Check admin email

**Expected:**
- ✓ Daily email sent at scheduled time
- ✓ All overdue payments listed
- ✓ Days overdue for each shown
- ✓ Total amount calculated
- ✓ Action recommendations provided

---

## 7. Edge Cases & Error Handling (10 test cases)

### TC-PW-049: Concurrent Payment Attempts
**Priority:** High
**Feature:** Race Conditions

**Steps:**
1. Open two browser tabs
2. Initiate payment in both simultaneously
3. Observe behavior

**Expected:**
- ✓ Only one payment created
- ✓ Second attempt gets existing payment
- ✓ No duplicate Razorpay orders
- ✓ No database conflicts

---

### TC-PW-050: Payment During System Maintenance
**Priority:** Medium
**Feature:** Error Handling

**Steps:**
1. Simulate API downtime
2. Attempt payment initiation
3. Verify error handling

**Expected:**
- ✓ Friendly error message displayed
- ✓ "Try again later" guidance
- ✓ No partial payment created
- ✓ User can retry when system recovered

---

### TC-PW-051: Network Failure During Payment
**Priority:** Medium
**Feature:** Resilience

**Steps:**
1. Initiate payment
2. Disconnect network mid-transaction
3. Reconnect and check status

**Expected:**
- ✓ Payment status shows PROCESSING
- ✓ System polls Razorpay for status
- ✓ Eventually resolves to correct state
- ✓ No data corruption

---

### TC-PW-052: Refund Processing
**Priority:** Low
**Feature:** Refund Management

**Steps:**
1. Admin initiates refund for completed payment
2. Mark payment as REFUNDED
3. Verify system behavior

**Expected:**
- ✓ Payment status updated to REFUNDED
- ✓ Project payment status reverted
- ✓ Client notified via email
- ✓ Deliverable access revoked if applicable

---

### TC-PW-053: Database Transaction Rollback
**Priority:** High
**Feature:** Data Integrity

**Steps:**
1. Simulate database error during payment completion
2. Verify rollback behavior

**Expected:**
- ✓ All or nothing: complete rollback on error
- ✓ No partial updates
- ✓ Payment status consistent
- ✓ Error logged for debugging

---

### TC-PW-054: Invalid Currency in Webhook
**Priority:** High
**Feature:** Data Validation

**Steps:**
1. Send webhook with invalid currency (e.g., EUR)
2. Verify system response

**Expected:**
- ✓ Webhook rejected
- ✓ Error logged
- ✓ Admin alerted
- ✓ Payment not completed

---

### TC-PW-055: Extremely Large Payment Amount
**Priority:** Low
**Feature:** Edge Cases

**Steps:**
1. Create project with $1,000,000 total
2. Initiate advance payment ($500,000)
3. Verify handling

**Expected:**
- ✓ Amount displayed correctly
- ✓ No number overflow
- ✓ Razorpay accepts large amount
- ✓ All calculations accurate

---

### TC-PW-056: Zero Amount Payment (Edge Case)
**Priority:** Low
**Feature:** Validation

**Steps:**
1. Attempt to create payment with $0 amount
2. Verify rejection

**Expected:**
- ✓ Error: "Amount must be greater than 0"
- ✓ Payment not created
- ✓ Validation prevents zero payments

---

### TC-PW-057: Payment After Project Cancelled
**Priority:** Medium
**Feature:** Status Validation

**Steps:**
1. Cancel project
2. Attempt to initiate payment

**Expected:**
- ✓ Error: "Cannot pay for cancelled project"
- ✓ Payment page inaccessible
- ✓ Appropriate message displayed

---

### TC-PW-058: Session Timeout During Payment
**Priority:** Medium
**Feature:** Session Management

**Steps:**
1. Initiate payment
2. Wait for session timeout (30 min)
3. Return from Razorpay

**Expected:**
- ✓ Redirect to login page
- ✓ After login, payment verification attempted
- ✓ Success message shown if payment completed
- ✓ No payment lost

---

## Test Execution Guidelines

### Test Environments

**Local Development:**
- Database: Local PostgreSQL
- Razorpay: Test mode keys
- Email: Mailtrap
- Purpose: Unit and integration tests

**Staging:**
- Database: Staging Neon PostgreSQL
- Razorpay: Test mode keys
- Email: Mailtrap or test SES
- Purpose: Full E2E testing

**Production:**
- Database: Production Neon PostgreSQL
- Razorpay: Live mode keys
- Email: AWS SES
- Purpose: Limited smoke tests only

---

### Test Data Setup

**Test Users:**
```
Client Lead: client-lead@test.motionify.studio
Client Member: client-member@test.motionify.studio
Admin: admin@test.motionify.studio
```

**Test Projects:**
- Create INR project: ₹80,000 total
- Create USD project: $1,000 total
- Set various states (pending, advance paid, fully paid)

**Test Razorpay Credentials:**
```
Test Key ID: rzp_test_xxxxx
Test Key Secret: xxxxx
Test Webhook Secret: whsec_xxxxx
```

**Test Cards:**
- Success: 4111 1111 1111 1111
- Failure: 4000 0000 0000 0002
- 3D Secure: 5104 0600 0000 0008

**Test UPI:**
- Success: success@razorpay
- Failure: failure@razorpay

---

### Data Cleanup

After each test run:
```sql
-- Clean test payments
DELETE FROM payments WHERE initiated_by IN (
  SELECT id FROM users WHERE email LIKE '%@test.motionify.studio'
);

-- Clean test projects
DELETE FROM projects WHERE created_by IN (
  SELECT id FROM users WHERE email LIKE '%@test.motionify.studio'
);

-- Reset sequences if needed
ALTER SEQUENCE payments_id_seq RESTART;
```

---

### Automation Strategy

**Unit Tests (Jest/Vitest):**
- Payment validation logic
- Currency conversion
- Amount calculations
- State transitions
- Webhook signature verification

**Integration Tests (Supertest):**
- All API endpoints
- Database transactions
- Razorpay API mocking
- Email sending (mocked)

**E2E Tests (Playwright/Cypress):**
- Complete payment flows
- User journeys
- Multi-step scenarios
- Error handling

**Test Coverage Goal:** 80%+ for payment-critical code

---

### Continuous Integration

**Pre-commit:**
- Run unit tests
- Lint code

**Pull Request:**
- Run all unit tests
- Run integration tests
- Check test coverage

**Merge to Main:**
- Run full test suite
- Deploy to staging
- Run E2E tests on staging
- Performance tests

---

### Regression Testing

Run full regression suite when:
- Database schema changes
- API endpoint modifications
- Razorpay integration updates
- Payment logic changes
- Major dependency updates

**Regression Suite Runtime:** ~30 minutes

---

### Performance Testing

**Load Tests:**
- Simulate 100 concurrent payments
- Measure response times
- Check for bottlenecks
- Monitor database connections

**Stress Tests:**
- Push to failure point
- Measure recovery
- Test rate limiting

**Targets:**
- API response: < 500ms (p95)
- Payment initiation: < 1s
- Webhook processing: < 2s
- Email sending: < 5s

---

### Manual Testing Checklist

Before production release:

- [ ] Test in all supported browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Verify email rendering in Gmail, Outlook, Apple Mail
- [ ] Test with real Razorpay test account
- [ ] Verify webhook signature with Razorpay test keys
- [ ] Test invoice PDF generation and download
- [ ] Verify access control for all deliverable states
- [ ] Test expiry calculations
- [ ] Check audit logs completeness
- [ ] Verify admin dashboard metrics

---

### Known Issues & Workarounds

**Issue 1:** Razorpay webhook may arrive before redirect
- **Workaround:** Payment verification checks both webhook and redirect
- **Status:** By design, no fix needed

**Issue 2:** Email delivery delays (up to 5 min)
- **Workaround:** Queue system with retry
- **Status:** Monitoring, acceptable for transactional emails

---

### Test Metrics Tracking

Track for each test run:
- Total tests: 58
- Passed: X
- Failed: X
- Skipped: X
- Duration: X minutes
- Coverage: X%
- Flaky tests: X

Review and improve tests with >5% failure rate.

## Test Summary

| Category | Total Tests | High | Medium | Low |
|----------|-------------|------|--------|-----|
| Payment Initiation | 12 | 12 | 0 | 0 |
| Razorpay Integration | 6 | 5 | 1 | 0 |
| Invoice Management | 6 | 3 | 3 | 0 |
| Payment Status | 7 | 5 | 2 | 0 |
| Access Control | 7 | 4 | 2 | 1 |
| Email Notifications | 3 | 3 | 0 | 0 |
| **TOTAL** | **41** | **32** | **8** | **1** |

## Automation Strategy

### Priority for Automation
1. **High Priority (32 tests)**: Critical payment flows, security checks, and access control. Must be automated.
2. **Medium Priority (8 tests)**: Edge cases and validation. Automate where possible.
3. **Low Priority (1 tests)**: Manual testing acceptable for admin overrides.

### Recommended Tools
- **Unit Tests**: Jest for calculation logic (TC-PW-001, TC-PW-002)
- **Integration Tests**: Supertest for API endpoints and Webhook handling
- **E2E Tests**: Playwright/Cypress for full payment flows (Initiate -> Pay -> Unlock)
- **Mocking**: Use `razorpay-mock` or similar for gateway simulation in non-prod environments.

### Regression Testing
Run full test suite after:
- Changes to payment calculation logic
- Updates to Razorpay SDK versions
- Modifications to access control middleware
