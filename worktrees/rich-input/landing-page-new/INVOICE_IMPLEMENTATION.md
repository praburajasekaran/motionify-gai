# Motionify Invoice & Email Functionality Implementation Guide

This document provides comprehensive documentation for the invoice generation, email delivery, payment processing, and receipt management system implemented in the Motionify application.

## 1. Overview

The Motionify invoice and email system provides a complete payment and billing workflow for the video production service platform. The implementation includes:

- **PDF Invoice Generation**: Create professional invoices and receipts using jsPDF library
- **Automatic Email Delivery**: Send payment confirmations, proforma invoices, and reminders via Resend
- **Proforma Invoices**: Generate preliminary invoices for client approval before payment
- **Payment History & Receipts**: Track all payment transactions and generate receipts
- **Razorpay Integration**: Process payments through India's leading payment gateway

The system is built with Next.js 16 App Router and uses a hybrid storage approach combining JSON files for local development and PostgreSQL for production deployments.

## 2. Features

### 2.1 PDF Invoice Generation

The PDF generation system creates professional, branded invoices and receipts.

**Location**: `src/lib/invoice/pdfGenerator.ts`

**Key Components**:

- `generateInvoicePDF(data: InvoiceData)`: Generates complete invoices with company branding, line items, tax calculations, and payment information
- `generateReceiptPDF(paymentData: PaymentData)`: Creates payment receipts with transaction details
- `downloadPDF(blob: Blob, filename: string)`: Handles browser-side PDF downloads
- `formatCurrency(amount, currency)`: Formats currency values (INR/USD)
- `formatDate(dateString)`: Formats dates in Indian format

**Invoice Features**:
- Brand-colored header with company logo/name
- Client billing information section
- Detailed line items with HSN codes support
- Tax calculations (GST)
- Discount handling
- Payment terms and notes
- Bank details section
- Razorpay payment link integration
- Professional footer with generation timestamp

**Receipt Features**:
- Payment confirmation status with checkmark
- Transaction details (Payment ID, Order ID, Signature)
- Invoice reference information
- Client billing details
- Payment received confirmation

### 2.2 Automatic Email Delivery

The email service handles all billing-related communications using the Resend API.

**Location**: `src/lib/email/emailService.ts`

**Email Types Supported**:

1. **Payment Confirmation Email**
   - Sent after successful payment processing
   - Includes attached invoice PDF
   - Contains transaction details and confirmation

2. **Proforma Invoice Email**
   - Sent when generating proforma invoices for proposals
   - Includes attached proforma PDF
   - Valid for 15 days (configurable)

3. **Payment Reminder Email**
   - Automated reminders for pending payments
   - Different templates for overdue vs. upcoming payments
   - Supports custom messages

**Email Templates** (`src/lib/email/templates.ts`):
- Responsive HTML design with Motionify branding
- Professional styling with primary color accent
- Mobile-responsive layout
- Invoice table with line items
- Payment details highlight boxes
- Call-to-action buttons
- Footer with support information

**Email Service Functions**:
- `sendPaymentConfirmationEmail(data)`: Send payment receipt
- `sendProformaInvoiceEmail(data)`: Send proforma invoice
- `sendPaymentReminderEmail(data)`: Send payment reminder
- `sendBulkPaymentReminders(recipients)`: Send batch reminders
- `verifyResendConnection()`: Test API connectivity

### 2.3 Proforma Invoices

Proforma invoices serve as preliminary invoices before final payment processing.

**Location**: `src/app/api/payments/proforma/[proposalId]/route.ts`

**Features**:
- Automatic proforma number generation (format: `PROF-YYYY-XXXX`)
- 15-day validity period
- Integrates with proposal data
- Supports PDF and JSON format responses
- Includes payment link for easy checkout

**Data Integration**:
- Pulls client details from inquiry records
- Uses proposal deliverables for line items
- Includes company bank details
- Razorpay key integration for payment links

### 2.4 Payment History & Receipts

Complete payment tracking with dual storage (JSON + PostgreSQL).

**Location**: `src/app/api/payments/history/route.ts`

**Features**:
- Query payments by user ID or project ID
- Complete transaction history
- Integration with project and proposal data
- Status tracking (pending/completed/failed)

