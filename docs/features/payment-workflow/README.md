# Payment Workflow

> **Version:** 1.0
> **Status:** Ready for Implementation
> **Last Updated:** November 14, 2025

## Overview

The Payment Workflow manages the complete financial lifecycle of Motionify projects from initial configurable advance payment through final balance payment. This system integrates with Razorpay payment gateway, handles automated payment request emails, controls deliverable access based on payment status, and implements a 365-day access expiry policy.

**Core Functions:**
- Configurable advance payment structure (set per-project by super admin: 40%, 50%, 60%, etc.)
- Automated payment request emails with Razorpay payment links
- Razorpay payment gateway integration (INR & USD support)
- Automated email notifications for all payment events
- Payment-based deliverable access control
- Manual invoice upload and distribution by admin
- Comprehensive payment tracking and audit logs
- Automated reminders for overdue payments
- 365-day deliverable access with expiry warnings

## Customer Journey Summary

```
Admin Sets Project & Payment Terms → Payment Request Email Sent →
Customer Pays Advance (configurable %) → Production Begins →
Beta Delivery (watermarked) → Client Reviews →
Pay Balance → Final Deliverable Unlocked (no watermark) →
365-Day Access → Auto-Expiry
```

**Timeline:** Typical project completes both payments within 2-6 weeks

## Key Benefits

- **For Clients:**
  - Secure payment processing via Razorpay (PCI DSS compliant)
  - Clear payment milestones tied to deliverables
  - Beta review before final payment
  - Instant access to final files after payment
  - 365-day download access with expiry warnings

- **For Motionify:**
  - Configurable advance payment percentage per project (40%, 50%, 60%, etc.)
  - Automated payment request emails with Razorpay links
  - Automated payment tracking and reminders
  - No final deliverable release until full payment
  - Complete payment audit trail
  - Overdue payment alerts

- **For Both:**
  - Transparent payment status tracking
  - Automated invoice generation and distribution
  - Multiple payment methods (UPI, Card, Net Banking, Wallet)
  - Multi-currency support (INR, USD)
  - Email notifications at every step

## Documentation Structure

This feature is documented across 8 comprehensive files totaling **58 test cases** and **16 API endpoints**:

### 1. [User Journey](./01-user-journey.md) (3,200 lines)
Complete workflow including:
- Step-by-step customer journey from terms to expiry
- State transition diagrams for payment and project status
- Decision points (manual invoice upload, beta approval, access control)
- Automation triggers for emails and status updates
- Timeline estimates for typical and delayed scenarios
- Edge cases (payment failures, timeouts, refunds, access after expiry)
- Security & compliance requirements

### 2. [Wireframes](./02-wireframes.md) (12 screens)
ASCII wireframes for all screens:
- **Client-facing (9 screens):**
  - Advance payment required
  - Razorpay payment gateway
  - Payment success/failure
  - Project dashboard with payment status
  - Balance payment required
  - Final deliverable unlocked
  - Access expiry warnings
  - Access expired state
- **Admin (3 screens):**
  - Payment dashboard
  - Invoice upload
  - Transaction details with audit log
- **Mobile responsive** considerations included

### 3. [Data Models](./03-data-models.md) (790 lines)
TypeScript interfaces for:
- **Main Models:**
  - Payment (advance & balance transactions)
  - ProjectPaymentStatus (overall project payment state)
  - Invoice (manually uploaded PDFs)
  - DeliverableAccessControl (payment-based access management)
  - PaymentReminder (automated reminder emails)
- **Supporting Models:**
  - PaymentWebhookLog (Razorpay webhook audit)
  - PaymentAuditLog (complete action history)
- **Enum Types:** PaymentType, PaymentStatus, ProjectPaymentState, Currency, PaymentMethod, ReminderType, etc.
- **API Response Types** with examples
- **Validation Schemas** (Zod)
- Complete with INR and USD examples

### 4. [Database Schema](./04-database-schema.sql) (530 lines)
PostgreSQL schema with 7 tables:
- `payments` - Core payment transactions
- `project_payment_status` - Project-level payment tracking
- `invoices` - Admin-uploaded invoice PDFs
- `deliverable_access_control` - Access management
- `payment_reminders` - Automated reminder queue
- `payment_webhook_logs` - Razorpay webhook audit trail
- `payment_audit_logs` - Complete payment action history

**Includes:**
- 30+ indexes for performance
- 10 triggers for automation
- Foreign key constraints
- Check constraints for data integrity
- Comprehensive comments

### 5. [API Endpoints](./05-api-endpoints.md) (978 lines)
REST API specifications for 16 endpoints:
- **Client Endpoints (6):**
  - Initiate payment (advance/balance)
  - Verify payment after Razorpay redirect
  - Get payment status
  - Get payment history
  - Download invoice
  - Request payment reminder
- **Admin Endpoints (7):**
  - Get all payments (with filters & pagination)
  - Get payment details with audit logs
  - Upload invoice
  - Resend invoice email
  - Send payment reminder
  - Get overdue payments
  - Update payment status (manual override)
