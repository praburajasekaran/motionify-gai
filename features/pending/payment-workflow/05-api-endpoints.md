# API Endpoints: Payment Workflow

## Base URL

```
Production: https://portal.motionify.studio/api
Development: http://localhost:3000/api
```

## Authentication

- **Client endpoints**: Require JWT token with client role
- **Admin endpoints**: Require JWT token with admin/super_admin role
- **Webhook endpoints**: Require Razorpay signature verification

All authenticated endpoints require `Authorization: Bearer <token>` header.

## Table of Contents

1. [Client Payment Endpoints](#client-payment-endpoints)
2. [Admin Payment Management](#admin-payment-management)
3. [Webhook Endpoints](#webhook-endpoints)
4. [Payment Status & Reporting](#payment-status--reporting)
5. [Error Responses](#error-responses)

---

## Client Payment Endpoints

### 1. Initiate Payment

Create a Razorpay order and initiate payment flow (advance or balance).

```
POST /api/payments/initiate
```

**Authentication:** Required (client lead only)

**Request Body:**
```json
{
  "projectId": "uuid",
  "type": "ADVANCE" // or "BALANCE"
}
```

**Validation:**
- `projectId`: Required, valid UUID, user must be client lead on project
- `type`: Required, must be 'ADVANCE' or 'BALANCE'
- Check: Payment of this type doesn't already exist for project
- Check: For BALANCE, advance payment must be completed
- Check: Payment terms must be set (advance_percentage must exist)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "type": "ADVANCE",
      "status": "INITIATED",
      "amount": 4000000, // Amount in smallest unit (paise for INR). Frontend displays as ₹40,000.00
      "currency": "INR"
    },
    "razorpayOrder": {
      "id": "order_ABC123XYZ789",
      "amount": 4000000, // Amount in paise (INR) or cents (USD)
      "currency": "INR",
      "key": "rzp_test_xxxxx" // Razorpay public key for frontend
    }
  }
}
```

**Side Effects:**
- Creates payment record in database with status 'INITIATED'
- Calculates payment amount based on `advance_percentage` from `project_payment_status`
- Creates Razorpay order via their API
- Logs action in payment_audit_logs

**Error Responses:**
- `400 Bad Request`: Validation failed or payment already exists
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not client lead on project
- `404 Not Found`: Project not found
- `500 Internal Server Error`: Razorpay API error

**Example Error:**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_ALREADY_EXISTS",
    "message": "Advance payment has already been initiated for this project",
    "field": "type"
  }
}
```

---

### 2. Verify Payment

Verify payment after Razorpay redirect (client redirected here after payment).

```
POST /api/payments/verify
```

**Authentication:** Required (client)

**Request Body:**
```json
{
  "paymentId": "uuid", // Our payment ID
  "razorpayOrderId": "order_ABC123XYZ789",
  "razorpayPaymentId": "pay_12345ABCDE67890",
  "razorpaySignature": "signature_string"
}
```

**Validation:**
- All fields required
- Verify Razorpay signature using secret key
- Payment must belong to authenticated user's project

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "COMPLETED",
      "completedAt": "2025-01-14T14:45:00Z"
    },
    "projectStatus": {
      "paymentStatus": "ADVANCE_PAID",
      "paidAmount": 4000000,
      "remainingAmount": 4000000
    }
  },
  "message": "Payment successful! Production will begin within 24 hours."
}
```

**Side Effects:**
- Updates payment status to 'COMPLETED'
- Updates project_payment_status
- Unlocks deliverables if applicable
- Sends email notifications to client and admin
- Logs action in payment_audit_logs
- Creates audit trail entry

**Error Responses:**
- `400 Bad Request`: Invalid signature or payment already verified
- `404 Not Found`: Payment not found
- `500 Internal Server Error`: Database error

---

### 3. Get Payment Status

Get current payment status for a project.

```
GET /api/projects/:projectId/payments/status
```

**Authentication:** Required (client team member)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "projectId": "660e8400-e29b-41d4-a716-446655440001",
    "paymentStatus": "ADVANCE_PAID",
    "currency": "INR",
    "totalAmount": 8000000, // ₹80,000 in paise. Frontend displays as ₹80,000.00
    "paidAmount": 4000000, // ₹40,000 in paise. Frontend displays as ₹40,000.00
    "remainingAmount": 4000000, // ₹40,000 in paise. Frontend displays as ₹40,000.00
    "advancePayment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 4000000, // In paise
      "status": "COMPLETED",
      "completedAt": "2025-01-14T14:45:00Z",
      "invoiceNumber": "INV-2025-00123",
      "invoiceUrl": "https://s3.../INV-2025-00123.pdf"
    },
    "balancePayment": null,
    "nextAction": {
      "required": false,
      "type": "NONE",
      "amount": null,
      "message": "Production in progress. Balance payment will be required after beta approval."
    }
  }
}
```

