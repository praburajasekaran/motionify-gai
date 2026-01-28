---
phase: PROD-07-payment-integration
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-page-new/src/app/api/payments/admin/route.ts
  - netlify/functions/payments.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Admin API endpoint returns all payments with client info"
    - "Filters are applied server-side"
    - "Summary metrics calculated correctly"
    - "Only authenticated admins can access admin payments API"
  artifacts:
    - path: "landing-page-new/src/app/api/payments/admin/route.ts"
      provides: "Admin payments API with filters"
      exports: ["GET"]
  key_links:
    - from: "landing-page-new/src/app/api/payments/admin/route.ts"
      to: "payments table"
      via: "SQL query with joins"
      pattern: "SELECT.*FROM payments.*JOIN"
---

<objective>
Create admin payments API endpoint with filtering and summary capabilities.

Purpose: Backend support for the admin payments dashboard - returns all payments with client information and filter support.

Output: New API route `/api/payments/admin` that returns filtered payments with summary metrics.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/PRODUCTION_ROADMAP.md
@.planning/phases/PROD-07-payment-integration/PROD-07-CONTEXT.md
@landing-page-new/src/app/api/payments/history/route.ts
@netlify/functions/payments.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create admin payments API endpoint</name>
  <files>landing-page-new/src/app/api/payments/admin/route.ts</files>
  <action>
Create the admin payments endpoint with filtering support.

Features:
1. Authentication check (admin role required)
2. Query parameters: status, dateFrom, dateTo, clientName, projectSearch
3. JOIN with projects, proposals, users tables to get client info
4. Return payments array + summary object

Query structure:
```sql
SELECT
  p.id, p.amount, p.currency, p.payment_type, p.status,
  p.razorpay_order_id, p.razorpay_payment_id, p.paid_at, p.created_at,
  proj.id as project_id, proj.project_number, proj.status as project_status,
  u.id as client_id, u.full_name as client_name, u.email as client_email
FROM payments p
LEFT JOIN projects proj ON p.project_id = proj.id
LEFT JOIN proposals prop ON p.proposal_id = prop.id
LEFT JOIN users u ON proj.client_user_id = u.id
WHERE 1=1
  AND ($1::text IS NULL OR p.status = $1)
  AND ($2::timestamp IS NULL OR p.created_at >= $2)
  AND ($3::timestamp IS NULL OR p.created_at <= $3)
  AND ($4::text IS NULL OR u.full_name ILIKE '%' || $4 || '%')
  AND ($5::text IS NULL OR proj.project_number ILIKE '%' || $5 || '%')
ORDER BY p.created_at DESC
```

Summary calculation:
```typescript
const summary = {
  totalAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
  pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
  completedAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
  failedCount: payments.filter(p => p.status === 'failed').length,
  currency: 'INR', // or determine from data
};
```

Response format:
```json
{
  "success": true,
  "payments": [...],
  "summary": { ... },
  "count": 42
}
```

Use existing auth patterns - check for authenticated user with admin role.
  </action>
  <verify>
1. File exists at landing-page-new/src/app/api/payments/admin/route.ts
2. Exports GET handler
3. Returns payments with client information
4. Returns summary object
5. npm run build passes in landing-page-new
  </verify>
  <done>Admin payments API endpoint created with filters and summary</done>
</task>

<task type="auto">
  <name>Task 2: Add manual reminder endpoint to Netlify payments function</name>
  <files>netlify/functions/payments.ts</files>
  <action>
Add POST endpoint for admin to manually send payment reminder.

New endpoint: POST /api/payments/{paymentId}/reminder

Implementation:
1. Authenticate admin
2. Fetch payment and related client info
3. Send reminder email using existing send-email infrastructure
4. Log reminder sent in payment_reminders table (or just return success)

Request body: (none needed, paymentId from URL)

Response:
```json
{
  "success": true,
  "message": "Reminder sent to client@email.com"
}
```

This enables the "Send Reminder" button in admin dashboard.

Pattern: Match existing patterns in payments.ts for route handling.
  </action>
  <verify>
1. POST handler added for reminder endpoint
2. Uses withAuth middleware
3. Sends email using existing Resend integration
4. npm run build passes in netlify folder
  </verify>
  <done>Manual reminder endpoint added for admin use</done>
</task>

</tasks>

<verification>
1. GET /api/payments/admin returns all payments with client info
2. Filters are applied correctly (status, date range, client, project)
3. Summary metrics are accurate
4. POST /api/payments/{id}/reminder sends email
5. Authentication required for both endpoints
6. All builds pass
</verification>

<success_criteria>
- Admin API returns payments with client information
- All filters work correctly
- Summary metrics calculated server-side
- Manual reminder endpoint sends email to client
- Authentication enforced on all admin endpoints
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-07-payment-integration/PROD-07-03-SUMMARY.md`
</output>
