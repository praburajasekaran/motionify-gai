# Phase PROD-07: Payment Integration - Research

**Researched:** 2026-01-28
**Domain:** Razorpay payment integration, payment verification, webhook handling
**Confidence:** HIGH (based on existing codebase implementation + official documentation)

## Summary

This phase focuses on production-readiness verification of an existing Razorpay payment integration. The codebase already has a functional payment system including: order creation, inline modal checkout, signature verification, payment status tracking, PDF receipt generation, and scheduled reminder emails.

The primary research focus is ensuring the existing implementation follows best practices for production: proper webhook handling for asynchronous payment confirmation, payment attempt logging for failure tracking, admin visibility dashboard, and multi-currency support (INR/USD).

Key areas requiring verification: webhook endpoint implementation (currently missing), payment attempt history logging, admin dashboard filters, GST calculation toggle, and 30-minute timeout handling for abandoned payments.

**Primary recommendation:** Implement the missing Razorpay webhook endpoint (`POST /api/webhooks/razorpay`) for reliable asynchronous payment confirmation, and add payment attempt logging to the existing flow.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| razorpay | ^2.9.6 | Server-side Razorpay SDK | Official SDK, already in codebase |
| crypto (Node.js built-in) | - | HMAC SHA256 signature verification | Standard for payment security |
| pg | ^8.16.3 | PostgreSQL client | Already in use for database operations |
| jspdf + jspdf-autotable | ^4.0.0 / ^5.0.7 | PDF receipt generation | Already in use, works well |
| resend | ^6.6.0 | Email delivery | Already in use for receipts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24.1 | Request validation | Already in use, validate webhook payloads |
| sonner | ^2.0.7 | Toast notifications | Already in use, payment status feedback |

### Existing in Codebase - No Additional Libraries Needed
The codebase has all required dependencies for payment integration. No new libraries required.

**Installation:**
```bash
# No new packages required - all dependencies exist
```

## Architecture Patterns

### Existing Payment Structure
```
landing-page-new/src/
├── lib/
│   ├── razorpay-client.ts      # Client-side Razorpay checkout
│   ├── payment.types.ts        # TypeScript interfaces
│   └── db.ts                   # PostgreSQL connection pool
├── services/
│   └── paymentService.ts       # Payment record management
├── components/payment/
│   ├── PaymentButton.tsx       # Checkout trigger component
│   └── PaymentBreakdown.tsx    # Pricing display component
└── app/
    ├── api/payments/
    │   ├── create-order/       # POST - Creates Razorpay order
    │   ├── verify/             # POST - Verifies payment signature
    │   ├── history/            # GET - Payment history
    │   ├── generate-invoice/   # POST - PDF generation
    │   └── send-receipt/       # POST - Email with PDF
    └── payment/
        ├── [proposalId]/       # Payment checkout page
        ├── success/            # Post-payment success page
        └── failure/            # Payment failure page
```

### Pattern 1: Inline Modal Checkout (Already Implemented)
**What:** Razorpay modal opens inline without redirect
**When to use:** Primary checkout flow
**Example:**
```typescript
// Source: Existing /landing-page-new/src/lib/razorpay-client.ts
const razorpay = new window.Razorpay({
  key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  handler: handlePaymentSuccess,  // Called on success
  modal: {
    ondismiss: () => resolve(false), // User closed modal
  },
});
razorpay.open();
```

### Pattern 2: Signature Verification (Already Implemented)
**What:** HMAC SHA256 verification of Razorpay response
**When to use:** All payment verification
**Example:**
```typescript
// Source: Existing /landing-page-new/src/app/api/payments/verify/route.ts
const hmac = crypto.createHmac('sha256', keySecret);
hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
const generated_signature = hmac.digest('hex');
const isSignatureValid = generated_signature === razorpay_signature;
```

### Pattern 3: Webhook Handler (To Be Implemented)
**What:** Endpoint to receive Razorpay async notifications
**When to use:** Backup payment confirmation, handles edge cases
**Example:**
```typescript
// Source: Razorpay Docs - https://razorpay.com/docs/webhooks/validate-test/
export async function POST(request: NextRequest) {
  // CRITICAL: Use raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventId = request.headers.get('x-razorpay-event-id');

  // Idempotency: Check if event already processed
  const existing = await checkWebhookProcessed(eventId);
  if (existing) {
    return NextResponse.json({ status: 'already_processed' });
  }

  // Process based on event type
  switch (payload.event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload);
      break;
    case 'payment.failed':
      await handlePaymentFailed(payload);
      break;
  }

  return NextResponse.json({ status: 'ok' });
}
```

