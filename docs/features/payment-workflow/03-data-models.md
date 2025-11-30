# Data Models: Payment Workflow

## Table of Contents

1. [Main Models](#main-models)
2. [Supporting Models](#supporting-models)
3. [Enum Types](#enum-types)
4. [Relationships](#relationships)
5. [Validation Rules](#validation-rules)
6. [API Response Types](#api-response-types)
7. [Example Data](#example-data)

---

## Main Models

### Payment Interface

The core payment transaction model tracking both advance and balance payments.

```typescript
export interface Payment {
  // Core Identification
  id: string;                          // UUID
  projectId: string;                   // UUID - Foreign key to projects table

  // Payment Details
  type: PaymentType;                   // 'ADVANCE' | 'BALANCE'
  status: PaymentStatus;               // Current payment state
  amount: number;                      // Amount in smallest unit (paise for INR, cents for USD)
  currency: Currency;                  // 'INR' | 'USD' (selected by admin at project creation)

  // Razorpay Integration
  razorpayOrderId: string | null;      // Razorpay order ID (e.g., 'order_ABC123')
  razorpayPaymentId: string | null;    // Razorpay payment ID (e.g., 'pay_12345ABCDE')
  razorpaySignature: string | null;    // Webhook signature for verification
  gatewayResponse: object | null;      // Full gateway response JSON
  paymentMethod: PaymentMethod | null; // 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET'

  // User Tracking
  initiatedBy: string;                 // UUID - User who initiated payment
  initiatedAt: Date;                   // When payment was initiated
  completedAt: Date | null;            // When payment was confirmed

  // Invoice Management
  invoiceId: string | null;            // UUID - Foreign key to invoices table
  invoiceNumber: string | null;        // Human-readable invoice number
  invoiceUploadedAt: Date | null;      // When admin uploaded invoice
  invoiceUploadedBy: string | null;    // UUID - Admin who uploaded

  // Failure Handling
  failureReason: string | null;        // Reason for payment failure
  retryCount: number;                  // Number of retry attempts

  // Metadata
  metadata: Record<string, any>;       // Additional custom data
  createdAt: Date;
  updatedAt: Date;
}
```

### ProjectPaymentStatus Interface

Tracks the overall payment state of a project (separate from individual transactions).

**Single Source of Truth for Payment Data:**
- This model is the definitive source for ALL payment-related data throughout the project lifecycle
- Created when advance payment is received (via payment webhook)
- Initial values copied from ProjectSetup model (which is then deleted)
- Persists for the entire project duration and beyond
- All payment queries, updates, and reporting should use this model

**Relationship with ProjectSetup:**
- ProjectSetup (in inquiry-to-project) is a temporary staging model used during setup
- Once payment is received, ProjectSetup is deleted and ProjectPaymentStatus becomes the permanent record

```typescript
export interface ProjectPaymentStatus {
  projectId: string;                   // UUID - Primary key

  // Overall Status
  paymentStatus: ProjectPaymentState;  // Current project payment state

  // Currency (set by admin at project creation)
  currency: Currency;                  // 'INR' | 'USD'

  // Amounts (in smallest unit - paise for INR, cents for USD)
  totalAmount: number;                 // Total project cost in smallest unit
  advancePercentage: number;           // Advance payment percentage (40, 50, 60, etc.)
  advanceAmount: number;               // Advance amount (calculated: totalAmount * advancePercentage / 100)
  balanceAmount: number;               // Balance amount (calculated: totalAmount - advanceAmount)
  paidAmount: number;                  // Total amount paid so far in smallest unit
  remainingAmount: number;             // Amount still due in smallest unit

  // Payment References
  advancePaymentId: string | null;     // UUID - Reference to advance payment
  balancePaymentId: string | null;     // UUID - Reference to balance payment

  // Timeline
  advancePaidAt: Date | null;          // When advance was completed
  balancePaidAt: Date | null;          // When balance was completed

  // Metadata
  updatedAt: Date;
}
```

### Invoice Interface

Represents manually uploaded invoices by admin.

```typescript
export interface Invoice {
  // Core Identification
  id: string;                          // UUID
  projectId: string;                   // UUID - Foreign key to projects
  paymentId: string;                   // UUID - Foreign key to payments

  // Invoice Details
  invoiceNumber: string;               // e.g., 'INV-2025-00123'
  type: InvoiceType;                   // 'ADVANCE' | 'BALANCE' | 'FULL'
  amount: number;                      // Amount on invoice in smallest unit (paise for INR, cents for USD)

  // File Storage
  fileUrl: string;                     // S3/storage URL to PDF
  fileName: string;                    // Original file name
  fileSize: number;                    // File size in bytes

  // Admin Tracking
  uploadedBy: string;                  // UUID - Admin who uploaded
  uploadedAt: Date;                    // Upload timestamp

  // Email Tracking
  emailSent: boolean;                  // Whether email was sent
  emailSentAt: Date | null;            // When email was sent
  emailSentTo: string[];               // Array of recipient emails

  // Metadata
  notes: string | null;                // Optional admin notes
  createdAt: Date;
  updatedAt: Date;
}
```

### DeliverableAccessControl Interface

Tracks deliverable access based on payment status.

```typescript
export interface DeliverableAccessControl {
  // Core Identification
  id: string;                          // UUID
  projectId: string;                   // UUID
  deliverableId: string;               // UUID

  // Access Control
  requiresPayment: boolean;            // Whether payment is required for access
  requiredPaymentType: PaymentType | null; // 'ADVANCE' | 'BALANCE' | null
  isAccessible: boolean;               // Current accessibility state

  // Beta vs Final
  betaAvailable: boolean;              // Beta version available
  finalAvailable: boolean;             // Final version available (after balance paid)

  // Expiry Management
  expiryDate: Date | null;             // 365 days after delivery
  daysUntilExpiry: number | null;      // Calculated field
  isExpired: boolean;                  // Whether access has expired
  expiryWarningAt: Date | null;        // 7 days before expiry
  expiryWarningSent: boolean;          // Whether warning was sent

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### PaymentReminder Interface

Tracks automated payment reminder emails.

```typescript
export interface PaymentReminder {
  // Core Identification
  id: string;                          // UUID
  projectId: string;                   // UUID
  paymentId: string;                   // UUID

  // Reminder Details
  type: ReminderType;                  // Type of reminder
  status: ReminderStatus;              // 'PENDING' | 'SENT' | 'FAILED'

  // Scheduling
  scheduledFor: Date;                  // When to send
  sentAt: Date | null;                 // When actually sent

  // Recipients
  recipientEmail: string;              // Primary recipient
  recipientUserId: string;             // UUID - User receiving reminder

  // Content
  emailSubject: string;                // Email subject line
  emailTemplate: string;               // Template identifier

  // Note: v1 supports single manual reminders only
  // TODO v2: Add recurring reminder support (nextReminderAt, reminderSentCount, maxReminders)

  // Metadata
  attempts: number;                    // Number of send attempts
  lastError: string | null;            // Last error message if failed
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Supporting Models

### PaymentWebhookLog Interface

Audit log for all Razorpay webhook events.

```typescript
export interface PaymentWebhookLog {
  id: string;                          // UUID
  paymentId: string | null;            // UUID - Linked payment if found

  // Webhook Data
  event: string;                       // e.g., 'payment.captured'
  razorpayOrderId: string;             // Razorpay order ID
  razorpayPaymentId: string | null;    // Razorpay payment ID

  // Request Details
  payload: object;                     // Full webhook payload
  signature: string;                   // Webhook signature
  signatureVerified: boolean;          // Whether signature was valid

  // Processing
  status: WebhookStatus;               // 'RECEIVED' | 'PROCESSED' | 'FAILED'
  processedAt: Date | null;            // When webhook was processed
  error: string | null;                // Error message if processing failed

  // Metadata
  ipAddress: string;                   // Source IP of webhook
  userAgent: string | null;            // User agent header
  receivedAt: Date;                    // When webhook was received
  createdAt: Date;
}
```

### PaymentAuditLog Interface

Complete audit trail for all payment-related actions.

```typescript
export interface PaymentAuditLog {
  id: string;                          // UUID
  projectId: string;                   // UUID
  paymentId: string | null;            // UUID - Related payment if applicable

  // Action Details
  action: PaymentAction;               // Type of action performed
  actor: string;                       // UUID - User who performed action
  actorRole: UserRole;                 // Role of actor

  // Change Tracking
  previousState: object | null;        // State before action
  newState: object | null;             // State after action

  // Context
  description: string;                 // Human-readable description
  metadata: Record<string, any>;       // Additional context

  // Metadata
  timestamp: Date;                     // When action occurred
  ipAddress: string | null;            // Actor's IP address
  createdAt: Date;
}
```

---

## Enum Types

### PaymentType

```typescript
export type PaymentType =
  | 'ADVANCE'        // 50% advance payment to start production
  | 'BALANCE';       // 50% balance payment to unlock final deliverable
```

### PaymentStatus

```typescript
export type PaymentStatus =
  | 'INITIATED'      // Payment button clicked, creating Razorpay order
  | 'PROCESSING'     // At payment gateway, user completing payment
  | 'COMPLETED'      // Payment successful, confirmed by webhook
  | 'FAILED'         // Payment rejected/cancelled by gateway
  | 'REFUNDED';      // Payment was refunded (edge case)
```

### ProjectPaymentState

```typescript
export type ProjectPaymentState =
  | 'PENDING_ADVANCE'   // Terms accepted, awaiting 50% advance
  | 'ADVANCE_PAID'      // Advance paid, production can begin
  | 'BETA_DELIVERED'    // Beta delivery uploaded (optional state)
  | 'AWAITING_BALANCE'  // Beta approved, awaiting 50% balance
  | 'FULLY_PAID'        // Both payments complete, final deliverable accessible
  | 'PAYMENT_FAILED'    // Payment attempt failed
  | 'REFUND_ISSUED'     // Refund was processed
  | 'EXPIRED';          // 365 days elapsed, access revoked
```

### Currency

```typescript
export type Currency =
  | 'INR'            // Indian Rupee (₹)
  | 'USD';           // US Dollar ($)
```

### PaymentMethod

```typescript
export type PaymentMethod =
  | 'UPI'            // UPI payment (Google Pay, PhonePe, etc.) - INR only
  | 'CARD'           // Credit/Debit card - Both INR and USD
  | 'NET_BANKING'    // Internet banking - INR only
  | 'WALLET'         // Digital wallet (Paytm, etc.) - INR only
  | 'OTHER';         // Other payment methods
```

### InvoiceType

```typescript
export type InvoiceType =
  | 'ADVANCE'        // Invoice for advance payment
  | 'BALANCE'        // Invoice for balance payment
  | 'FULL';          // Combined invoice (edge case)
```

### ReminderType

```typescript
export type ReminderType =
  | 'ADVANCE_DUE'              // Reminder to pay advance (Day 3, 7 after terms)
  | 'BALANCE_DUE'              // Reminder to pay balance (Day 3, 7, 14 after beta)
  | 'ACCESS_EXPIRING_SOON'     // 7 days before deliverable expiry
  | 'ACCESS_EXPIRED';          // After deliverable expiry
```

### ReminderStatus

```typescript
export type ReminderStatus =
  | 'PENDING'        // Scheduled but not sent
  | 'SENT'           // Successfully sent
  | 'FAILED';        // Send attempt failed
```

### WebhookStatus

```typescript
export type WebhookStatus =
  | 'RECEIVED'       // Webhook received, queued for processing
  | 'PROCESSED'      // Successfully processed
  | 'FAILED';        // Processing failed
```

### PaymentAction

```typescript
export type PaymentAction =
  | 'PAYMENT_INITIATED'           // User clicked pay button
  | 'PAYMENT_COMPLETED'           // Payment confirmed by gateway
  | 'PAYMENT_FAILED'              // Payment rejected/cancelled
  | 'INVOICE_UPLOADED'            // Admin uploaded invoice
  | 'INVOICE_EMAIL_SENT'          // Invoice emailed to client
  | 'REMINDER_SENT'               // Payment reminder sent
  | 'DELIVERABLE_UNLOCKED'        // Final deliverable access granted
  | 'ACCESS_EXPIRED'              // Deliverable access revoked
  | 'ACCESS_EXTENDED'             // Admin manually extended access
  | 'REFUND_INITIATED'            // Admin initiated refund
  | 'REFUND_COMPLETED';           // Refund processed by gateway
```

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│    PROJECT      │
│  (projects)     │
└────────┬────────┘
         │
         │ 1:1
         ↓
┌─────────────────┐
│ PROJECT_PAYMENT │
│     _STATUS     │────────┐
└────────┬────────┘        │
         │                 │ references
         │ 1:N             │
         ↓                 ↓
┌─────────────────┐   ┌────────────┐
│    PAYMENT      │   │  PAYMENT   │
│   (payments)    │───│  (advance) │
└────────┬────────┘   │  (balance) │
         │            └────────────┘
         │ 1:1
         ↓
┌─────────────────┐
│    INVOICE      │
│   (invoices)    │
└─────────────────┘

┌─────────────────┐
│   DELIVERABLE   │
│ (deliverables)  │
└────────┬────────┘
         │
         │ 1:1
         ↓
┌─────────────────┐
│  DELIVERABLE_   │
│ ACCESS_CONTROL  │
└────────┬────────┘
         │
         │ references
         │
         ↓
     PAYMENT
   (balance_paid?)

┌─────────────────┐
│    PAYMENT      │
└────────┬────────┘
         │
         │ 1:N
         ↓
┌─────────────────┐
│ PAYMENT_WEBHOOK │
│      _LOG       │
└─────────────────┘

┌─────────────────┐
│    PAYMENT      │
└────────┬────────┘
         │
         │ 1:N
         ↓
┌─────────────────┐
│ PAYMENT_AUDIT   │
│      _LOG       │
└─────────────────┘

┌─────────────────┐
│    PAYMENT      │
└────────┬────────┘
         │
         │ 1:N
         ↓
┌─────────────────┐
│    PAYMENT_     │
│    REMINDER     │
└─────────────────┘
```

### Foreign Key Relationships

```typescript
// Payment belongs to Project
Payment.projectId → Project.id

// Payment initiated by User
Payment.initiatedBy → User.id

// Payment references Invoice
Payment.invoiceId → Invoice.id

// Invoice uploaded by Admin User
Invoice.uploadedBy → User.id

// ProjectPaymentStatus references Payments
ProjectPaymentStatus.advancePaymentId → Payment.id
ProjectPaymentStatus.balancePaymentId → Payment.id

// DeliverableAccessControl references Project and Deliverable
DeliverableAccessControl.projectId → Project.id
DeliverableAccessControl.deliverableId → Deliverable.id

// PaymentReminder references Payment and User
PaymentReminder.paymentId → Payment.id
PaymentReminder.recipientUserId → User.id

// Audit logs reference Payment
PaymentAuditLog.paymentId → Payment.id
PaymentAuditLog.actor → User.id
```

---

## Validation Rules

### Payment Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| amount | Yes | 1 | 10000000 | Positive number |
| type | Yes | - | - | ADVANCE \| BALANCE |
| status | Yes | - | - | Valid PaymentStatus |
| currency | Yes | - | - | ISO currency code (INR) |
| projectId | Yes | - | - | Valid UUID |
| initiatedBy | Yes | - | - | Valid UUID |

### Invoice Validation

| Field | Required | Min | Max | Format |
|-------|----------|-----|-----|--------|
| invoiceNumber | Yes | 5 | 50 | Pattern: INV-YYYY-XXXXX |
| amount | Yes | 1 | 10000000 | Positive number |
| fileUrl | Yes | - | - | Valid URL |
| fileName | Yes | - | - | Must end in .pdf |
| fileSize | Yes | 1 | 10485760 | Max 10MB |

### Validation Schemas (Zod)

```typescript
import { z } from 'zod';

export const PaymentSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['ADVANCE', 'BALANCE']),
  amount: z.number().positive().max(10000000),
  currency: z.enum(['INR', 'USD']),
  initiatedBy: z.string().uuid(),
});

export const InvoiceUploadSchema = z.object({
  paymentId: z.string().uuid(),
  invoiceNumber: z.string().regex(/^INV-\d{4}-\d{5}$/),
  file: z.object({
    size: z.number().max(10485760), // 10MB
    type: z.literal('application/pdf'),
    name: z.string().endsWith('.pdf'),
  }),
  notes: z.string().max(500).optional(),
});

export const RazorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        status: z.string(),
        method: z.string().optional(),
      }),
    }),
  }),
});
```

---

## API Response Types

### PaymentResponse

```typescript
export interface PaymentResponse {
  success: boolean;
  data: {
    payment: Payment;
    razorpayOrder: {
      id: string;
      amount: number;
      currency: string;
      key: string; // Razorpay public key for frontend
    };
  } | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}
