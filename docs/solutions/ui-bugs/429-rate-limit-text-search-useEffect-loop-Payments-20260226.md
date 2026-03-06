---
title: "Admin Payments page: 429 rate limit errors from text search triggering API calls on every keystroke"
date_resolved: "2026-02-26"
severity: medium
category: ui-bugs
tags: [react, useEffect, useCallback, debounce, rate-limiting, client-side-filtering, error-handling, useMemo]
component: admin-payments
module: payments
symptoms:
  - "429 Too Many Requests errors triggered by typing in Client Name or Project # search fields"
  - "[object Object] error messages displayed instead of meaningful text"
  - "Misleading 'Unable to connect to the server' error shown for 429 rate limit responses"
  - "Error state displayed when clearing search field after a search"
  - "React StrictMode doubled effect execution, defeating debounce attempts"
root_cause: "Text search filters triggered API calls via useCallback/useEffect dependency chain on every keystroke; useCallback([filters]) created new function identity per keystroke; React StrictMode doubled each effect cycle; Netlify CLI rate-limited after ~3 rapid requests"
solution: "Separated API filters (status/date) from text search; implemented client-side filtering with useMemo; stabilized loadPayments with useRef and empty deps; fixed error message type safety"
files_modified:
  - pages/admin/Payments.tsx
  - services/paymentApi.ts
related_docs:
  - docs/solutions/runtime-errors/payments-crash-response-format-mismatch-Payments-20260226.md
  - docs/solutions/feature-patterns/polling-based-cross-user-sync-with-react-query.md
  - docs/solutions/ui-bugs/deliverable-not-found-flash-broken-loading-guard-DeliverableReview-20260226.md
---

## Problem

The Admin Payments page showed "Something went wrong — Too many requests" errors when users typed in the Client Name or Project # search fields, and especially when clearing those fields after a search.

Secondary issues: error messages displayed as `[object Object]`, and 429 errors were misclassified as network connectivity failures ("Unable to connect to the server").

## Root Cause

Three issues cascaded:

1. **Dynamic `useCallback` dependency**: `loadPayments` had `[filters]` as a dependency, creating a new function reference on every keystroke.
2. **useEffect trigger chain**: The useEffect depended on `loadPayments`, so the new function identity triggered a re-fetch on every keystroke.
3. **React StrictMode double-mounting**: Effects fire twice in dev mode, doubling the API call rate.
4. **Netlify CLI rate limiting**: After ~3 rapid requests, subsequent calls returned 429.

## Investigation Timeline

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Fix error message type checking | Fixed `[object Object]` but not rate limiting |
| 2 | Add AbortController to useEffect | Helped with StrictMode but didn't prevent rapid calls |
| 3 | Debounce with setTimeout (300ms) | Ineffective — `useCallback([filters])` still created new identity per keystroke |
| 4 | Stable loadPayments via useRef + empty deps | Reduced calls but rate limiter still triggered from prior burst |
| 5 | **Client-side text filtering with useMemo** | Eliminated text search API calls entirely |

## Solution

### Core insight

Text search doesn't need API calls — all payments are already loaded. Only status and date filters require server-side queries.

### Changes to `pages/admin/Payments.tsx`

**Before: Single filters object triggered API on every change**

```typescript
const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all', dateFrom: '', dateTo: '', clientName: '', projectSearch: '',
});

const loadPayments = useCallback(async () => {
    await fetchAllPayments(filters); // API call on every filter change
}, [filters]); // New identity every keystroke

useEffect(() => {
    if (!user) return;
    loadPayments();
}, [user, loadPayments]); // Triggers on text input
```

**After: Separated API and client-side filtering**

```typescript
// API filters — only these trigger server fetch
const [apiFilters, setApiFilters] = useState({
    status: 'all', dateFrom: '', dateTo: '',
});

// Text search — filtered client-side, zero API calls
const [clientName, setClientName] = useState('');
const [projectSearch, setProjectSearch] = useState('');

// Stable loadPayments using ref (never re-created)
const apiFiltersRef = useRef(apiFilters);
apiFiltersRef.current = apiFilters;

const loadPayments = useCallback(async (signal?: AbortSignal) => {
    const response = await fetchAllPayments(apiFiltersRef.current, signal);
    // ...
}, []); // Stable — empty deps

// API fetch only on status/date changes
useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    loadPayments(controller.signal);
    return () => controller.abort();
}, [user, apiFilters, loadPayments]);

// Instant client-side text filtering
const filteredPayments = useMemo(() => {
    let result = payments;
    const cn = clientName.toLowerCase().trim();
    const ps = projectSearch.toLowerCase().trim();
    if (cn) result = result.filter((p) => p.clientName?.toLowerCase().includes(cn));
    if (ps) result = result.filter((p) => p.projectNumber?.toLowerCase().includes(ps));
    return result;
}, [payments, clientName, projectSearch]);
```

### Error handling fix in `services/paymentApi.ts`

```typescript
// Before: Could pass object to Error constructor
throw new Error(errorData.message || errorData.error || 'Failed to fetch payments');

// After: Type-safe with specific 429 handling
const msg = typeof errorData.message === 'string' ? errorData.message
    : typeof errorData.error === 'string' ? errorData.error
    : response.status === 429 ? 'Too many requests. Please wait a moment and try again.'
    : `Could not load payments (${response.status})`;
throw new Error(msg);
```

## Prevention Strategies

1. **Prefer client-side filtering for text search** — When the full dataset is already loaded, text/fuzzy filtering should happen client-side with `useMemo`. Reserve API calls for filters that change the dataset shape (status, date ranges, pagination).

2. **Stable useCallback with refs** — If a callback needs access to changing state but shouldn't trigger re-effects, store the state in a `useRef` and give `useCallback` empty deps. This decouples the callback identity from the state changes.

3. **Type-safe error messages** — Always check `typeof` before using error response fields in `new Error()`. HTTP error bodies may contain objects, not strings. Use explicit type guards.

4. **Avoid keyword-based error classification** — The `ErrorState` component pattern-matches words like "fetch" in error messages to show network errors. This misclassifies API errors (e.g., 429). Classify errors by HTTP status code, not message content.

5. **React StrictMode awareness** — In dev mode, effects fire twice. Any effect that makes API calls must handle this via `AbortController` cleanup, or better yet, avoid using effects for data fetching when client-side alternatives exist.