### Anti-Patterns to Avoid
- **Using parsed JSON for webhook signature verification:** Use raw body text only. Parsing can alter JSON formatting.
- **No idempotency handling:** Razorpay may send duplicate webhooks. Use x-razorpay-event-id to dedupe.
- **Floating point amounts:** Amounts are in smallest units (paise/cents). Never use floats.
- **Skipping timeout handling:** Orders with no confirmation after 30 minutes should be marked failed.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature verification | Custom HMAC logic | `crypto.createHmac('sha256', secret)` | Standard, tested, secure |
| PDF generation | Custom canvas/text rendering | jsPDF + jspdf-autotable | Already in use, table support |
| Email delivery | Custom SMTP | Resend API | Already integrated, reliable |
| Currency formatting | String concatenation | `Intl.NumberFormat` | Locale-aware, edge cases handled |
| Scheduled reminders | Custom cron | Netlify Scheduled Functions | Already implemented at `/netlify/functions/scheduled-payment-reminder.ts` |

**Key insight:** The codebase already has robust payment infrastructure. Focus on filling gaps (webhooks, logging, admin dashboard) rather than rebuilding.

## Common Pitfalls

### Pitfall 1: Webhook Signature Mismatch
**What goes wrong:** Signature verification fails, webhooks rejected
**Why it happens:** Using parsed JSON body instead of raw text, or floating point precision issues
**How to avoid:** Always use `request.text()` for raw body. Never parse before verification.
**Warning signs:** 401 errors in Razorpay webhook logs, no async payment confirmations

### Pitfall 2: Duplicate Webhook Processing
**What goes wrong:** Payment recorded multiple times, incorrect balance
**Why it happens:** Razorpay retries failed webhook deliveries (24-hour exponential backoff)
**How to avoid:** Store and check `x-razorpay-event-id` header. Return 200 for duplicates.
**Warning signs:** Duplicate payment records, inflated revenue reports

### Pitfall 3: Missing Webhook for Edge Cases
**What goes wrong:** User pays but system doesn't know (closed browser, network issue)
**Why it happens:** Only relying on client-side callback
**How to avoid:** Webhook is the source of truth. Client callback is optimistic UI.
**Warning signs:** User complains payment succeeded but project not created

### Pitfall 4: Amount Mismatch
**What goes wrong:** Payment amount differs from expected
**Why it happens:** Using wrong unit (rupees vs paise), or frontend sending modified amount
**How to avoid:** Server recalculates expected amount from proposal. Never trust client-sent amount.
**Warning signs:** Payment verified but for wrong amount, potential fraud

### Pitfall 5: UPI Retry Behavior
**What goes wrong:** See `payment.failed` followed by `payment.captured` for same transaction
**Why it happens:** UPI allows retry after failure within same payment session
**How to avoid:** Design for this sequence. Don't mark project "cancelled" on first failure.
**Warning signs:** Confused payment status, premature cancellation notifications

## Code Examples

Verified patterns from official sources:

### Razorpay Webhook Event Types
```typescript
// Source: https://razorpay.com/docs/webhooks/payments/
type RazorpayWebhookEvent =
  | 'payment.authorized'   // Payment authorized, not yet captured
  | 'payment.captured'     // Payment captured (money received)
  | 'payment.failed'       // Payment failed
  | 'order.paid'           // Order fully paid (alternative to payment.captured)
  | 'refund.created'       // Refund initiated
  | 'refund.processed'     // Refund completed
```

### Webhook Payload Structure
```typescript
// Source: Razorpay API documentation
interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: string;  // e.g., 'payment.captured'
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;           // pay_XXXXX
        order_id: string;     // order_XXXXX
        amount: number;       // In paise
        currency: string;     // 'INR' or 'USD'
        status: string;       // 'captured', 'failed', etc.
        method: string;       // 'upi', 'card', 'netbanking', 'wallet'
        captured: boolean;
        created_at: number;   // Unix timestamp
        error_code?: string;
        error_description?: string;
      };
    };
  };
  created_at: number;
}
```