**Error Responses:**
- `404 Not Found`: Project not found or no payment status

---

### 4. Get Payment History

Get all payments for a project.

```
GET /api/projects/:projectId/payments
```

**Authentication:** Required (client team member)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "ADVANCE",
        "status": "COMPLETED",
        "amount": 4000000, // In paise
        "currency": "INR",
        "paymentMethod": "UPI",
        "initiatedAt": "2025-01-14T14:40:00Z",
        "completedAt": "2025-01-14T14:45:00Z",
        "invoiceNumber": "INV-2025-00123"
      }
    ],
    "totalPaid": 4000000,
    "totalRemaining": 4000000
  }
}
```

---

### 5. Download Invoice

Download invoice PDF for a payment.

```
GET /api/payments/:paymentId/invoice
```

**Authentication:** Required (client team member)

**Response (200 OK):**
- Redirects to signed S3 URL for invoice PDF
- URL valid for 15 minutes

**Error Responses:**
- `404 Not Found`: Payment or invoice not found
- `403 Forbidden`: Not authorized to access this invoice

---

### 6. Request Payment Reminder

Manually request a payment reminder email (if automated reminder failed).

```
POST /api/payments/:paymentId/remind
```

**Authentication:** Required (client lead)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment reminder email sent successfully"
}
```

**Side Effects:**
- Creates payment_reminder record
- Sends reminder email
- Increments reminder attempts counter

---

## Admin Payment Management

### 7. Set Payment Terms & Send Payment Request

Set payment terms for a project and automatically send payment request email to customer.

```
POST /api/admin/projects/:projectId/payment-terms
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "totalAmount": 8000000, // Amount in smallest unit (8000000 paise = ₹80,000)
  "advancePercentage": 50,
  "currency": "INR",
  "sendPaymentRequest": true
}
```

