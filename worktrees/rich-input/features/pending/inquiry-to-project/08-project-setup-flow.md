# Project Setup Flow

> **Version:** 1.0
> **Status:** Product Design Phase
> **Last Updated:** January 14, 2025

## Overview

This document describes the admin workflow for setting up project structure and payment terms after a customer accepts a proposal. This step occurs between proposal acceptance and payment, allowing the super admin to configure project details and trigger the payment request.

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROJECT SETUP WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Admin Reviews Accepted Proposal
    ↓
Super admin navigates to inquiry with accepted proposal
Reviews proposal details, customer requirements, and prior discussions
    ↓

STEP 2: Admin Creates Project Structure
    ↓
Super admin clicks "Setup Project"
Admin defines:
  - Project milestones (e.g., Pre-Production, Production, Post-Production)
  - Deliverables for each milestone
  - Project scope details
  - Timeline estimates
    ↓
System saves project structure (not yet creating project record)
    ↓

STEP 3: Admin Sets Payment Terms
    ↓
Super admin sets:
  - Total project cost (from proposal or adjusted)
  - Advance payment percentage (40%, 50%, 60%, etc.)
  - Currency (INR or USD)
    ↓
System calculates:
  - advance_amount = total_amount * advance_percentage / 100
  - balance_amount = total_amount - advance_amount
    ↓

STEP 4: Admin Triggers Payment Request
    ↓
Super admin reviews all details
Super admin clicks "Request Advance Payment"
    ↓
System:
  - Generates Razorpay payment link
  - Creates project_payment_status record
  - Sends payment request email to customer
  - Updates inquiry status to 'payment_pending'
    ↓

STEP 5: Customer Receives Payment Request
    ↓
Customer receives email with:
  - Project details
  - Total cost
  - Advance payment amount and percentage
  - Razorpay payment link
    ↓

STEP 6: Customer Completes Payment
    ↓
Customer clicks payment link
Customer completes payment at Razorpay
Payment webhook received
    ↓
System:
  - Creates customer account
  - Creates project record with saved structure
  - Sends welcome email with portal access
  - Updates inquiry status to 'converted'
    ↓

PROJECT ACTIVE ✓
```

## Key Features

### 1. Project Structure Capture

Before payment, the super admin captures:
- **Milestones**: Project phases with estimated timelines
- **Deliverables**: Specific outputs for each milestone
- **Scope Details**: Additional project requirements from discussions
- **Timeline**: Estimated project duration

This ensures all project details are captured before the customer pays, providing clarity and preventing scope creep.

### 2. Configurable Payment Terms

The super admin can set:
- **Total Amount**: Final project cost (may differ from proposal if adjusted)
- **Advance Percentage**: Flexible percentage (40%, 50%, 60%, etc.)
- **Currency**: INR or USD

The system automatically calculates:
- Advance amount
- Balance amount

### 3. Automated Payment Request

When admin triggers payment request:
- Razorpay payment link is generated automatically
- Payment request email is sent to customer
- Email includes all payment details and clear CTA
- System tracks payment request status

### 4. Immediate Account Creation

Upon successful payment:
- Customer account is created immediately
- Project record is created with saved structure
- Welcome email with portal access is sent
- Customer can access portal right away

## Data Flow

### Project Setup Record

```typescript
interface ProjectSetup {
  inquiryId: string;
  proposalId: string;
  totalAmount: number;
  advancePercentage: number;
  currency: 'INR' | 'USD';
  milestones: Milestone[];
  deliverables: Deliverable[];
  setupBy: string; // admin user ID
  setupAt: number;
  paymentRequestSent: boolean;
  paymentLink: string | null;
}
```

### Payment Status Record

```typescript
interface ProjectPaymentStatus {
  projectId: string;
  totalAmount: number;
  advancePercentage: number;
  advanceAmount: number; // calculated
  balanceAmount: number; // calculated
  paymentStatus: 'PENDING_ADVANCE';
}
```

## API Endpoints

### Setup Project

```
POST /api/admin/inquiries/:inquiryId/setup-project
```

Creates project structure and sets payment terms.

### Send Payment Request

```
POST /api/admin/projects/:projectId/send-payment-request
```

Resends payment request email (if needed).

## Email Templates

### Payment Request Email

**File:** `advance-payment-request.html`
**Trigger:** When admin triggers payment request
**Variables:**
- `{{customerName}}`
- `{{projectName}}`
- `{{totalAmount}}`
- `{{advanceAmount}}`
- `{{advancePercentage}}`
- `{{paymentLink}}`

See `features/payment-workflow/06-email-templates.md` for complete template.

## State Transitions

### Inquiry Status

```
accepted → payment_pending → paid → converted
```

### Project Payment Status

```
(not created) → PENDING_ADVANCE → ADVANCE_PAID → ...
```

## Benefits

1. **Clear Project Scope**: All details captured before payment
2. **Flexible Payment Terms**: Configurable advance percentage per project
3. **Automated Workflow**: Payment request sent automatically
4. **Immediate Access**: Customer gets portal access right after payment
5. **Audit Trail**: Complete record of project setup and payment terms

## Related Documentation

- [Payment Workflow](../payment-workflow/) - Payment processing and account creation
- [Inquiry to Project Workflow](./) - Overall inquiry-to-project flow
- [User Journey](./01-user-journey.md) - Complete customer journey