**Payment Record Fields**:
- Unique payment ID
- Proposal and inquiry references
- Amount in paise (INR) or cents (USD)
- Currency type
- Payment type (advance/balance)
- Razorpay order and payment IDs
- Status tracking
- Timestamps (created, completed)

**Receipt Generation**:
- `POST /api/payments/send-receipt`: Generate and email payment receipt
- PDF generation with transaction details
- Email delivery with PDF attachment

## 3. Architecture

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Razorpay Checkout (Browser-side)                  │  │
│  │         PDF Download                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Layer                            │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │ create-order│  generate-  │   history   │     verify      │  │
│  │   (POST)    │  invoice    │   (GET)     │     (POST)      │  │
│  │             │   (POST)    │             │                 │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │  proforma   │ send-proforma│ send-receipt│                 │  │
│  │  (GET)      │   -email    │   (POST)    │                 │  │
│  │             │   (POST)    │             │                 │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  PDF Generator   │  │  Email Service   │  │  Payment     │  │
│  │  (jsPDF)         │  │  (Resend API)    │  │  Service     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Layer                                 │
│  ┌────────────────────┐           ┌────────────────────────┐   │
│  │   JSON Storage     │           │   PostgreSQL Database  │   │
│  │   (Local Dev)      │◄─────────►│   (Production)         │   │
│  │  - proposals.json  │           │   - payments table     │   │
│  │  - inquiries.json  │           │   - projects table     │   │
│  │  - payments.json   │           │   - users table        │   │
│  └────────────────────┘           └────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

#### Payment Flow

```
1. Client accepts proposal
   ↓
2. Frontend calls /api/payments/create-order
   ↓
3. Server creates Razorpay order, saves to storage
   ↓
4. Razorpay checkout displayed to client
   ↓
5. Payment success → Call /api/payments/verify
   ↓
6. Signature verification, status update
   ↓
7. Generate receipt PDF, send confirmation email
   ↓
8. Create project, send welcome email
```

#### Invoice Generation Flow

```
1. Request /api/payments/proforma/[proposalId]
   ↓
2. Fetch proposal and inquiry data
   ↓
3. Build invoice data structure
   ↓
4. Generate PDF using jsPDF
   ↓
5. Return PDF or JSON response
   ↓
6. Optional: Call /api/payments/send-proforma-email
   ↓
7. Send email with PDF attachment via Resend
```

### 3.3 File Structure

```
landing-page-new/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── payments/
│   │           ├── create-order/
│   │           │   └── route.ts         # Razorpay order creation
│   │           ├── generate-invoice/
│   │           │   └── route.ts         # PDF invoice generation
│   │           ├── history/
│   │           │   └── route.ts         # Payment history retrieval
│   │           ├── proforma/
│   │           │   └── [proposalId]/
│   │           │       └── route.ts     # Proforma invoice API
│   │           ├── send-proforma-email/
│   │           │   └── route.ts         # Email proforma invoice
│   │           ├── send-receipt/
│   │           │   └── route.ts         # Send payment receipt
│   │           └── verify/
│   │               └── route.ts         # Payment verification
│   │
│   ├── lib/
│   │   ├── db.ts                        # PostgreSQL connection
│   │   ├── storage.ts                   # JSON file storage
│   │   ├── razorpay-client.ts           # Razorpay client utilities
│   │   ├── payment.types.ts             # TypeScript types
│   │   │
│   │   ├── invoice/
│   │   │   ├── index.ts                 # Exports
│   │   │   └── pdfGenerator.ts          # PDF generation logic
│   │   │
│   │   └── email/
│   │       ├── index.ts                 # Exports
│   │       ├── types.ts                 # Email type definitions
│   │       ├── templates.ts             # HTML email templates
│   │       └── emailService.ts          # Email sending logic
│   │
│   └── services/
│       └── paymentService.ts            # Client-side payment handling
│
└── data/
    ├── proposals.json                   # Proposal storage
    ├── inquiries.json                   # Inquiry storage
    └── payments.json                    # Payment storage
```

### 3.4 Key Dependencies

