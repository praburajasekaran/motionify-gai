---
phase: PROD-07-payment-integration
plan: 02
type: execute
wave: 2
depends_on: ["PROD-07-03"]
files_modified:
  - pages/admin/Payments.tsx
  - src/routes.tsx
  - services/paymentApi.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Admin can view all payments in a dedicated dashboard"
    - "Admin can filter payments by status, date range, client name"
    - "Admin can search payments by project number"
    - "Payment dashboard shows key metrics (total, pending, completed)"
  artifacts:
    - path: "pages/admin/Payments.tsx"
      provides: "Admin payments dashboard page"
      min_lines: 150
    - path: "services/paymentApi.ts"
      provides: "API functions for fetching payments"
      exports: ["fetchAllPayments", "fetchPaymentsWithFilters"]
  key_links:
    - from: "pages/admin/Payments.tsx"
      to: "/api/payments/admin"
      via: "paymentApi.fetchAllPayments"
      pattern: "fetchAllPayments"
    - from: "src/routes.tsx"
      to: "pages/admin/Payments.tsx"
      via: "route definition"
      pattern: "/admin/payments"
---

<objective>
Create admin payments dashboard with filters for payment visibility and management.

Purpose: From CONTEXT.md - "Admin portal: Dedicated payments dashboard (not embedded in project view). Admin dashboard filters: status + date range + client name + project search."

Output: New admin page at /admin/payments with filterable payment list and summary metrics.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@components/payments/PaymentHistory.tsx
@landing-page-new/src/app/api/payments/history/route.ts
@pages/admin/Dashboard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create payment API service functions</name>
  <files>services/paymentApi.ts</files>
  <action>
Create or update paymentApi.ts to add functions for fetching payments with filters.

```typescript
export interface PaymentFilters {
  status?: 'pending' | 'completed' | 'failed' | 'all';
  dateFrom?: string;  // ISO date
  dateTo?: string;    // ISO date
  clientName?: string;
  projectSearch?: string;
}

export interface PaymentSummary {
  totalAmount: number;
  pendingAmount: number;
  completedAmount: number;
  failedCount: number;
  currency: string;
}

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  paymentType: 'advance' | 'balance';
  status: 'pending' | 'completed' | 'failed';
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
  project: {
    id: string;
    projectNumber: string;
    status: string;
  } | null;
  client: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export async function fetchAllPayments(filters?: PaymentFilters): Promise<{
  payments: AdminPayment[];
  summary: PaymentSummary;
}> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.clientName) params.set('clientName', filters.clientName);
  if (filters?.projectSearch) params.set('projectSearch', filters.projectSearch);

  const response = await fetch(`/api/payments/admin?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  return response.json();
}
```

Include credentials: 'include' for cookie auth.
  </action>
  <verify>File exists with fetchAllPayments function exported</verify>
  <done>Payment API service functions ready for admin dashboard</done>
</task>

<task type="auto">
  <name>Task 2: Create admin payments page component</name>
  <files>pages/admin/Payments.tsx</files>
  <action>
Create the admin payments dashboard page using existing design system components.

Features:
1. Summary cards at top: Total Revenue, Pending Payments, Completed, Failed
2. Filter bar: Status dropdown, Date range picker, Client name input, Project search
3. Payments table with columns: Date, Client, Project, Type (Advance/Balance), Amount, Status, Actions
4. Action buttons: View Details, Send Reminder (for pending)
5. Pagination if many payments

Use components from components/ui/design-system.tsx (Card, Button, Badge, etc.)
Use Lucide icons: CreditCard, Search, Filter, Calendar, Send, CheckCircle2, Clock, XCircle

Table should show:
- Date (formatted)
- Client name (from client object)
- Project number
- Payment type badge (Advance/Balance)
- Amount (formatted with currency symbol)
- Status badge (color-coded: green=completed, yellow=pending, red=failed)
- Actions dropdown

Filters component:
```tsx
<div className="flex gap-4 items-end flex-wrap">
  <select status filter>
  <input type="date" dateFrom>
  <input type="date" dateTo>
  <input type="text" clientName placeholder="Client name">
  <input type="text" projectSearch placeholder="Project #">
  <Button onClick={clearFilters}>Clear</Button>
</div>
```

Follow the same styling patterns as Dashboard.tsx and other admin pages.
  </action>
  <verify>
1. File exists at pages/admin/Payments.tsx
2. Component renders without errors
3. npm run build passes
  </verify>
  <done>Admin payments page component created with filters and table</done>
</task>

<task type="auto">
  <name>Task 3: Add route and navigation</name>
  <files>src/routes.tsx</files>
  <action>
Add the payments page route to the admin routes configuration.

1. Import the Payments page: `import Payments from '../pages/admin/Payments'`
2. Add route: `{ path: '/admin/payments', element: <Payments /> }`
3. Ensure route is within authenticated admin routes section

Also update the sidebar navigation in the admin layout to include Payments link:
- Icon: CreditCard from lucide-react
- Label: "Payments"
- Path: /admin/payments

Look at how existing admin routes (Dashboard, Projects, etc.) are defined and follow the same pattern.
  </action>
  <verify>
1. Route added to routes.tsx
2. Navigation link added to admin sidebar
3. Navigating to /admin/payments shows the Payments page
4. npm run build passes
  </verify>
  <done>Payments page accessible from admin navigation</done>
</task>

</tasks>

<verification>
1. /admin/payments route loads without errors
2. Summary cards show correct totals
3. Filter by status shows only matching payments
4. Date range filter works correctly
5. Client name and project search filter results
6. Table displays all payment details correctly
7. All builds pass
</verification>

<success_criteria>
- Admin can access /admin/payments from navigation
- Summary metrics displayed (total, pending, completed)
- Filters functional (status, date, client, project)
- Payment table shows all relevant columns
- Design consistent with other admin pages
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-02-SUMMARY.md`
</output>
