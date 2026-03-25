---
phase: PROD-07-payment-integration
plan: 05
type: execute
wave: 2
depends_on: ["PROD-07-01"]
files_modified:
  - landing-page-new/src/app/api/payments/verify/route.ts
  - landing-page-new/src/app/payment/success/page.tsx
  - landing-page-new/src/app/payment/failure/page.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Failed payment shows error with retry button"
    - "Admin is notified on payment failure"
    - "Payment attempt history is logged"
    - "Success page redirects to project/deliverables"
  artifacts:
    - path: "landing-page-new/src/app/payment/failure/page.tsx"
      provides: "Payment failure page with retry"
      min_lines: 50
    - path: "landing-page-new/src/app/payment/success/page.tsx"
      provides: "Success page with redirect to deliverables"
      min_lines: 50
  key_links:
    - from: "landing-page-new/src/app/payment/success/page.tsx"
      to: "/portal/projects"
      via: "redirect after success"
      pattern: "redirect|router.push"
---

<objective>
Implement payment failure handling, retry flow, and post-payment navigation.

Purpose: From CONTEXT.md - "Failed payment: show error + retry button immediately, PLUS notify admin via email + in-app" and "After successful payment, redirect client to project/deliverables view."

Output: Enhanced failure page with retry, admin notifications on failure, and success page redirect.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@landing-page-new/src/app/payment/success/page.tsx
@landing-page-new/src/app/payment/failure/page.tsx
@landing-page-new/src/app/api/payments/verify/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Enhance payment verify to log attempts and notify on failure</name>
  <files>landing-page-new/src/app/api/payments/verify/route.ts</files>
  <action>
Update the verify endpoint to:
1. Log all payment attempts (success and failure) to a payment_attempts table or JSON log
2. On failure: Send notification to admin (email + in-app notification)

Add payment attempt logging:
```typescript
// After signature verification (success or failure)
try {
  await query(
    `INSERT INTO payment_attempts (
      payment_id, razorpay_order_id, razorpay_payment_id,
      status, error_code, error_description, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [paymentId, razorpay_order_id, razorpay_payment_id,
     isSignatureValid ? 'success' : 'failure', errorCode, errorDescription]
  );
} catch (logError) {
  console.error('Failed to log payment attempt:', logError);
  // Continue - don't fail the main flow
}

// On failure, notify admin
if (!isSignatureValid || status === 'failed') {
  // Send admin notification
  await notifyAdminPaymentFailure({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    errorCode,
    errorDescription,
    proposalId,
  });
}
```

Note: payment_attempts table may not exist yet. If not, use JSON logging or add migration in Task 2.

For admin notification, use existing send-email and notifications infrastructure.
  </action>
  <verify>
1. Payment attempts are logged (either DB or console)
2. Failed payments trigger admin notification
3. Existing successful flow still works
4. npm run build passes
  </verify>
  <done>Payment verify logs attempts and notifies admin on failure</done>
</task>

<task type="auto">
  <name>Task 2: Enhance failure page with retry button</name>
  <files>landing-page-new/src/app/payment/failure/page.tsx</files>
  <action>
Update the payment failure page to show:
1. Clear error message
2. Retry button that returns to payment page
3. Error code/description if available from query params
4. Contact support link

The page should receive query params: ?orderId=xxx&error=description

Updated structure:
```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, RefreshCw, Mail } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function FailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');
  const proposalId = searchParams.get('proposalId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          {error || 'Something went wrong with your payment. Please try again.'}
        </p>

        {proposalId && (
          <Link
            href={`/payment/${proposalId}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium mb-4"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
        )}

        <p className="text-sm text-gray-500 mt-4">
          If the problem persists, please{' '}
          <a href="mailto:support@motionify.com" className="text-violet-600 hover:underline">
            contact support
          </a>
        </p>

        {orderId && (
          <p className="text-xs text-gray-400 mt-4">
            Reference: {orderId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FailureContent />
    </Suspense>
  );
}
```

Use Suspense wrapper for useSearchParams (Next.js requirement).
  </action>
  <verify>
1. Failure page shows error message
2. Retry button links back to payment page
3. Reference ID displayed for support
4. npm run build passes
  </verify>
  <done>Failure page enhanced with retry flow</done>
</task>

<task type="auto">
  <name>Task 3: Update success page to redirect to deliverables</name>
  <files>landing-page-new/src/app/payment/success/page.tsx</files>
  <action>
Update the success page to:
1. Show success confirmation briefly
2. Auto-redirect to project/deliverables after 3 seconds
3. Include manual "View Project" button

From CONTEXT.md: "After successful payment, redirect client to project/deliverables view - client should immediately see what they paid for"

Updated structure:
```tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const proposalId = searchParams.get('proposalId');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (projectId) {
            router.push(`/portal/projects/${projectId}`);
          } else if (proposalId) {
            router.push(`/portal/projects`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [projectId, proposalId, router]);

  const projectUrl = projectId
    ? `/portal/projects/${projectId}`
    : '/portal/projects';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your project is now active.
        </p>

        <p className="text-sm text-gray-500 mb-4">
          Redirecting to your project in {countdown} seconds...
        </p>

        <Link
          href={projectUrl}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
        >
          View Your Project
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="text-xs text-gray-400 mt-6">
          A receipt has been sent to your email.
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
```

Query params expected: ?projectId=xxx or ?proposalId=xxx
  </action>
  <verify>
1. Success page shows confirmation message
2. Countdown displayed
3. Auto-redirect to project after countdown
4. Manual "View Project" button works
5. npm run build passes
  </verify>
  <done>Success page redirects to deliverables view</done>
</task>

</tasks>

<verification>
1. Payment failure logs attempt to database/console
2. Admin receives notification on payment failure
3. Failure page shows retry button
4. Clicking retry returns to payment page
5. Success page shows countdown
6. Success page auto-redirects to project
7. All builds pass
</verification>

<success_criteria>
- Payment attempts logged for audit trail
- Admin notified on failure (email or console for now)
- Failure page has clear retry path
- Success page redirects to deliverables
- User experience is clear and helpful
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-05-SUMMARY.md`
</output>