```json
{
  "jspdf": "^4.0.0",              // PDF generation
  "jspdf-autotable": "^5.0.7",    // PDF tables
  "resend": "^6.6.0",             // Email delivery
  "razorpay": "^2.9.6",           // Payment processing
  "pg": "^8.16.3",                // PostgreSQL driver
  "nodemailer": "^7.0.12"         // Email (legacy)
}
```

## 4. API Endpoints

### 4.1 Create Payment Order

**Endpoint**: `POST /api/payments/create-order`

Creates a Razorpay payment order for a proposal.

**Request Body**:
```json
{
  "proposalId": "string",
  "amount": number,
  "currency": "INR" | "USD"
}
```

**Response**:
```json
{
  "id": "order_xxxxxxxx",
  "amount": 50000,
  "currency": "INR",
  "status": "created",
  "paymentRecordId": "timestamp_random"
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "details": "Additional details"
}
```

### 4.2 Generate Invoice PDF

**Endpoint**: `POST /api/payments/generate-invoice`

Generates a PDF invoice for a payment.

**Request Body**:
```json
{
  "paymentId": "string",
  "projectNumber": "string (optional)",
  "projectDetails": {
    "id": "string",
    "projectNumber": "string",
    "companyName": "string",
    "clientName": "string",
    "projectName": "string",
    "startDate": "string",
    "estimatedCompletion": "string"
  }
}
```

**Response**: PDF file download with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="invoice-XXXX.pdf"`

### 4.3 Get Payment History

**Endpoint**: `GET /api/payments/history`

Retrieves payment history for a user or project.

**Query Parameters**:
- `userId`: User ID (optional)
- `projectId`: Project ID (optional)

**Response**:
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment_id",
      "amount": 50000,
      "currency": "INR",
      "paymentType": "advance",
      "status": "completed",
      "razorpayOrderId": "order_xxx",
      "razorpayPaymentId": "pay_xxx",
      "paidAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:00:00Z",
      "project": {
        "id": "project_id",
        "projectNumber": "PRJ-001",
        "status": "active"
      }
    }
  ],
  "count": 1
}
```

### 4.4 Verify Payment

**Endpoint**: `POST /api/payments/verify`

Verifies Razorpay payment signature and updates payment status.

**Request Body**:
```json
{
  "razorpay_payment_id": "pay_xxxxxxxx",
  "razorpay_order_id": "order_xxxxxxxx",
  "razorpay_signature": "signature",
  "proposalId": "proposal_id"
}
```

**Response**:
```json
{
  "verified": true,
  "paymentRecord": {
    "id": "payment_id",
    "status": "completed",
    "razorpayPaymentId": "pay_xxx",
    "completedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4.5 Get Proforma Invoice

**Endpoint**: `GET /api/payments/proforma/[proposalId]`

Generates a proforma invoice for a proposal.

**Query Parameters**:
- `format`: Response format (`json` or `pdf`, default: `json`)

**JSON Response**:
```json
{
  "invoiceNumber": "PROF-2024-0001",
  "invoiceDate": "2024-01-15T00:00:00Z",
  "dueDate": "2024-01-30T00:00:00Z",
  "proposalId": "proposal_id",
  "clientDetails": {
    "name": "Client Name",
    "companyName": "Company Name",
    "email": "client@example.com"
  },
  "lineItems": [
    {
      "description": "Deliverable Name",
      "quantity": 1,
      "rate": 50000,
      "amount": 50000
    }
  ],
  "pricing": {
    "subtotal": 50000,
    "taxRate": 0,
    "taxAmount": 0,
    "total": 50000,
    "advancePercentage": 50,
    "advanceAmount": 25000,
    "balanceAmount": 25000,
    "currency": "INR"
  },
  "bankDetails": {
    "bankName": "HDFC Bank",
    "accountNumber": "50200012345678",
    "ifscCode": "HDFC0001234",
    "accountHolderName": "Motionify Technologies Pvt Ltd"
  },
  "razorpayDetails": {
    "keyId": "rzp_test_xxx",
    "paymentLink": "https://motionify.ai/payments/proforma/proposal_id"
  },
  "paymentUrl": "https://motionify.ai/payments/proforma/proposal_id"
}
```

**PDF Response**: Direct PDF file download

### 4.6 Send Proforma Email

**Endpoint**: `POST /api/payments/send-proforma-email`

Sends proforma invoice via email with PDF attachment.

**Request Body**:
```json
{
  "to": "client@example.com",
  "customerName": "Client Name",
  "invoiceNumber": "PROF-2024-0001 (optional)",
  "proposalId": "proposal_id"
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "resend_message_id",
  "invoiceNumber": "PROF-2024-0001"
}
```

### 4.7 Send Payment Receipt

**Endpoint**: `POST /api/payments/send-receipt`

Sends payment confirmation email with receipt PDF.

**Request Body**:
```json
{
  "paymentId": "payment_id",
  "projectId": "project_id (optional)",
  "projectNumber": "PRJ-001 (optional)",
  "paymentDetails": {
    "id": "payment_id",
    "amount": 50000,
    "currency": "INR",
    "paymentType": "advance",
    "razorpayPaymentId": "pay_xxx",
    "paidAt": "2024-01-15T10:30:00Z"
  },
  "projectDetails": {
    "id": "project_id",
    "projectNumber": "PRJ-001",
    "companyName": "Company Name",
    "clientName": "Client Name",
    "projectName": "Project Name",
    "startDate": "2024-01-15",
    "estimatedCompletion": "2024-02-15"
  }
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "resend_message_id",
  "invoiceNumber": "INV-XXXXXX-ABC",
  "pdfSize": 12345
}
```

## 5. Environment Variables

### 5.1 Required Variables

```bash
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxxxxx

# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_DOMAIN=resend.dev  # or your verified domain

# Database (Production)
DATABASE_URL=postgresql://user:password@host:5432/database

# Application
NEXT_PUBLIC_APP_URL=http://localhost:5174
```

### 5.2 Optional Variables

```bash
# Razorpay Additional Options
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxx

# Email Branding
NEXT_PUBLIC_COMPANY_NAME=Motionify
NEXT_PUBLIC_SUPPORT_EMAIL=support@motionify.ai

# Invoice Settings
NEXT_PUBLIC_INVOICE_VALIDITY_DAYS=15
NEXT_PUBLIC_TAX_RATE=0

# Bank Details (for Invoices)
BANK_NAME=HDFC Bank
BANK_ACCOUNT_NUMBER=50200012345678
BANK_IFSC_CODE=HDFC0001234
BANK_ACCOUNT_HOLDER=Motionify Technologies Pvt Ltd
```

### 5.3 Configuration Validation

The system validates Razorpay credentials at startup and API call time:

```typescript
// From create-order/route.ts
if (!keyId || !keySecret || keyId.includes('xxxxx') || keySecret.includes('xxxxx')) {
  console.warn('⚠️  Razorpay credentials not configured properly...');
  return NextResponse.json(
    { error: 'Razorpay not configured', ... },
    { status: 500 }
  );
}
```

## 6. Installation Steps

### 6.1 Prerequisites

- Node.js 18+ 
- npm or pnpm
- Razorpay account (for payment processing)
- Resend account (for email delivery)
- PostgreSQL database (for production)

### 6.2 Installation

1. **Clone and Navigate**
   ```bash
   cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy example env file
   cp .env.local.example .env.local
   
   # Edit with your credentials
   nano .env.local
   ```

4. **Set Up Razorpay**
   - Create account at https://dashboard.razorpay.com
   - Get test/live API keys
   - Add to `.env.local`:
     ```
     RAZORPAY_KEY_ID=rzp_test_xxxxx
     RAZORPAY_KEY_SECRET=xxxxx
     NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
     ```

5. **Set Up Resend**
   - Create account at https://resend.com
   - Get API key
   - (Optional) Verify domain for custom sender
   - Add to `.env.local`:
     ```
     RESEND_API_KEY=re_xxxxx
     RESEND_DOMAIN=resend.dev  # or your domain
     ```

6. **Set Up Database (Production)**
   ```bash
   # Create PostgreSQL database
   createdb motionify
   
   # Set connection string
   export DATABASE_URL="postgresql://user:pass@localhost:5432/motionify"
   ```

7. **Initialize Data Directory**
   ```bash
   mkdir -p data
   # JSON files will be created automatically
   ```

8. **Start Development Server**
   ```bash
   npm run dev
   ```

### 6.3 Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Set Production Environment Variables**
   ```bash
   # Set all required variables in production environment
   export NODE_ENV=production
   export RAZORPAY_KEY_ID=rzp_live_xxxxx
   export RAZORPAY_KEY_SECRET=xxxxx
   export RESEND_API_KEY=re_xxxxx
   export DATABASE_URL="postgresql://..."
   ```

3. **Run Database Migrations**
   ```bash
   # Create required tables
   npm run db:migrate
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