**Validation:**
- `totalAmount`: Required, positive integer in smallest units, max 1,000,000,000 (₹10,00,000 or $10,000)
- `advancePercentage`: Required, integer between 1 and 99
- `currency`: Required, must be 'INR' or 'USD'
- `sendPaymentRequest`: Optional boolean, defaults to true

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "projectId": "660e8400-e29b-41d4-a716-446655440001",
    "paymentStatus": {
      "totalAmount": 8000000, // In paise
      "advancePercentage": 50,
      "advanceAmount": 4000000, // Calculated: 8000000 * 50 / 100
      "balanceAmount": 4000000, // Calculated: 8000000 - 4000000
      "currency": "INR",
      "paymentStatus": "PENDING_ADVANCE"
    },
    "paymentLink": "https://rzp.io/i/ABC123XYZ",
    "emailSent": true,
    "emailSentAt": "2025-01-14T10:00:00Z"
  },
  "message": "Payment terms set and request email sent to customer"
}
```

**Side Effects:**
- Creates or updates `project_payment_status` record
- Calculates `advance_amount` and `balance_amount` based on percentage
- Generates Razorpay payment link
- Sends payment request email to customer (if `sendPaymentRequest` is true)
- Logs action in payment_audit_logs

**Error Responses:**
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not super admin
- `404 Not Found`: Project not found
- `500 Internal Server Error`: Email send failure or Razorpay API error

---

### 8. Send Payment Request Email (Resend)

Resend payment request email to customer with existing payment link.

```
POST /api/admin/projects/:projectId/send-payment-request
```

**Authentication:** Required (super_admin only)

**Request Body:**
```json
{
  "reminder": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "emailSent": true,
    "emailSentAt": "2025-01-14T10:05:00Z",
    "paymentLink": "https://rzp.io/i/ABC123XYZ"
  },
  "message": "Payment request email sent successfully"
}
```

**Side Effects:**
- Sends payment request email to customer
- Updates email sent timestamp
- Logs action in payment_audit_logs

**Error Responses:**
- `404 Not Found`: Project not found or payment terms not set
- `400 Bad Request`: Payment already completed

---

### 9. Get All Payments (Admin Dashboard)

Get paginated list of all payments across all projects.

```
GET /api/admin/payments
```

**Authentication:** Required (admin)

**Query Parameters:**
- `status` (optional): Filter by status (INITIATED, COMPLETED, FAILED)
- `type` (optional): Filter by type (ADVANCE, BALANCE)
- `projectId` (optional): Filter by project
- `dateFrom` (optional): Filter payments from date (ISO 8601)
- `dateTo` (optional): Filter payments to date (ISO 8601)
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "projectId": "660e8400-e29b-41d4-a716-446655440001",
        "projectName": "Acme Corp Product Explainer",
        "clientEmail": "john@acmecorp.com",
        "type": "BALANCE",
        "status": "COMPLETED",
        "amount": 4000000, // In paise
        "currency": "INR",
        "completedAt": "2025-02-28T15:15:00Z",
        "invoiceUploaded": true,
        "invoiceNumber": "INV-2025-00456"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 143,
      "totalPages": 8
    },
    "summary": {
      "totalReceived": 24000000, // In paise
      "pendingAmount": 8000000, // In paise
      "expectedThisMonth": 16000000 // In paise
    }
  }
}
```

---

### 10. Get Payment Details (Admin)

Get detailed payment information including audit logs.

```
GET /api/admin/payments/:paymentId
```

**Authentication:** Required (admin)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "projectName": "Acme Corp Product Explainer",
      "type": "ADVANCE",
      "status": "COMPLETED",
      "amount": 4000000, // In paise
      "currency": "INR",
      "razorpayOrderId": "order_ABC123XYZ789",
      "razorpayPaymentId": "pay_12345ABCDE67890",
      "paymentMethod": "UPI",
      "initiatedBy": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "John Doe",
        "email": "john@acmecorp.com"
      },
      "initiatedAt": "2025-01-14T14:40:00Z",
      "completedAt": "2025-01-14T14:45:00Z",
      "invoice": {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "invoiceNumber": "INV-2025-00123",
        "uploadedAt": "2025-01-14T16:00:00Z",
        "uploadedBy": "Admin User",
        "emailSent": true,
        "emailSentAt": "2025-01-14T16:01:00Z"
      },
      "gatewayResponse": {
        "id": "pay_12345ABCDE67890",
        "amount": 4000000,
        "status": "captured",
        "method": "upi"
      }
    },
    "auditLog": [
      {
        "timestamp": "2025-01-14T14:40:00Z",
        "action": "PAYMENT_INITIATED",
        "actor": "John Doe",
        "description": "Payment initiated by client"
      },
      {
        "timestamp": "2025-01-14T14:45:00Z",
        "action": "PAYMENT_COMPLETED",
        "actor": "System",
        "description": "Payment successful (UPI)"
      },
      {
        "timestamp": "2025-01-14T16:00:00Z",
        "action": "INVOICE_UPLOADED",
        "actor": "Admin User",
        "description": "Invoice uploaded by admin"
      }
    ]
  }
}
```

---

### 11. Upload Invoice

Upload invoice PDF for a completed payment.

```
POST /api/admin/payments/:paymentId/invoice
```

**Authentication:** Required (admin)

**Request:** Multipart form data

**Form Fields:**
- `file`: PDF file (required, max 10MB)
- `invoiceNumber`: String (required, format: INV-YYYY-XXXXX)
- `notes`: String (optional, max 500 chars)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "invoiceNumber": "INV-2025-00123",
      "fileUrl": "https://s3.../INV-2025-00123.pdf",
      "uploadedAt": "2025-01-14T16:00:00Z"
    },
    "emailSent": true
  },
  "message": "Invoice uploaded and email sent to client"
}
```