### Payment Attempt Logging Schema
```sql
-- Source: Existing schema at features/pending/payment-workflow/04-database-schema.sql
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event VARCHAR(100) NOT NULL,
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',  -- RECEIVED | PROCESSED | FAILED
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  ip_address VARCHAR(45),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### GST Calculation (18%)
```typescript
// Source: Context decision - optional GST toggle per proposal
function calculateWithGST(baseAmount: number, includeGST: boolean): {
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
} {
  if (!includeGST) {
    return { baseAmount, gstAmount: 0, totalAmount: baseAmount };
  }
  const gstAmount = Math.round(baseAmount * 0.18);  // 18% GST
  return { baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-only verification | Client + Webhook verification | Standard practice | Handles edge cases |
| JSON body for webhooks | Raw body text | Always | Prevents signature mismatch |
| Single currency | Multi-currency (INR/USD) | Already implemented | International clients |
| Manual reminders | Scheduled function (7-day soft reminder) | Already implemented | Automated follow-up |

**Deprecated/outdated:**
- Razorpay Payment Links for inline checkout: Use Orders API + Checkout.js instead (current implementation)
- Manual signature generation: Use `razorpay.utils.validateWebhookSignature()` in SDK (available if needed)

## Open Questions

Things that couldn't be fully resolved:

1. **Browser close behavior during payment**
   - What we know: Razorpay order persists for 30 minutes by default
   - What's unclear: Whether to create new order on return or reuse existing
   - Recommendation: Check for existing pending order before creating new. Mark as failed after 30 min timeout.

2. **Webhook failure handling strategy**
   - What we know: Razorpay retries with exponential backoff for 24 hours
   - What's unclear: When to trigger manual reconciliation
   - Recommendation: Log all webhook failures. Admin dashboard shows "unconfirmed" payments older than 30 min for manual review.

3. **Advance/final percentage split**
   - What we know: Existing system uses `advancePercentage` field per proposal
   - What's unclear: Whether percentage is configurable by admin or fixed
   - Recommendation: Based on CONTEXT.md - use existing implementation (likely 50/50 default, admin can adjust per proposal)

## Sources

### Primary (HIGH confidence)
- Existing codebase implementation at `/landing-page-new/src/app/api/payments/`
- Existing codebase implementation at `/landing-page-new/src/lib/razorpay-client.ts`
- Razorpay webhook documentation: https://razorpay.com/docs/webhooks/validate-test/
- Razorpay payment events: https://razorpay.com/docs/webhooks/payments/
- Database schema: `/features/pending/payment-workflow/04-database-schema.sql`
- API specification: `/features/pending/payment-workflow/05-api-endpoints.md`

### Secondary (MEDIUM confidence)
- [Razorpay webhook signature verification - GitHub Issues](https://github.com/razorpay/razorpay-node/issues/29)
- [Razorpay security checklist](https://razorpay.com/docs/security/checklist/)
- [Razorpay webhook events list](https://razorpay.com/docs/webhooks/all/)

### Tertiary (LOW confidence)
- Medium article on floating point precision issues (anecdotal but relevant warning)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase and working
- Architecture: HIGH - Existing patterns are solid, only webhook gap to fill
- Pitfalls: HIGH - Documented in official Razorpay docs and GitHub issues

**Research date:** 2026-01-28
**Valid until:** 60 days (payment integration is stable, Razorpay SDK versioning is slow)

---

## Implementation Gaps Summary

Based on research, these are the gaps between current implementation and CONTEXT.md requirements:

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Webhook endpoint | Missing | Need `POST /api/webhooks/razorpay` |
| Payment attempt history | Basic | Need full attempt logging (timestamp, error code, amount) |
| Admin payments dashboard | Missing | Need dedicated page with filters |
| 30-minute timeout | Not implemented | Need scheduled job or webhook-based cleanup |
| GST toggle | Not implemented | Need flag on proposal + breakdown display |
| Admin payment reminder button | Not implemented | Need manual trigger endpoint |
| Payment in client portal | Partial | Pay button exists on proposal page only, need in payments section too |