## 7. Usage Examples

### 7.1 Creating a Payment Order

**Client-side (React/TypeScript)**:

```typescript
import { createRazorpayOrder, openRazorpayCheckout } from '@/lib/razorpay-client';

async function initiatePayment(proposalId: string, amount: number) {
  try {
    // 1. Create order
    const order = await createRazorpayOrder(proposalId, amount, 'INR');
    
    // 2. Open checkout
    await openRazorpayCheckout({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Motionify',
      description: 'Video Production - Advance Payment',
      order_id: order.id,
      prefill: {
        name: 'Client Name',
        email: 'client@example.com',
        contact: '+919876543210'
      },
      handler: async (response) => {
        // 3. Handle successful payment
        const result = await verifyPayment(
          response.razorpay_payment_id,
          response.razorpay_order_id,
          response.razorpay_signature,
          proposalId
        );
        
        if (result.verified) {
          console.log('Payment successful!', result.paymentRecord);
        }
      }
    });
  } catch (error) {
    console.error('Payment failed:', error);
  }
}
```

### 7.2 Generating Proforma Invoice

**Server-side (API Call)**:

```bash
# Get proforma as JSON
curl "http://localhost:5174/api/payments/proforma/proposal_123?format=json"

# Download proforma as PDF
curl "http://localhost:5174/api/payments/proforma/proposal_123?format=pdf" \
  --output proforma-PROF-2024-0001.pdf
```

**Frontend (Next.js)**:

```typescript
async function downloadProforma(proposalId: string) {
  const response = await fetch(`/api/payments/proforma/${proposalId}?format=pdf`);
  const blob = await response.blob();
  
  // Trigger download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proforma-${proposalId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}
```

### 7.3 Sending Payment Receipt

**Server-side (API Call)**:

```bash
curl -X POST "http://localhost:5174/api/payments/send-receipt" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "1234567890",
    "paymentDetails": {
      "id": "1234567890",
      "amount": 25000,
      "currency": "INR",
      "paymentType": "advance",
      "razorpayPaymentId": "pay_abc123",
      "paidAt": "2024-01-15T10:30:00Z"
    },
    "projectDetails": {
      "id": "proj_001",
      "projectNumber": "PRJ-001",
      "companyName": "Acme Corp",
      "clientName": "John Doe",
      "projectName": "Product Video",
      "startDate": "2024-01-15",
      "estimatedCompletion": "2024-02-15"
    }
  }'
```

### 7.4 Sending Proforma Email

**Server-side (API Call)**:

```bash
curl -X POST "http://localhost:5174/api/payments/send-proforma-email" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "client@example.com",
    "customerName": "John Doe",
    "proposalId": "proposal_123"
  }'
```

### 7.5 Fetching Payment History

**Frontend (React)**:

```typescript
async function getPaymentHistory(projectId: string) {
  const response = await fetch(`/api/payments/history?projectId=${projectId}`);
  const data = await response.json();
  
  if (data.success) {
    console.log('Payments:', data.payments);
    return data.payments;
  }
  return [];
}
```

## 8. Testing Guide

### 8.1 Local Testing

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Razorpay Integration**
   - Use Razorpay test credentials
   - Test card numbers: 
     - Success: 4111 1111 1111 1111
     - Failed: 4000 0000 0000 0002
   - Use any future expiry date

3. **Test Email Delivery**
   - Check Resend dashboard for sent emails
   - Use verified emails for testing
   - Check spam folder for delivered emails

### 8.2 API Testing with curl

