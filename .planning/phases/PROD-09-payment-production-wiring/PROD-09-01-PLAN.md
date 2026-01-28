---
phase: PROD-09-payment-production-wiring
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-page-new/src/app/api/webhooks/razorpay/route.ts
  - netlify/functions/send-email.ts
autonomous: true

must_haves:
  truths:
    - "Admin receives email notification when payment fails via webhook"
    - "Client receives email confirmation when payment succeeds via webhook"
    - "Email failures do not block webhook processing"
  artifacts:
    - path: "landing-page-new/src/app/api/webhooks/razorpay/route.ts"
      provides: "Webhook handler with integrated email notifications"
      contains: "sendPaymentEmails"
    - path: "netlify/functions/send-email.ts"
      provides: "Payment success email template and POST handler"
      exports: ["sendPaymentSuccessEmail", "handler"]
  key_links:
    - from: "landing-page-new/src/app/api/webhooks/razorpay/route.ts"
      to: "/.netlify/functions/send-email"
      via: "HTTP fetch to Netlify Function endpoint"
      pattern: "fetch.*\\.netlify/functions/send-email"
---

<objective>
Wire payment notification emails into Razorpay webhook handler

Purpose: Close the gap where payment events are processed but no email notifications are sent. Admin needs to know about failures; clients need confirmation of successful payments.

Output: Webhook handler sends appropriate emails on payment.captured and payment.failed events
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-09-payment-production-wiring/PROD-09-RESEARCH.md

# Relevant source files
@landing-page-new/src/app/api/webhooks/razorpay/route.ts
@netlify/functions/send-email.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create payment success email template</name>
  <files>netlify/functions/send-email.ts</files>
  <action>
Add a new `sendPaymentSuccessEmail()` function after `sendPaymentFailureNotificationEmail()`:

