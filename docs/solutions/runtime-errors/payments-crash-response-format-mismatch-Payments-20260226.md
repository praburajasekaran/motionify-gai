---
title: "Payments Crash — TypeError on .length Due to API Response Format Mismatch"
date: 2026-02-26
last_updated: 2026-06-07
category: runtime-errors
module: Payments
problem_type: runtime_error
component: payments
severity: high
symptoms:
  - "TypeError: Cannot read properties of undefined (reading 'length') on /portal/admin/payments"
  - "ErrorBoundary catches and shows 'Something went wrong'"
  - "No summary cards displayed"
  - "'Invalid Date' in date column"
  - "Client and Project columns show dashes"
root_cause: wrong_api
resolution_type: code_fix
tags: [api-contract, response-format, defensive-coding, snake-case-camelcase]
---

# Payments Crash — TypeError on .length Due to API Response Format Mismatch

## Problem

The admin Payments page expected an admin-specific API response with camelCase fields, joined client/project context, and summary totals. The backend route returned the generic raw payments table shape instead, so the page either crashed on `payments.length` or rendered broken table data such as `Invalid Date`, blank payment type badges, missing clients, and missing project numbers.

The original crash appeared as:
```
TypeError: Cannot read properties of undefined (reading 'length')
at Payments (pages/admin/Payments.tsx:133:44)
```

The later regression was less severe because the frontend had been made tolerant of a raw array, but the same contract mismatch still caused `createdAt` to be `undefined` and rendered `Invalid Date`.

## Symptoms

- `/portal/admin/payments` showed `Invalid Date` in the Date column.
- Payment Type badges rendered blank because the row had `payment_type`, not `paymentType`.
- Client and Project columns showed fallback dashes or "Link to project" because the generic response had no joined client/project context.
- Summary cards were absent because the generic response had no `summary`.
- Earlier versions crashed with `TypeError: Cannot read properties of undefined (reading 'length')`.

## What Didn't Work

- Frontend defensive handling avoided the crash by accepting either a raw array or `{ payments, summary }`, but it did not normalize snake_case fields. That made the page render but preserved the bad data: `formatDate(payment.createdAt)` still received `undefined`.
- Guarding `formatDate()` would only hide the symptom. The row would still lack `paymentType`, `projectNumber`, `clientName`, and `summary`, so the table would remain incomplete.

## Root Cause

**API contract mismatch between frontend and backend.**

The frontend `fetchAllPayments()` called `/api/payments/admin` expecting:
```ts
interface AdminPaymentsResponse {
  success: boolean;
  payments: AdminPayment[];  // camelCase keys
  summary: PaymentSummary;
  count: number;
}
```

But the backend `payments.ts` GET handler had NO special `/admin` path handling. It returned a raw array:
```typescript
return {
  statusCode: 200,
  body: JSON.stringify(result.rows),  // raw array, snake_case keys
};
```

So `response.payments` was `undefined`. Then `setPayments(undefined)` stored `undefined` in state, and `payments.length` on render threw the TypeError.

**Secondary issues** (all caused by the raw array):
- `createdAt` was actually `created_at` → `formatDate()` got `undefined` → "Invalid Date"
- No JOINs to users/projects tables → client/project columns were null
- No summary aggregation → summary cards never shown

## Solution

The correct fix is backend-side: make `/api/payments/admin` return the admin contract that `services/paymentApi.ts` declares and `pages/admin/Payments.tsx` renders.

In `netlify/functions/payments.ts`, detect admin GET paths before the generic proposal/project payment list:

```typescript
const pathSegments = getPaymentsPathSegments(event.path);
const isAdminRequest = pathSegments[0] === 'admin';

if (isAdminRequest) {
  assertAdminLike(auth?.user, 'payments.admin');

  if (pathSegments[1] === 'projects') {
    return handleAdminProjects(headers);
  }

  return handleAdminPayments(event, headers);
}
```

Map the joined database row into the existing frontend shape:

```typescript
function mapAdminPayment(row: any) {
  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    paymentType: row.payment_type,
    status: row.status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    paidAt: serializeDate(row.paid_at),
    createdAt: serializeDate(row.created_at),
    projectId: row.project_id,
    projectNumber: row.project_number,
    projectStatus: row.project_status,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
  };
}
```

The admin query now joins payments to proposals, inquiries, projects, and users; applies the existing status/date/client/project filters; computes summary totals; and returns:

```typescript
{
  success: true,
  payments,
  summary,
  count: payments.length,
}
```

`/api/payments/admin/projects` also gets its own admin branch for the link-project modal. Non-admin proposal/project payment history calls continue through the original generic GET flow and keep their raw table-shaped response.

## Why This Works

The admin Payments UI already had the right contract in `AdminPayment`: it reads `createdAt`, `paymentType`, `projectNumber`, `clientName`, and `summary`. The backend was the boundary where valid database state became invalid UI state by returning raw snake_case rows for an endpoint whose caller expects camelCase admin view models.

Restoring the admin route fixes the source of the bad state. `formatDate(payment.createdAt)` now receives an actual timestamp, the type badge reads `payment.paymentType`, and the client/project columns receive joined context instead of null fallback values.

## Prevention

- Keep admin/list endpoints responsible for returning UI-facing view models, not raw table rows.
- When a frontend interface has camelCase fields, verify the API response at runtime before assuming TypeScript has enforced the boundary.
- Add endpoint-level coverage or route mocks for `/api/payments/admin` that assert `payments[0].createdAt`, `payments[0].paymentType`, and `summary` exist.
- Defensive frontend state (`response.payments ?? []`) prevents crashes, but it is not a substitute for fixing the response contract.

## Key Files

- `netlify/functions/payments.ts` — admin GET handler, row mapping, joins, filters, summary, and admin project lookup
- `pages/admin/Payments.tsx` — renders `AdminPayment` fields and exposed the invalid date symptom
- `services/paymentApi.ts` — declares the `AdminPaymentsResponse` and `AdminPayment` contract