```bash
# Test create order
curl -X POST "http://localhost:5174/api/payments/create-order" \
  -H "Content-Type: application/json" \
  -d '{"proposalId": "test-proposal", "amount": 50000, "currency": "INR"}'

# Test payment verification
curl -X POST "http://localhost:5174/api/payments/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_payment_id": "pay_test",
    "razorpay_order_id": "order_test",
    "razorpay_signature": "sig_test",
    "proposalId": "test-proposal"
  }'

# Test payment history
curl "http://localhost:5174/api/payments/history?projectId=test-project"

# Test proforma invoice
curl "http://localhost:5174/api/payments/proforma/test-proposal"

# Test send receipt
curl -X POST "http://localhost:5174/api/payments/send-receipt" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "test-payment"}'

# Test send proforma email
curl -X POST "http://localhost:5174/api/payments/send-proforma-email" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "proposalId": "test-proposal"}'
```

### 8.3 Automated Testing

**Example Jest Test** (`tests/invoice.test.ts`):

```typescript
import { generateInvoicePDF, InvoiceData } from '@/lib/invoice/pdfGenerator';

describe('Invoice Generation', () => {
  it('should generate valid PDF invoice', async () => {
    const invoiceData: InvoiceData = {
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      companyDetails: {
        name: 'Motionify',
        address: 'Test Address',
        email: 'test@motionify.ai',
        phone: '+91 98765 43210',
      },
      clientDetails: {
        name: 'Test Client',
        email: 'client@test.com',
      },
      lineItems: [
        { description: 'Video Production', quantity: 1, rate: 50000, amount: 50000 }
      ],
      subtotal: 50000,
      taxRate: 0,
      taxAmount: 0,
      total: 50000,
      currency: 'INR',
    };

    const pdfBlob = await generateInvoicePDF(invoiceData);
    
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(0);
  });
});
```

### 8.4 Integration Testing

1. **Payment Flow Test**
   ```
   1. Create proposal → POST /api/proposals
   2. Create order → POST /api/payments/create-order
   3. Simulate payment (Razorpay test mode)
   4. Verify payment → POST /api/payments/verify
   5. Check payment status → GET /api/payments/history
   6. Send receipt → POST /api/payments/send-receipt
   ```

2. **Email Flow Test**
   ```
   1. Generate proforma → GET /api/payments/proforma/[id]
   2. Send proforma email → POST /api/payments/send-proforma-email
   3. Verify email in Resend dashboard
   ```

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue: Razorpay Credentials Not Configured

**Symptoms**:
```
❌ Razorpay credentials are not configured
```

**Solution**:
1. Check `.env.local` file exists and has valid credentials
2. Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
3. Ensure keys don't contain placeholder `xxxxx`
4. Restart development server after changes

```bash
# Verify environment variables
cat .env.local | grep RAZORPAY
```

#### Issue: Email Not Sending

**Symptoms**:
- Email API returns error
- No email in Resend dashboard

**Solution**:
1. Verify `RESEND_API_KEY` is set correctly
2. Check Resend account has sufficient credits
3. Verify recipient email is valid
4. Check spam folder

```typescript
// Test Resend connection
import { verifyResendConnection } from '@/lib/email';

const connected = await verifyResendConnection();
console.log('Resend connected:', connected);
```

#### Issue: PDF Generation Fails

**Symptoms**:
- PDF endpoint returns 500 error
- PDF not downloading properly

**Solution**:
1. Check `jspdf` and `jspdf-autotable` are installed
2. Verify invoice data structure is valid
3. Check server memory limits
4. Review server logs for specific errors

```bash
# Verify dependencies
npm list jspdf jspdf-autotable
```

#### Issue: Payment Verification Fails

**Symptoms**:
- Signature verification returns false
- Payment not marked as completed

**Solution**:
1. Verify `RAZORPAY_KEY_SECRET` is correct
2. Check signature generation matches Razorpay's method
3. Ensure order and payment IDs match exactly
4. Check timestamp freshness (prevent replay attacks)

```typescript
// Manual signature verification (debugging)
import crypto from 'crypto';

const hmac = crypto.createHmac('sha256', keySecret);
hmac.update(`${orderId}|${paymentId}`);
const expectedSignature = hmac.digest('hex');
```