```typescript
export async function sendPaymentSuccessEmail(data: {
  to: string;
  clientName: string;
  projectNumber: string;
  amount: string;
  currency: string;
  paymentType: 'advance' | 'balance';
  projectUrl: string;
}) {
  const paymentTypeLabel = data.paymentType === 'advance' ? 'Advance Payment' : 'Balance Payment';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>

      <h2 style="color: #16a34a; text-align: center;">Payment Successful!</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>Thank you! Your ${paymentTypeLabel.toLowerCase()} for project <strong>${data.projectNumber}</strong> has been received.</p>

      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Amount Paid:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #166534; font-size: 18px;">${data.currency} ${data.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Payment Type:</td>
            <td style="padding: 8px 0; color: #111827;">${paymentTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Project:</td>
            <td style="padding: 8px 0; color: #111827;">${data.projectNumber}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.projectUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Project</a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, please contact us at <a href="mailto:billing@motionify.studio" style="color: #7c3aed;">billing@motionify.studio</a>.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Studio<br>
        <a href="https://motionify.studio" style="color: #7c3aed;">motionify.studio</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Payment Confirmed - ${data.projectNumber} (${data.currency} ${data.amount})`,
    html,
  });
}
```

Follow the existing email template pattern used by other functions in the file.
  </action>
  <verify>
Run `npm run build` in landing-page-new to verify no TypeScript errors.
Grep for "sendPaymentSuccessEmail" to confirm function exists.
  </verify>
  <done>
sendPaymentSuccessEmail function exists in send-email.ts with proper HTML template.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add send-email POST handler for webhook calls</name>
  <files>netlify/functions/send-email.ts</files>
  <action>
The webhook runs in Next.js but email functions are in Netlify Functions. Add a POST handler to send-email.ts that the webhook can call:

1. **Add handler at the end of send-email.ts:**
```typescript
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { type, ...data } = body;

    let result;
    switch (type) {
      case 'payment_failure':
        result = await sendPaymentFailureNotificationEmail({
          to: data.to || process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@motionify.com',
          orderId: data.data?.orderId || 'unknown',
          paymentId: data.data?.paymentId,
          errorCode: data.data?.errorCode,
          errorDescription: data.data?.errorDescription,
          proposalId: data.data?.proposalId,
        });
        break;

      case 'payment_success':
        result = await sendPaymentSuccessEmail({
          to: data.to,
          clientName: data.clientName,
          projectNumber: data.projectNumber,
          amount: data.amount,
          currency: data.currency,
          paymentType: data.paymentType,
          projectUrl: data.projectUrl,
        });
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown email type: ${type}` }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, emailId: result?.id }),
    };
  } catch (error) {
    console.error('Send email handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
    };
  }
};
```

2. **Verify the import for Handler type** is at top of file.

This creates an HTTP endpoint that the webhook can call to send emails, maintaining separation between Next.js and Netlify Functions while enabling cross-service communication.
  </action>
  <verify>
Run `grep -n "export const handler" netlify/functions/send-email.ts` to confirm handler exists.
Run `grep -n "payment_success" netlify/functions/send-email.ts` to confirm switch case exists.
  </verify>
  <done>
send-email.ts has a POST handler that can be called from the webhook to send payment_failure and payment_success emails.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add email wrapper utility to webhook handler</name>
  <files>landing-page-new/src/app/api/webhooks/razorpay/route.ts</files>
  <action>
Add the email wrapper utility at the top of the webhook handler file (after existing imports):

```typescript
// Email helper - calls Netlify Function endpoint for cross-service email sending
const sendPaymentEmails = async () => {
  // Netlify Functions are at /.netlify/functions/ path in production
  // We call them via fetch to maintain separation
  return {
    sendFailureEmail: async (data: {
      orderId: string;
      paymentId?: string;
      errorCode?: string;
      errorDescription?: string;
      proposalId?: string;
    }) => {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@motionify.com';
      const baseUrl = process.env.INTERNAL_API_URL || process.env.URL || 'http://localhost:8888';
      try {
        await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_failure',
            to: adminEmail,
            data
          })
        });
      } catch (e) {
        console.error('[Webhook] Failed to send failure notification:', e);
      }
    },
    sendSuccessEmail: async (data: {
      to: string;
      clientName: string;
      projectNumber: string;
      amount: string;
      currency: string;
      paymentType: 'advance' | 'balance';
      projectUrl: string;
    }) => {
      const baseUrl = process.env.INTERNAL_API_URL || process.env.URL || 'http://localhost:8888';
      try {
        await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_success',
            ...data
          })
        });
      } catch (e) {
        console.error('[Webhook] Failed to send success notification:', e);
      }
    }
  };
};
```

This wrapper provides a clean interface for the webhook to call emails without importing Netlify-specific code.
  </action>
  <verify>
Run `grep -n "sendPaymentEmails" landing-page-new/src/app/api/webhooks/razorpay/route.ts` to confirm utility exists.
  </verify>
  <done>
sendPaymentEmails wrapper utility added to webhook handler, ready for use in payment event handlers.
  </done>
</task>

<task type="auto">
  <name>Task 4: Wire success email into handlePaymentCaptured</name>
  <files>landing-page-new/src/app/api/webhooks/razorpay/route.ts</files>
  <action>
Update handlePaymentCaptured to fetch client info and send success email.

After the payment update succeeds (after the line that returns `{ success: true, paymentId: result.rows[0].id }`), add before the return:

```typescript
// Send success email (non-blocking)
try {
  // Fetch client and project info for email
  const paymentInfo = await client.query(
    `SELECT
      p.payment_type, p.amount, p.currency,
      proj.project_number,
      u.email as client_email, u.full_name as client_name
    FROM payments p
    LEFT JOIN projects proj ON p.project_id = proj.id
    LEFT JOIN users u ON proj.client_user_id = u.id
    WHERE p.id = $1`,
    [result.rows[0].id]
  );

  if (paymentInfo.rows.length > 0 && paymentInfo.rows[0].client_email) {
    const info = paymentInfo.rows[0];
    const baseUrl = process.env.URL || 'http://localhost:3000';
    const projectUrl = info.project_number
      ? `${baseUrl}/portal/projects`
      : `${baseUrl}/portal`;

    const emails = await sendPaymentEmails();
    emails.sendSuccessEmail({
      to: info.client_email,
      clientName: info.client_name || 'Client',
      projectNumber: info.project_number || 'Your Project',
      amount: (Number(info.amount) / 100).toFixed(2),
      currency: info.currency,
      paymentType: info.payment_type,
      projectUrl
    }).catch(e => console.error('[Webhook] Success email error:', e));
  }
} catch (emailError) {
  console.error('[Webhook] Error fetching payment info for email:', emailError);
  // Don't fail the webhook - email is non-critical
}
```

**Important:** Email sending must be non-blocking (use .catch() not await) to ensure webhook responds within Razorpay's 5-second timeout.
  </action>
  <verify>
Run `grep -n "sendSuccessEmail" landing-page-new/src/app/api/webhooks/razorpay/route.ts` to confirm wiring exists.
Run `npm run build` in landing-page-new to verify no TypeScript errors.
  </verify>
  <done>
handlePaymentCaptured sends client success email on payment.captured. Email is non-blocking to maintain webhook response time.
  </done>
</task>

<task type="auto">
  <name>Task 5: Wire failure email into handlePaymentFailed</name>
  <files>landing-page-new/src/app/api/webhooks/razorpay/route.ts</files>
  <action>
Update handlePaymentFailed to send admin notification on failure.

After the payment status update (after the line that updates payment status to 'failed'), add:

```typescript
// Send failure notification to admin (non-blocking)
try {
  const emails = await sendPaymentEmails();
  emails.sendFailureEmail({
    orderId: razorpayOrderId,
    paymentId: result.rows[0]?.id,
    errorCode: error_code || undefined,
    errorDescription: error_description || undefined,
  }).catch(e => console.error('[Webhook] Failure email error:', e));
} catch (emailError) {
  console.error('[Webhook] Error sending failure notification:', emailError);
  // Don't fail the webhook - email is non-critical
}
```

**Important:** All email sending must be non-blocking (use .catch() not await) to ensure webhook responds within Razorpay's 5-second timeout.
  </action>
  <verify>
Run `grep -n "sendFailureEmail" landing-page-new/src/app/api/webhooks/razorpay/route.ts` to confirm wiring exists.
Run `npm run build` in landing-page-new to verify no TypeScript errors.
  </verify>
  <done>
handlePaymentFailed sends admin notification on payment.failed. Email is non-blocking to maintain webhook response time.
  </done>
</task>

</tasks>

<verification>
1. TypeScript builds pass: `npm run build` in both landing-page-new and root directories
2. Grep confirms email function exists: `grep -r "sendPaymentSuccessEmail" netlify/functions/`
3. Grep confirms webhook has email wrapper: `grep -r "sendPaymentEmails" landing-page-new/src/app/api/webhooks/`
4. Handler export exists: `grep -r "export const handler" netlify/functions/send-email.ts`
5. Success email wired: `grep -r "sendSuccessEmail" landing-page-new/src/app/api/webhooks/`
6. Failure email wired: `grep -r "sendFailureEmail" landing-page-new/src/app/api/webhooks/`
</verification>

<success_criteria>
- sendPaymentSuccessEmail function added to send-email.ts
- POST handler added to send-email.ts for cross-service email requests
- Email wrapper utility added to webhook handler
- handlePaymentCaptured calls success email (non-blocking)
- handlePaymentFailed calls failure email (non-blocking)
- All email sending uses .catch() for non-blocking execution
- Both builds pass without errors
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-09-payment-production-wiring/PROD-09-01-SUMMARY.md`
</output>
