---
phase: PROD-07-payment-integration
plan: 04
type: execute
wave: 2
depends_on: ["PROD-07-01"]
files_modified:
  - landing-page-new/src/lib/portal/pages/PaymentsPage.tsx
  - landing-page-new/src/app/portal/payments/page.tsx
  - landing-page-new/src/components/payment/PaymentButton.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Client can access payments section in portal"
    - "Client sees payment history with receipts"
    - "Pay button appears in payments section for pending payments"
    - "Client can initiate payment from payments section"
    - "Milestone payments (advance/final) display correctly with type labels"
  artifacts:
    - path: "landing-page-new/src/lib/portal/pages/PaymentsPage.tsx"
      provides: "Client portal payments page"
      min_lines: 100
    - path: "landing-page-new/src/app/portal/payments/page.tsx"
      provides: "Portal payments route"
      exports: ["default"]
  key_links:
    - from: "landing-page-new/src/lib/portal/pages/PaymentsPage.tsx"
      to: "/api/payments/history"
      via: "fetch with userId"
      pattern: "payments/history"
    - from: "landing-page-new/src/lib/portal/pages/PaymentsPage.tsx"
      to: "PaymentButton"
      via: "component import"
      pattern: "PaymentButton"
---

<objective>
Add payments section to client portal with payment history and pay button.

Purpose: From CONTEXT.md - "Pay button appears in BOTH locations: proposal page after acceptance AND dedicated payments section in portal." Currently only the proposal page has the pay button.

Output: Client portal payments page showing payment history and allowing payments to be made.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@landing-page-new/src/app/payments/history/page.tsx
@landing-page-new/src/components/payment/PaymentButton.tsx
@landing-page-new/src/lib/portal/pages/ProjectsPage.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create client portal payments page component</name>
  <files>landing-page-new/src/lib/portal/pages/PaymentsPage.tsx</files>
  <action>
Create the client portal payments page using existing portal styling patterns.

Features:
1. Show payment history (completed and pending)
2. Summary cards: Total Paid, Outstanding Balance, Next Payment Due
3. For pending payments: Show "Pay Now" button using existing PaymentButton component
4. For completed payments: Show "Download Receipt" link
5. Group payments by project if client has multiple projects
6. **Display payment type labels (Advance/Final) clearly** - this is the milestone payment visibility requirement

Per CONTEXT.md, the system uses 2 milestones (advance + final):
- Show "Advance Payment" or "Final Payment" badge for each payment
- Show which deliverable/project phase the payment relates to (e.g., "Project Kickoff" vs "Final Delivery")

Use existing AuthContext to get userId for fetching payments.

Structure:
```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import PaymentButton from '@/components/payment/PaymentButton';
import { Download, CreditCard, CheckCircle2, Clock, Milestone } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentType: string;  // 'advance' | 'balance'
  status: string;
  proposalId: string;
  project: { projectNumber: string } | null;
  paidAt: string | null;
  createdAt: string;
  clientEmail: string;
  clientName: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  // Fetch payments for user
  // Display in cards/table
  // Show PaymentButton for pending
  // Show Download Receipt for completed
  // Show payment type badge (Advance/Final) for each payment
}
```

Follow styling from existing portal pages (ProjectsPage.tsx pattern).
  </action>
  <verify>
1. File exists at landing-page-new/src/lib/portal/pages/PaymentsPage.tsx
2. Fetches payments for authenticated user
3. Shows PaymentButton for pending payments
4. Shows download receipt for completed payments
5. Shows payment type (advance/final) for each payment
  </verify>
  <done>Client portal payments page component created with milestone payment display</done>
</task>

<task type="auto">
  <name>Task 2: Create portal payments route</name>
  <files>landing-page-new/src/app/portal/payments/page.tsx</files>
  <action>
Create the Next.js page route for the portal payments section.

Simple wrapper that imports and renders PaymentsPage:
```tsx
import PaymentsPage from '@/lib/portal/pages/PaymentsPage';

export const metadata = {
  title: 'Payments - Portal',
};

export default function PortalPaymentsPage() {
  return <PaymentsPage />;
}
```

Ensure the page is protected (requires authentication) - follow pattern from other portal pages.
  </action>
  <verify>
1. File exists at landing-page-new/src/app/portal/payments/page.tsx
2. Route accessible at /portal/payments
3. Shows payments page content
  </verify>
  <done>Portal payments route created and accessible</done>
</task>

<task type="auto">
  <name>Task 3: Update PaymentButton for portal context</name>
  <files>landing-page-new/src/components/payment/PaymentButton.tsx</files>
  <action>
Update PaymentButton to work correctly in the portal payments section context.

Current PaymentButton expects to be on a proposal page with specific data available.
Need to ensure it works when:
1. Called from payments page with payment data (not proposal data)
2. Has access to necessary client info (email, name) for Razorpay prefill

Add optional props to support both contexts:
```typescript
interface PaymentButtonProps {
  proposalId: string;
  amount: number;
  currency: 'INR' | 'USD';
  clientEmail: string;
  clientName: string;
  onPaymentSuccess?: () => void;  // Add callback for page refresh
  variant?: 'default' | 'compact'; // Add variant for different contexts
}
```

If payment succeeds, call onPaymentSuccess callback so the payments page can refresh its data.

Keep backward compatible - existing usage on proposal page should continue working.
  </action>
  <verify>
1. PaymentButton works from both proposal page and payments page
2. onPaymentSuccess callback is called on successful payment
3. npm run build passes in landing-page-new
  </verify>
  <done>PaymentButton updated to support portal payments context</done>
</task>

</tasks>

<verification>
1. /portal/payments route loads for authenticated client
2. Payment history displayed correctly
3. Pending payments show "Pay Now" button
4. Clicking "Pay Now" opens Razorpay modal
5. Successful payment updates status in list
6. Completed payments show "Download Receipt"
7. Payment type (Advance/Final) displayed for each payment
8. All builds pass
</verification>

<success_criteria>
- Client can access /portal/payments
- Payment history shows all payments
- Pending payments have actionable Pay button
- Completed payments have receipt download
- Milestone payment types (advance/final) clearly labeled
- Payment flow works end-to-end from portal
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-04-SUMMARY.md`
</output>