**Validation:**
- Payment must exist and be in COMPLETED status
- Invoice number must be unique
- File must be PDF format
- File size must be ≤ 10MB

**Side Effects:**
- Uploads file to S3/storage
- Creates invoice record in database
- Updates payment with invoice_id
- Sends invoice email to client (primary contact)
- Logs action in payment_audit_logs

**Error Responses:**
- `400 Bad Request`: Validation failed or duplicate invoice number
- `404 Not Found`: Payment not found
- `413 Payload Too Large`: File exceeds 10MB

---

### 12. Resend Invoice Email

Resend invoice email to client.

```
POST /api/admin/invoices/:invoiceId/resend-email
```

**Authentication:** Required (admin)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invoice email resent successfully"
}
```

---

### 13. Send Payment Reminder

Manually send payment reminder to client.

```
POST /api/admin/projects/:projectId/payment-reminder
```

**Authentication:** Required (admin)

**Request Body:**
```json
{
  "type": "ADVANCE_DUE" // or "BALANCE_DUE"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reminder": {
      "id": "uuid",
      "type": "ADVANCE_DUE",
      "sentAt": "2025-01-17T10:00:00Z",
      "recipientEmail": "john@acmecorp.com"
    }
  },
  "message": "Payment reminder sent successfully"
}
```

---

### 14. Get Overdue Payments

Get list of payments that are overdue.

```
GET /api/admin/payments/overdue
```

**Authentication:** Required (admin)

**Query Parameters:**
- `type` (optional): Filter by ADVANCE or BALANCE
- `daysOverdue` (optional): Minimum days overdue (default 3)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overduePayments": [
      {
        "projectId": "uuid",
        "projectName": "FoodCo Social Ads",
        "clientEmail": "contact@foodco.com",
        "type": "BALANCE",
        "amount": 2500000, // In paise
        "daysOverdue": 14,
        "lastReminderSent": "2025-02-20T10:00:00Z",
        "remindersSent": 2
      }
    ],
    "total": 3,
    "totalAmount": 9500000 // In paise
  }
  }
}
```

---

### 15. Update Payment Status (Manual Override)

Manually update payment status (for edge cases like manual refunds).

```
PATCH /api/admin/payments/:paymentId/status
```

**Authentication:** Required (admin)

**Request Body:**
```json
{
  "status": "REFUNDED",
  "reason": "Project cancelled, refund processed via Razorpay dashboard"
}
```

**Validation:**
- Status must be valid PaymentStatus enum value
- Reason required for status changes to REFUNDED or FAILED

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "status": "REFUNDED",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

**Side Effects:**
- Updates payment status
- Updates project_payment_status accordingly
- Sends notification to client
- Logs action in payment_audit_logs with admin details

---

## Webhook Endpoints

### 16. Razorpay Webhook

Receive and process Razorpay webhook events.

```
POST /api/webhooks/razorpay
```

**Authentication:** Razorpay signature verification

**Request Headers:**
- `X-Razorpay-Signature`: Webhook signature

**Request Body (example):**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_12345ABCDE67890",
        "order_id": "order_ABC123XYZ789",
        "amount": 4000000,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
        "captured": true,
        "created_at": 1705241100
      }
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Webhook Processing Logic:**
1. Verify Razorpay signature
2. Log webhook in payment_webhook_logs
3. Find payment by razorpay_order_id
4. Update payment status based on event:
   - `payment.captured` → COMPLETED
   - `payment.failed` → FAILED