- **Webhook Endpoints (1):**
  - Razorpay webhook handler (with signature verification)
- **Reporting Endpoints (2):**
  - Payment analytics
  - Deliverable access status

**Includes:** Request/response examples, validation rules, error codes, rate limiting, currency handling, webhook security, testing guidelines

### 6. [Email Templates](./06-email-templates.md) (826 lines)
13 notification templates:
- **Client Emails (9):**
  - Advance payment confirmation (with invoice)
  - Balance payment confirmation (with invoice)
  - Payment failed (with retry link)
  - Advance payment reminder (Day 3)
  - Balance payment reminder (Day 3)
  - Invoice ready (when admin uploads)
  - Access expiring soon (7 days before)
  - Access expired
  - Refund processed
- **Admin Emails (4):**
  - Payment received notification
  - Payment failed alert
  - Invoice upload reminder (24h after payment)
  - Overdue payment daily digest

**Includes:** Handlebars templates, design guidelines, accessibility considerations, testing checklist, rate limiting, bounce handling, compliance requirements

### 7. [Test Cases](./07-test-cases.md) (1,205 lines)
58 comprehensive test scenarios covering:
- **Payment Initiation (8):** Advance/balance payment, duplicate prevention, authorization, multi-currency, prerequisites
- **Razorpay Integration (10):** UPI/card payments, failures, timeouts, webhook verification, idempotency, signature validation
- **Invoice Management (6):** Upload, validation, file size/format, duplicate prevention, resend, client download
- **Payment Status & Tracking (7):** All payment states, history view, admin dashboard, analytics
- **Access Control & Deliverables (7):** Beta vs final access, payment-based locking, expiry warnings, team access
- **Email Notifications (10):** All 13 email templates with timing and content verification
- **Edge Cases & Error Handling (10):** Concurrency, maintenance mode, network failures, refunds, rollbacks, session timeout

**Includes:** Test environments setup, test data, automation strategy (unit/integration/E2E), CI/CD integration, performance testing targets, manual testing checklist

### 8. Open Questions
*Not included - all payment workflow decisions have been documented and resolved*

## Technical Requirements

### Frontend (React + TypeScript)

**Components:**
- `PaymentInitiation` - Payment button and amount display
- `PaymentSuccess` - Success confirmation page
- `PaymentFailed` - Failure page with retry
- `PaymentStatus` - Project payment status widget
- `PaymentHistory` - Transaction list
- `InvoiceDownload` - Invoice access component
- `DeliverableAccessGuard` - Payment-based access control
- `ExpiryWarning` - Countdown and warning banners
- `AdminPaymentDashboard` - Admin overview
- `AdminInvoiceUpload` - Invoice upload form
- `AdminPaymentDetails` - Transaction detail view

**State Management:**
- Payment status (Redux/Zustand)
- Razorpay integration state
- Invoice data caching

**Third-Party:**
- Razorpay Checkout SDK
- PDF viewer (for invoices)

### Backend (Node.js + Express/NestJS)

**API Routes:**
- `POST /api/payments/initiate`
- `POST /api/payments/verify`
- `GET /api/projects/:id/payments/status`
- `GET /api/projects/:id/payments`
- `GET /api/payments/:id/invoice`
- `POST /api/admin/payments/:id/invoice`
- `POST /api/webhooks/razorpay`
- `GET /api/admin/payments`
- `GET /api/admin/analytics/payments`

**Services:**
- `PaymentService` - Core payment logic
- `RazorpayService` - Gateway integration
- `InvoiceService` - Invoice management
- `AccessControlService` - Deliverable access logic
- `ReminderService` - Automated reminder scheduling
- `WebhookService` - Webhook processing

**Background Jobs (Bull/BullMQ):**
- Payment reminder scheduler (daily cron)
- Expiry warning scheduler (daily cron)
- Webhook retry processor
- Email queue processor

### Infrastructure

**Database:**
- Neon PostgreSQL (7 new tables)
- Connection pooling for payments
- Read replicas for analytics

**Payment Gateway:**
- Razorpay (Test & Live mode)
- Webhook endpoint configuration
- Key management (environment variables)

**File Storage:**
- AWS S3 for invoice PDFs
- Signed URLs (15-minute expiry)
- Bucket lifecycle policies

**Email Service:**
- AWS SES (production)
- Mailtrap (development)
- Email queue with retry

**Monitoring:**
- Payment success/failure rates
- Webhook processing times
- Email delivery rates
- API response times
- Razorpay uptime alerts

## Implementation Phases

### Phase 1: Core Payment Flow (Week 1-2)
- Database schema implementation
- Payment initiation API
- Razorpay integration (basic)
- Payment verification
- Webhook handler
- Success/failure pages

**Deliverables:**
- Clients can initiate and complete payments
- Basic status tracking
- Webhook processing

### Phase 2: Access Control & Invoices (Week 2-3)
- Deliverable access control logic
- Beta vs final access implementation
- Admin invoice upload
- Invoice email distribution
- Payment status dashboard

