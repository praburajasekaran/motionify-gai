---
phase: PROD-07-payment-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-page-new/src/app/api/webhooks/razorpay/route.ts
  - netlify/functions/_shared/schemas.ts
  - database/migrations/002_payment_webhook_logs.sql
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Payment status updates even if user closes browser during payment"
    - "Payment confirmation does not depend on client-side callback alone"
    - "Duplicate payment events are handled without double-processing"
    - "Failed payments leave audit trail for troubleshooting"
  artifacts:
    - path: "landing-page-new/src/app/api/webhooks/razorpay/route.ts"
      provides: "Webhook endpoint for Razorpay events"
      exports: ["POST"]
    - path: "database/migrations/002_payment_webhook_logs.sql"
      provides: "Webhook audit log table"
      contains: "CREATE TABLE payment_webhook_logs"
  key_links:
    - from: "landing-page-new/src/app/api/webhooks/razorpay/route.ts"
      to: "payments table"
      via: "UPDATE on payment.captured event"
      pattern: "UPDATE payments.*status.*completed"
---

<objective>
Implement Razorpay webhook endpoint for reliable asynchronous payment confirmation.

Purpose: The client-side callback from Razorpay modal is optimistic UI - the webhook is the source of truth for payment completion. This handles edge cases where the user closes the browser mid-payment or network issues prevent the client callback.

Output: Working webhook endpoint at `/api/webhooks/razorpay` that receives, validates, and processes Razorpay payment events.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@.planning/phases/PROD-07-payment-integration/PROD-07-RESEARCH.md
@landing-page-new/src/app/api/payments/verify/route.ts
@features/pending/payment-workflow/04-database-schema.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create webhook migration and logging table</name>
  <files>database/migrations/002_payment_webhook_logs.sql</files>
  <action>
Create a new migration file to add the payment_webhook_logs table for audit trail.

Table schema (from features/pending/payment-workflow/04-database-schema.sql):
```sql
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event VARCHAR(100) NOT NULL,
  razorpay_event_id VARCHAR(255) UNIQUE,  -- For idempotency check
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  ip_address VARCHAR(45),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_webhook_logs_razorpay_event_id ON payment_webhook_logs(razorpay_event_id);
CREATE INDEX idx_payment_webhook_logs_razorpay_order_id ON payment_webhook_logs(razorpay_order_id);
CREATE INDEX idx_payment_webhook_logs_status ON payment_webhook_logs(status);
```

Note: razorpay_event_id is the `x-razorpay-event-id` header used for idempotency.
  </action>
  <verify>
```bash
# Verify migration file exists
ls -la database/migrations/002_payment_webhook_logs.sql

# Verify table creation statement
grep -E "CREATE TABLE.*payment_webhook_logs" database/migrations/002_payment_webhook_logs.sql

# Verify idempotency column exists
grep -E "razorpay_event_id.*UNIQUE" database/migrations/002_payment_webhook_logs.sql
```
  </verify>
  <done>Migration file ready to run on database</done>
</task>

<task type="auto">
  <name>Task 2: Implement Razorpay webhook endpoint</name>
  <files>landing-page-new/src/app/api/webhooks/razorpay/route.ts</files>
  <action>
Create the webhook endpoint to receive Razorpay events.

Key implementation points:
1. Use raw body text for signature verification (NOT parsed JSON) - critical for signature match
2. Verify signature using crypto.createHmac('sha256', webhookSecret).update(rawBody)
3. Check x-razorpay-event-id for idempotency before processing
4. Log webhook to payment_webhook_logs table regardless of processing outcome
5. Handle events: payment.captured (update status to completed), payment.failed (update status to failed)
6. Return 200 OK quickly to acknowledge receipt (Razorpay expects response within 5 seconds)

Environment variable: RAZORPAY_WEBHOOK_SECRET (separate from RAZORPAY_KEY_SECRET)

Webhook payload structure (from RESEARCH.md):
```typescript
interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: string;  // 'payment.captured', 'payment.failed', 'order.paid'
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;           // pay_XXXXX
        order_id: string;     // order_XXXXX
        amount: number;       // In paise
        currency: string;
        status: string;
        method: string;
        captured: boolean;
        error_code?: string;
        error_description?: string;
      };
    };
  };
  created_at: number;
}
```

Processing logic:
- payment.captured: UPDATE payments SET status='completed', razorpay_payment_id=$1, paid_at=NOW() WHERE razorpay_order_id=$2
- payment.failed: UPDATE payments SET status='failed' WHERE razorpay_order_id=$1 (only if not already completed)
- order.paid: Same as payment.captured (alternative event)

Return 200 even for duplicate events (idempotent).
  </action>
  <verify>
```bash
# Verify file exists
ls -la landing-page-new/src/app/api/webhooks/razorpay/route.ts

# Verify POST export
grep -E "export.*POST|export async function POST" landing-page-new/src/app/api/webhooks/razorpay/route.ts

# Verify raw body usage (request.text() before JSON.parse)
grep -E "request\.text\(\)|await.*text\(\)" landing-page-new/src/app/api/webhooks/razorpay/route.ts

# Verify idempotency check via event ID header
grep -E "x-razorpay-event-id|razorpay_event_id" landing-page-new/src/app/api/webhooks/razorpay/route.ts

# Verify build passes
cd landing-page-new && npm run build
```
  </verify>
  <done>Webhook endpoint implemented with signature verification and idempotent processing</done>
</task>

<task type="auto">
  <name>Task 3: Add webhook schema validation</name>
  <files>netlify/functions/_shared/schemas.ts</files>
  <action>
Add Zod schema for webhook payload validation (applied AFTER signature verification).

Add to schemas.ts:
```typescript
export const razorpayWebhookSchema = z.object({
  entity: z.literal('event'),
  account_id: z.string(),
  event: z.string(),
  contains: z.array(z.string()),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        method: z.string().optional(),
        captured: z.boolean().optional(),
        error_code: z.string().nullable().optional(),
        error_description: z.string().nullable().optional(),
      }),
    }).optional(),
  }),
  created_at: z.number(),
});
```

Note: This validates structure after signature is verified. Validation failure should still return 200 but log error (don't reject valid Razorpay webhooks due to schema drift).
  </action>
  <verify>
```bash
# Verify schema exported
grep -E "export.*razorpayWebhookSchema" netlify/functions/_shared/schemas.ts

# Verify build passes
cd netlify && npm run build
```
  </verify>
  <done>Webhook payload schema added for type safety</done>
</task>

</tasks>

<verification>
1. Migration file creates payment_webhook_logs table correctly
2. Webhook endpoint returns 200 for valid signature
3. Webhook endpoint returns 401 for invalid signature
4. Duplicate webhooks (same event ID) return 200 without re-processing
5. payment.captured event updates payment status to 'completed'
6. All builds pass
</verification>

<success_criteria>
- Webhook endpoint exists at /api/webhooks/razorpay
- Signature verification using raw body text
- Idempotent handling via event ID
- Payment status updated on payment.captured
- Webhook logged to payment_webhook_logs table
- Builds pass (Next.js and Netlify)
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-01-SUMMARY.md`
</output>