5. If advance payment completed:
   - Create customer user account (if not exists)
   - Create project record (if not already created)
   - Generate magic link for portal access
   - Send welcome email with portal access
6. Update project_payment_status
7. Send notifications
8. Mark webhook as PROCESSED

**Supported Events:**
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `order.paid` - Order paid (alternative event)

**Side Effects:**
- Updates payment status
- Updates project_payment_status
- Creates customer account (if advance payment and account doesn't exist)
- Creates project record (if advance payment and project doesn't exist)
- Sends welcome email with portal access (if advance payment)
- Unlocks deliverables if balance payment
- Sends email notifications
- Creates audit log entries

**Error Responses:**
- `401 Unauthorized`: Invalid signature
- `400 Bad Request`: Invalid payload or payment not found
- `500 Internal Server Error`: Processing error

**Note:** Webhook endpoint must be idempotent (handle duplicate webhooks gracefully)

---

## Payment Status & Reporting

### 17. Get Payment Analytics

Get payment analytics for admin dashboard.

```
GET /api/admin/analytics/payments
```

**Authentication:** Required (admin)

**Query Parameters:**
- `dateFrom` (optional): Start date (ISO 8601)
- `dateTo` (optional): End date (ISO 8601)
- `groupBy` (optional): Group by 'day', 'week', 'month' (default 'month')

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReceived": 240000000, // In paise (₹24,00,000)
      "totalPending": 80000000, // In paise (₹8,00,000)
      "totalProjects": 15,
      "fullyPaidProjects": 8,
      "awaitingBalance": 5,
      "awaitingAdvance": 2
    },
    "byMonth": [
      {
        "month": "2025-01",
        "totalReceived": 80000000, // In paise
        "advancePayments": 6,
        "balancePayments": 4,
        "totalProjects": 10
      },
      {
        "month": "2025-02",
        "totalReceived": 120000000, // In paise
        "advancePayments": 8,
        "balancePayments": 8,
        "totalProjects": 16
      }
    ],
    "byPaymentMethod": {
      "UPI": 120000000, // In paise
      "CARD": 80000000, // In paise
      "NET_BANKING": 40000000 // In paise
    },
    "byCurrency": {
      "INR": 220000000, // In paise (₹22,00,000)
      "USD": 240000 // In cents ($2,400)
    }
  }
}
```

---

### 18. Get Deliverable Access Status

Check if client has access to deliverable based on payment.

```
GET /api/projects/:projectId/deliverables/:deliverableId/access
```

**Authentication:** Required (client team member)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isAccessible": true,
    "requiresPayment": true,
    "requiredPaymentType": "BALANCE",
    "paymentCompleted": true,
    "betaAvailable": true,
    "finalAvailable": true,
    "expiryDate": "2026-02-28T15:15:00Z",
    "daysUntilExpiry": 365,
    "isExpired": false
  }
}
```

**Response when access blocked:**
```json
{
  "success": true,
  "data": {
    "isAccessible": false,
    "requiresPayment": true,
    "requiredPaymentType": "BALANCE",
    "paymentCompleted": false,
    "betaAvailable": true,
    "finalAvailable": false,
    "message": "Complete balance payment to access final deliverable",
    "paymentRequired": {
      "type": "BALANCE",
      "amount": 4000000, // In paise
      "currency": "INR"
    }
  }
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName", // Optional, for validation errors
    "details": {} // Optional, additional error context
  }
}
```

### Error Codes