**Deliverables:**
- Beta deliverables accessible after advance
- Final deliverables locked until balance
- Admin can upload and send invoices

### Phase 3: Automation & Polish (Week 3-4)
- Payment reminder system
- Expiry warning system
- Overdue payment alerts
- Admin analytics dashboard
- Email template refinement
- Error handling improvements

**Deliverables:**
- Automated reminders working
- Expiry warnings 7 days before
- Admin monitoring tools
- Production-ready system

**Estimated Timeline:** 4 weeks for complete implementation

**Estimated Effort:** 120-140 hours ($9,000-$10,500 at $75/hr)

## Success Metrics

**Payment Metrics:**
- Payment success rate: >95%
- Average payment time: <2 minutes from initiation to completion
- Webhook processing: <2 seconds
- Payment retry success rate: >60% (after initial failure)

**Operational Metrics:**
- Invoice upload time: <24 hours after payment (admin)
- Email delivery rate: >98%
- Zero unauthorized deliverable access
- Expiry warning delivery: 100% at 7 days before

**Financial Metrics:**
- Days to advance payment: <7 days average
- Days to balance payment: <14 days average
- Overdue payment rate: <10% of projects

**Technical Metrics:**
- API response time: <500ms (p95)
- Database query time: <100ms
- Zero data integrity issues
- Test coverage: >80% for payment code

## Security Considerations

**Payment Security:**
- No credit card data stored (Razorpay handles)
- PCI DSS compliance via Razorpay
- Webhook signature verification
- HTTPS only for all endpoints

**Access Control:**
- Only client lead can initiate payments
- Admin-only invoice upload
- Role-based deliverable access
- Audit logs for all actions

**Data Protection:**
- Encrypted database fields for sensitive data
- Signed S3 URLs for invoice downloads
- Rate limiting on all endpoints
- CSRF protection

## Compliance

**Financial:**
- Razorpay terms of service compliance
- Tax implications (future: GST integration)
- Invoice numbering standards

**Legal:**
- Payment terms in project contracts
- 365-day access policy in ToS
- Refund policy documentation

**GDPR/Privacy:**
- Payment data retention: 7 years (accounting)
- PII handling in audit logs
- Right to data access/deletion

## Monitoring & Alerts

**Critical Alerts:**
- Payment gateway downtime
- Webhook signature validation failures
- Database transaction errors
- S3 upload failures

**Warning Alerts:**
- Payment success rate drops below 90%
- Email delivery rate drops below 95%
- Invoice upload delay >48 hours
- Webhook processing time >5 seconds

**Daily Digests:**
- Overdue payments summary
- Payment volume and revenue
- Failed payment retry opportunities
- Upcoming deliverable expiries

## Related Documentation

- [Project Terms Acceptance Workflow](../project-terms-acceptance/)
- [Deliverable Approval Workflow](../deliverable-approval/)
- [Task Following Feature](../task-following/)
- [Inquiry to Project Workflow](../inquiry-to-project/)
- [Main Implementation Plan](/docs/IMPLEMENTATION_PLAN.md)
- [User Stories](/docs/user-stories.md)
- [API Documentation](/docs/api-documentation.md)

## Deployment Checklist

Before deploying to production:

- [ ] Razorpay live keys configured
- [ ] Webhook endpoint registered with Razorpay
- [ ] AWS SES verified and out of sandbox
- [ ] S3 bucket created with proper CORS
- [ ] Database migrations run on production
- [ ] All 58 test cases passing
- [ ] Load testing completed (100 concurrent payments)
- [ ] Email templates tested in all major clients
- [ ] Admin training completed
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set
- [ ] Rollback plan documented

## Assumptions & Constraints

**Assumptions:**
- Razorpay supports required currencies (INR, USD)
- Advance payment percentage is set per-project by super admin (flexible: 40%, 50%, 60%, etc.)
- Only client lead can authorize payments
- Invoice PDFs generated externally (not by system)
- Internet connectivity required for payment
- 365-day access period is non-negotiable
- Payment request emails are automatically sent when admin triggers payment request

**Constraints:**
- Maximum payment amount: ₹10,000,000 / $100,000
- Invoice file size limit: 10MB
- Webhook processing must complete in <30 seconds
- Email sending rate: 1000/hour
- Database storage: Unlimited retention for payment records

## Future Enhancements (Out of Scope)

- Subscription-based pricing models
- Installment payment plans (more than 2 payments)
- Cryptocurrency payment support
- Automated invoice generation
- Multi-currency automatic conversion
- Payment disputes and chargebacks handling
- Loyalty points / discount codes
- Split payments (multiple payers)
- Escrow services

## Questions or Feedback?

For questions about this feature specification:
- **Product:** Prabu Rajasekaran (prabu@motionify.studio)
- **Development:** Development Team Lead
- **Implementation:** Reference this documentation package

---

**Documentation Complete:** All 8 files provide a complete, implementation-ready specification for the Payment Workflow feature. Total documentation: ~7,000 lines covering every aspect from user journey to test cases.