```

### PaymentStatusResponse

```typescript
export interface PaymentStatusResponse {
  projectId: string;
  paymentStatus: ProjectPaymentState;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  advancePayment: Payment | null;
  balancePayment: Payment | null;
  nextAction: {
    required: boolean;
    type: 'PAY_ADVANCE' | 'PAY_BALANCE' | 'NONE';
    amount: number | null;
    message: string;
  };
}
```

### InvoiceUploadResponse

```typescript
export interface InvoiceUploadResponse {
  success: boolean;
  data: {
    invoice: Invoice;
    emailSent: boolean;
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
}
```

---

## Example Data

### Sample Payment (Advance)

```typescript
const sampleAdvancePayment: Payment = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: "660e8400-e29b-41d4-a716-446655440001",

  type: "ADVANCE",
  status: "COMPLETED",
  amount: 4000000,  // ₹40,000.00 in paise
  currency: "INR",

  razorpayOrderId: "order_ABC123XYZ789",
  razorpayPaymentId: "pay_12345ABCDE67890",
  razorpaySignature: "a1b2c3d4e5f6...",
  gatewayResponse: {
    id: "pay_12345ABCDE67890",
    amount: 4000000, // Amount in paise
    status: "captured",
    method: "upi",
  },
  paymentMethod: "UPI",