#### Issue: Database Connection Failed

**Symptoms**:
- Payment not saving to PostgreSQL
- Query errors in logs

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check database server is running
3. Ensure user has required permissions
4. Check SSL configuration for production

```bash
# Test database connection
npm run db:test
```

### 9.2 Debug Logging

The system logs detailed information for troubleshooting:

```typescript
// Order creation logs
console.log('Creating Razorpay order with options:', options);
console.log('✅ Razorpay order created:', { orderId, amount, currency });

// Email logs
console.log('[EmailService] Email sent successfully:', { to, subject, messageId });

// Payment logs
console.log('Payment verification attempt:', { proposalId, paymentId, verified });
```

### 9.3 Error Codes

| Code | Message | Solution |
|------|---------|----------|
| `RAZORPAY_NOT_CONFIGURED` | Razorpay credentials missing | Set environment variables |
| `RESEND_API_ERROR` | Email service error | Check API key and account |
| `VALIDATION_ERROR` | Missing required fields | Check request body |
| `SIGNATURE_INVALID` | Payment verification failed | Verify Razorpay secret |
| `PROPOSAL_NOT_FOUND` | Proposal doesn't exist | Check proposal ID |
| `DATABASE_ERROR` | Database operation failed | Check connection string |

### 9.4 Log Locations

- **Development**: Console output (stdout)
- **Production**: Server logs (platform-specific)
- **Database**: PostgreSQL logs
- **Email**: Resend dashboard activity log

## 10. Future Enhancements

### 10.1 Planned Features

1. **Multi-currency Support**
   - USD, EUR, GBP support beyond INR
   - Dynamic currency conversion
   - Exchange rate integration

2. **Advanced Invoice Features**
   - Recurring invoices
   - Invoice templates customization
   - Bulk invoice generation
   - Invoice PDF branding options

3. **Payment Gateway Expansion**
   - Stripe integration
   - PayPal support
   - UPI payments
   - Bank transfer tracking

4. **Enhanced Email Features**
   - Email scheduling
   - Custom email templates
   - Multi-language support
   - Email open tracking

5. **Analytics Dashboard**
   - Revenue tracking
   - Payment success rates
   - Overdue invoice alerts
   - Financial reporting

### 10.2 Performance Optimizations

1. **Caching**
   - Redis cache for invoice data
   - Email template caching
   - CDN for PDF assets

2. **Database Improvements**
   - Connection pooling optimization
   - Indexed queries for history
   - Archive old payments

3. **Frontend Optimizations**
   - Lazy load PDF generation
   - Debounced email requests
   - Optimistic UI updates

### 10.3 Security Enhancements

1. **Payment Security**
   - Webhook signature verification
   - Rate limiting for API endpoints
   - IP allowlisting

2. **Data Protection**
   - Encryption at rest
   - GDPR compliance
   - Data retention policies

3. **Access Control**
   - Role-based permissions
   - Invoice access tokens
   - Audit logging

---

## Appendix

### A. TypeScript Interfaces

```typescript
// Invoice Data Interface
interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyDetails: CompanyDetails;
  clientDetails: ClientDetails;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: 'INR' | 'USD';
  paymentTerms?: string;
  notes?: string;
  bankDetails?: BankDetails;
  razorpayDetails?: RazorpayDetails;
}

// Payment Record Interface
interface PaymentRecord {
  id: string;
  proposalId: string;
  inquiryId: string;
  projectId?: string;
  amount: number;
  currency: 'INR' | 'USD';
  paymentType: 'advance' | 'balance';
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}
```

### B. Database Schema

```sql
-- Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  proposal_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255),
  payment_type VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_proposal ON payments(proposal_id);
CREATE INDEX idx_payments_project ON payments(project_id);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);
```

### C. Useful Links

- **Razorpay**: https://dashboard.razorpay.com
- **Resend**: https://resend.com
- **jsPDF**: https://github.com/parallax/jsPDF
- **Next.js**: https://nextjs.org/docs
- **PostgreSQL**: https://www.postgresql.org/docs/

---

**Document Version**: 1.0.0  
**Last Updated**: January 5, 2025  
**Maintained By**: Motionify Development Team