| HTTP Status | Code | Description | When |
|-------------|------|-------------|------|
| 400 | `VALIDATION_ERROR` | Request validation failed | Invalid input data |
| 400 | `PAYMENT_ALREADY_EXISTS` | Payment already initiated | Duplicate payment attempt |
| 400 | `PAYMENT_ALREADY_COMPLETED` | Payment already verified | Attempting to verify completed payment |
| 400 | `ADVANCE_PAYMENT_REQUIRED` | Advance not paid | Attempting balance payment without advance |
| 400 | `INVALID_SIGNATURE` | Razorpay signature invalid | Webhook or payment verification failed |
| 400 | `INVALID_PAYMENT_STATUS` | Payment not in valid state | Attempting action on wrong status |
| 401 | `UNAUTHORIZED` | Missing/invalid auth token | No or expired JWT token |
| 403 | `FORBIDDEN` | Insufficient permissions | User lacks required role |
| 403 | `NOT_CLIENT_LEAD` | User is not client lead | Only client lead can pay |
| 404 | `PAYMENT_NOT_FOUND` | Payment not found | Invalid payment ID |
| 404 | `PROJECT_NOT_FOUND` | Project not found | Invalid project ID |
| 404 | `INVOICE_NOT_FOUND` | Invoice not found | Invalid invoice ID |
| 409 | `DUPLICATE_INVOICE_NUMBER` | Invoice number exists | Invoice number must be unique |
| 413 | `FILE_TOO_LARGE` | File exceeds limit | Invoice file > 10MB |
| 415 | `INVALID_FILE_TYPE` | Invalid file format | Non-PDF file uploaded |
| 500 | `RAZORPAY_API_ERROR` | Razorpay API failed | External gateway error |
| 500 | `DATABASE_ERROR` | Database operation failed | Internal DB error |
| 500 | `EMAIL_SEND_FAILED` | Email could not be sent | Email service error |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Generic server error |

### Example Error Responses

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project ID is required",
    "field": "projectId"
  }
}
```

**Permission Error:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_CLIENT_LEAD",
    "message": "Only the client lead can initiate payments for this project",
    "details": {
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "clientLead": "john@acmecorp.com",
      "yourEmail": "jane@acmecorp.com"
    }
  }
}
```

**Razorpay Error:**
```json
{
  "success": false,
  "error": {
    "code": "RAZORPAY_API_ERROR",
    "message": "Failed to create Razorpay order. Please try again.",
    "details": {
      "razorpayError": "BAD_REQUEST_ERROR",
      "razorpayMessage": "Invalid API key"
    }
  }
}
```

---

## Rate Limiting

All endpoints are rate-limited:

- **Client endpoints**: 100 requests per 15 minutes per user
- **Admin endpoints**: 500 requests per 15 minutes per user
- **Webhook endpoints**: 1000 requests per minute (global)

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705242000
```

---

## Currency Handling

- **All amount values in API responses are integers in smallest currency unit (paise for INR, cents for USD)**
- Currency is explicitly specified in all responses
- This matches Razorpay's format and eliminates floating-point precision issues
- Frontend must divide by 100 for display (e.g., 4000000 paise → ₹40,000.00)

**Storage & API Response Format:**
- Database: Stores amounts as BIGINT in smallest units (e.g., 4000000 paise)
- API Response: Returns amounts as integers in smallest units (e.g., `"amount": 4000000`)
- Razorpay: Expects and returns amounts in smallest units (same format)
- Frontend Display: Divides by 100 and formats with currency symbol (e.g., ₹40,000.00)

**Example:**
- Database value: `4000000` (BIGINT)
- API response: `"amount": 4000000, "currency": "INR"`
- Razorpay amount: `4000000` paise
- Frontend display: `₹40,000.00`

---

## Webhook Security

### Signature Verification

All webhooks must verify Razorpay signature:

```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  return expectedSignature === signature;
}
```

### Idempotency

Webhook endpoint handles duplicate events gracefully:
- Check if webhook with same razorpay_payment_id already processed
- If yes, return 200 OK without reprocessing
- Log duplicate webhook in payment_webhook_logs

---

## Testing

### Test Razorpay Credentials

```
Test Key ID: rzp_test_xxxxx
Test Key Secret: xxxxx
```

### Test Card Numbers

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002

### Test UPI IDs

- **Success**: success@razorpay
- **Failure**: failure@razorpay

---

## Postman Collection

Complete Postman collection available at:
```
/docs/postman/payment-workflow.json
```

Import this collection for easy API testing with pre-configured requests and environment variables.