  initiatedBy: "770e8400-e29b-41d4-a716-446655440002",
  initiatedAt: new Date("2025-01-14T14:40:00Z"),
  completedAt: new Date("2025-01-14T14:45:00Z"),

  invoiceId: "880e8400-e29b-41d4-a716-446655440003",
  invoiceNumber: "INV-2025-00123",
  invoiceUploadedAt: new Date("2025-01-14T16:00:00Z"),
  invoiceUploadedBy: "990e8400-e29b-41d4-a716-446655440004",

  failureReason: null,
  retryCount: 0,

  metadata: {
    clientEmail: "john@acmecorp.com",
    projectName: "Acme Corp Product Explainer",
  },

  createdAt: new Date("2025-01-14T14:40:00Z"),
  updatedAt: new Date("2025-01-14T16:00:00Z"),
};
```

### Sample ProjectPaymentStatus

```typescript
const sampleProjectPaymentStatus: ProjectPaymentStatus = {
  projectId: "660e8400-e29b-41d4-a716-446655440001",

  paymentStatus: "ADVANCE_PAID",

  currency: "INR",

  totalAmount: 8000000,                // ₹80,000.00 in paise
  advancePercentage: 50,               // 50% advance
  advanceAmount: 4000000,              // Calculated: 8000000 * 50 / 100
  balanceAmount: 4000000,              // Calculated: 8000000 - 4000000
  paidAmount: 4000000,                 // ₹40,000.00 in paise
  remainingAmount: 4000000,            // ₹40,000.00 in paise

  advancePaymentId: "550e8400-e29b-41d4-a716-446655440000",
  balancePaymentId: null,

  advancePaidAt: new Date("2025-01-14T14:45:00Z"),
  balancePaidAt: null,

  updatedAt: new Date("2025-01-14T14:45:00Z"),
};
```

### Sample Invoice

```typescript
const sampleInvoice: Invoice = {
  id: "880e8400-e29b-41d4-a716-446655440003",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  paymentId: "550e8400-e29b-41d4-a716-446655440000",

  invoiceNumber: "INV-2025-00123",
  type: "ADVANCE",
  amount: 4000000,  // ₹40,000.00 in paise

  fileUrl: "https://s3.amazonaws.com/motionify-invoices/INV-2025-00123.pdf",
  fileName: "INV-2025-00123.pdf",
  fileSize: 245678, // bytes

  uploadedBy: "990e8400-e29b-41d4-a716-446655440004",
  uploadedAt: new Date("2025-01-14T16:00:00Z"),

  emailSent: true,
  emailSentAt: new Date("2025-01-14T16:01:00Z"),
  emailSentTo: ["john@acmecorp.com", "accounts@motionify.studio"],

  notes: "Advance payment invoice for Acme Corp project",

  createdAt: new Date("2025-01-14T16:00:00Z"),
  updatedAt: new Date("2025-01-14T16:01:00Z"),
};
```

### Sample DeliverableAccessControl

```typescript
const sampleAccessControl: DeliverableAccessControl = {
  id: "aa0e8400-e29b-41d4-a716-446655440005",
  projectId: "660e8400-e29b-41d4-a716-446655440001",
  deliverableId: "bb0e8400-e29b-41d4-a716-446655440006",

  requiresPayment: true,
  requiredPaymentType: "BALANCE",
  isAccessible: false, // Not accessible until balance paid

  betaAvailable: true,
  finalAvailable: false, // Will become true after balance payment

  expiryDate: null, // Will be set 365 days after final delivery
  daysUntilExpiry: null,
  isExpired: false,
  expiryWarningAt: null,
  expiryWarningSent: false,

  createdAt: new Date("2025-01-14T14:45:00Z"),
  updatedAt: new Date("2025-02-28T10:00:00Z"),
};
```

### Sample Payment (Balance - USD Project)

```typescript
const sampleBalancePaymentUSD: Payment = {
  id: "cc0e8400-e29b-41d4-a716-446655440007",
  projectId: "dd0e8400-e29b-41d4-a716-446655440008",

  type: "BALANCE",
  status: "COMPLETED",
  amount: 50000,   // $500.00 in cents
  currency: "USD",

  razorpayOrderId: "order_USD123XYZ",
  razorpayPaymentId: "pay_USD67890ABCDE",
  razorpaySignature: "x9y8z7w6v5...",
  gatewayResponse: {
    id: "pay_USD67890ABCDE",
    amount: 50000, // Amount in cents (for USD)
    status: "captured",
    method: "card",
  },
  paymentMethod: "CARD",

  initiatedBy: "ee0e8400-e29b-41d4-a716-446655440009",
  initiatedAt: new Date("2025-02-28T15:10:00Z"),
  completedAt: new Date("2025-02-28T15:15:00Z"),

  invoiceId: "ff0e8400-e29b-41d4-a716-446655440010",
  invoiceNumber: "INV-2025-00456",
  invoiceUploadedAt: new Date("2025-02-28T16:00:00Z"),
  invoiceUploadedBy: "990e8400-e29b-41d4-a716-446655440004",

  failureReason: null,
  retryCount: 0,

  metadata: {
    clientEmail: "jane@techstartup.io",
    projectName: "TechStartup Brand Video",
    exchangeRateUsed: 83.50, // INR per USD (if applicable for reporting)
  },

  createdAt: new Date("2025-02-28T15:10:00Z"),
  updatedAt: new Date("2025-02-28T16:00:00Z"),
};
```

