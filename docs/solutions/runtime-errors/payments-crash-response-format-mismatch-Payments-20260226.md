---
title: "Payments Crash — TypeError on .length Due to API Response Format Mismatch"
category: runtime-errors
module: Payments
tags: [api-contract, response-format, TypeError, defensive-coding, snake-case-camelCase]
severity: high
symptoms:
  - "TypeError: Cannot read properties of undefined (reading 'length')" on /portal/admin/payments
  - ErrorBoundary catches and shows "Something went wrong"
  - No summary cards displayed
  - "Invalid Date" in date column
  - Client and Project columns show dashes
date: 2026-02-26
---

# Payments Crash — TypeError on .length Due to API Response Format Mismatch

## Problem

Navigating to `/portal/admin/payments` crashed with:
```
TypeError: Cannot read properties of undefined (reading 'length')
at Payments (pages/admin/Payments.tsx:133:44)
```

The ErrorBoundary caught this and displayed "Something went wrong."

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
```ts
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

**Two-part fix:**

### 1. Backend: Added admin endpoint handler

**File: `netlify/functions/payments.ts`**

Added `/admin` path detection in the GET handler with:
- Role-based access control (super_admin, support only)
- JOINs to projects, users, proposals, inquiries tables
- Filter support (status, dateFrom, dateTo, clientName, projectSearch)
- snake_case → camelCase mapping in response
- Summary aggregation (totalAmount, completedAmount, pendingAmount, failedCount)

### 2. Frontend: Defensive response handling

**File: `pages/admin/Payments.tsx`**
```tsx
const response = await fetchAllPayments(filters);
if (Array.isArray(response)) {
  setPayments(response);
  setSummary(null);
} else {
  setPayments(response.payments ?? []);
  setSummary(response.summary ?? null);
}
```

**File: `services/paymentApi.ts`**
- Updated return type: `Promise<AdminPaymentsResponse | AdminPayment[]>`

## Prevention

1. **Always validate API response shape before destructuring** — use defensive checks or runtime validation (zod, etc.)
2. **Match frontend interfaces to actual backend responses** — TypeScript types don't enforce runtime contracts
3. **Test admin endpoints with actual API calls** — the type mismatch was invisible at compile time
4. **Use `?? []` or nullish coalescing** when setting array state from API responses
5. **When adding new frontend features that expect specific API shapes**, verify the backend endpoint exists and returns that shape

## Key Files

- `netlify/functions/payments.ts` — added admin GET handler with JOINs and summary
- `pages/admin/Payments.tsx` — defensive response handling
- `services/paymentApi.ts` — updated return type
