---
title: "feat: Snappy Page Loading via React Query Migration + Prefetching"
type: feat
status: active
date: 2026-03-07
origin: docs/brainstorms/2026-03-07-snappy-page-loading-brainstorm.md
---

# Snappy Page Loading via React Query Migration + Prefetching

## Overview

Transform all 17 application pages from manual `fetch+useState` patterns to React Query hooks, wire up the existing (unused) skeleton loader system, and add hover-based prefetching — making every page feel like a desktop app with instant revisits, smooth first-visit skeletons, and predictive data loading.

## Problem Statement

Pages take 2-5 seconds to show content. Some pages flash "no data exists" empty states before real data loads. Every navigation triggers a full data re-fetch because manual `useState` patterns don't cache. The app has all the infrastructure for snappy loading (React Query v5 installed, 14 skeleton components built, proper query key patterns established) but none of it is wired together.

**Root causes:**
1. **17 pages** use manual `fetch()` + `useState` — no caching, no background refresh
2. **Auth waterfall** — `AuthProvider` must finish loading before any page can fetch data
3. **Empty state flashing** — `length === 0` renders "No items" before API responds
4. **No prefetching** — data doesn't start loading until component mounts
5. **14 skeleton components** exist in `SkeletonLoaders.tsx` but are imported nowhere

## Proposed Solution

Full React Query migration across all pages + prefetching infrastructure (see brainstorm: `docs/brainstorms/2026-03-07-snappy-page-loading-brainstorm.md`).

**Architecture flow after implementation:**
```
User hovers link
  → queryClient.prefetchQuery() fires
  → Data starts fetching in background

User clicks link
  → React Router navigates
  → React.lazy() loads component chunk (parallel with data fetch)
  → Component mounts
    → Cache hit: renders instantly with cached data
    → Cache miss: renders skeleton placeholders
    → Stale cache: shows cached data, refreshes in background
  → Fresh data arrives → UI updates seamlessly
```

## Technical Approach

### Architecture

**Layer 1: React Query Hooks (Data Layer)**
Create dedicated hooks for each data domain, following the established pattern from `useTasks.ts` and `useActivities.ts`. Each hook encapsulates query keys, fetch functions, cache settings, and mutations.

**Layer 2: Skeleton Integration (UI Layer)**
Replace all inline `animate-pulse` divs and spinners with the existing skeleton components from `SkeletonLoaders.tsx`. Pages check `isLoading` from React Query and render the appropriate skeleton.

**Layer 3: Prefetch Infrastructure (Performance Layer)**
A `PrefetchLink` component and `usePrefetch` hook that call `queryClient.prefetchQuery()` on mouse enter, plus route-level prefetching that starts data loading at navigation time.

**Layer 4: Auth Optimization (Foundation Layer)**
Break the auth waterfall by allowing pages to start rendering skeletons immediately while auth resolves, rather than blocking with a full-screen spinner.

### Implementation Phases

#### Phase 1: Foundation — Auth + Query Infrastructure

**Goal:** Break the auth waterfall and establish the hooks/prefetch infrastructure that all subsequent phases depend on.

**Tasks:**

- [ ] **1.1 Create `shared/hooks/useAuth.ts`** — Migrate auth from `AuthContext.tsx`'s manual `fetch+useState` to a React Query hook
  - Query key: `['auth', 'session']`
  - Fetch fn: `GET /.netlify/functions/auth-me`
  - `staleTime: 5 * 60 * 1000` (match current 5-min refresh interval)
  - `gcTime: 10 * 60 * 1000`
  - `retry: false` (auth failures shouldn't retry)
  - Remove the 3-second timeout fallback
  - Keep `refreshSession()` as `queryClient.invalidateQueries(['auth', 'session'])`

- [ ] **1.2 Update `AuthContext.tsx`** — Use the new `useAuth` hook internally
  - Keep the context API surface the same (`user`, `isLoading`, `isAuthenticated`, `logout`, etc.)
  - Internally replace `useState/useEffect/fetch` with `useAuth()` hook
  - This is a non-breaking refactor — consumers don't change

- [ ] **1.3 Update `ProtectedRoute` to show skeletons instead of spinner**
  - While auth is loading, render page-appropriate skeleton (e.g., `StatGridSkeleton` for dashboard route)
  - This breaks the waterfall: skeletons render immediately, auth resolves, then data loads

- [ ] **1.4 Add global 401 handler to QueryClient**
  - In `QueryProvider.tsx`, add `onError` callback to `defaultOptions.queries`
  - On 401 response: invalidate auth query, redirect to `/login`
  - Prevents cascading auth errors across all queries

- [ ] **1.5 Create `shared/utils/prefetch.ts`** — Prefetch utility functions
  ```typescript
  // Core prefetch function
  export function prefetchQuery(queryClient, queryKey, queryFn, options?)

  // Route-specific prefetchers
  export function prefetchDashboard(queryClient)
  export function prefetchProjectDetail(queryClient, projectId)
  export function prefetchProjectList(queryClient)
  // ... one per major route
  ```

- [ ] **1.6 Create `shared/components/PrefetchLink.tsx`**
  - Wraps React Router's `<Link>` component
  - On mouse enter: calls the appropriate prefetch function based on `to` prop
  - Debounced (100ms) to avoid prefetching on accidental hovers
  - Cancels prefetch if mouse leaves before debounce fires

- [ ] **1.7 Add `placeholderData: keepPreviousData` to all existing hooks**
  - `useTasks.ts` — add `placeholderData: keepPreviousData`
  - `useProjectFiles.ts` — add `placeholderData: keepPreviousData`
  - `useInquiries.ts` (both list and detail) — add `placeholderData: keepPreviousData`
  - `useProposals.ts` (both list and detail) — add `placeholderData: keepPreviousData`
  - `useActivities.ts` — already has it ✅

**Success criteria:** Auth loads via React Query, `ProtectedRoute` shows skeletons not spinners, `PrefetchLink` component works, all existing hooks have `keepPreviousData`.

---

#### Phase 2: Core Page Migrations — Dashboard + Project List

**Goal:** Migrate the two highest-traffic entry-point pages. Establish patterns for all subsequent migrations.

**Tasks:**

- [ ] **2.1 Create `shared/hooks/useDashboardMetrics.ts`**
  - Query key: `['dashboard', 'metrics']`
  - Fetch fn: `GET /.netlify/functions/dashboard-metrics`
  - `staleTime: 2 * 60 * 1000` (2 min — metrics change frequently)
  - `placeholderData: keepPreviousData`
  - `throwOnError: false`

- [ ] **2.2 Create `shared/hooks/useDashboardActivities.ts`**
  - Query key: `['dashboard', 'activities', { offset }]`
  - Fetch fn: `GET /.netlify/functions/activities?limit=10&offset={offset}`
  - Consider `useInfiniteQuery` for "load more" pagination
  - `placeholderData: keepPreviousData`
  - `throwOnError: false`

- [ ] **2.3 Migrate `pages/Dashboard.tsx`**
  - Replace all `useState` + `useEffect` fetch patterns with `useDashboardMetrics()` and `useDashboardActivities()`
  - Remove: `metrics`, `loadingMetrics`, `errorMetrics`, `activities`, `loadingActivities`, `errorActivities`, `activityOffset`, `hasMoreActivities`, `isLoadingMore` state variables
  - Replace loading states with skeleton components:
    - `StatGridSkeleton` for metrics area
    - `ActivityFeedSkeleton` for activities
  - Fix empty state: only show "No activities" when `isSuccess && data.length === 0`, never when `isLoading`

- [ ] **2.4 Create `shared/hooks/useProjects.ts`** (list hook)
  - Query key: `['projects', 'list', { userId }]`
  - Fetch fn: `GET /api/projects?userId={userId}`
  - `placeholderData: keepPreviousData`
  - Transform API response to `Project` type inside hook (not in component)
  - `throwOnError: false`

- [ ] **2.5 Migrate `pages/ProjectList.tsx`**
  - Replace `apiProjects`, `isLoading`, `fetchError` state with `useProjects()`
  - Replace loading spinner with `CardGridSkeleton` for grid view, `TableRowSkeleton` for list view
  - Fix empty state: guard with `isSuccess` check
  - Add `PrefetchLink` to project cards (prefetch project detail on hover)

- [ ] **2.6 Add route-level prefetching for Dashboard and ProjectList**
  - In sidebar/navigation: replace `<Link>` with `<PrefetchLink>` for Dashboard and Projects nav items
  - Ensure `prefetchDashboard()` and `prefetchProjectList()` are called

**Success criteria:** Dashboard and ProjectList load instantly on revisit, show skeletons on first visit, prefetch on hover from navigation.

---

#### Phase 3: Detail Pages — Project, Deliverable, Proposal

**Goal:** Migrate the most complex pages with nested data dependencies.

**Tasks:**

- [ ] **3.1 Create `shared/hooks/useProject.ts`** (single project hook)
  - Query key: `['projects', 'detail', projectId]`
  - Fetch fn: `GET /api/projects/{projectId}`
  - `enabled: !!projectId`
  - `placeholderData: keepPreviousData`
  - Transform API response inside hook

- [ ] **3.2 Create `shared/hooks/useDeliverables.ts`**
  - Query key: `['deliverables', 'list', projectId]`
  - Fetch fn: fetch deliverables for project
  - `enabled: !!projectId`
  - `placeholderData: keepPreviousData`
  - Mutations: `useUpdateDeliverable()`, `useUploadDeliverableFile()`

- [ ] **3.3 Migrate `pages/ProjectDetail.tsx`** (1422 lines — largest page)
  - Replace manual project fetch with `useProject(id)`
  - Replace manual deliverables fetch with `useDeliverables(id)`
  - Keep existing React Query hooks: `useTasks(id)`, `useActivities(id)`, `useProjectFiles(id)`
  - Remove: `project`, `projectLoading`, `deliverables`, `deliverablesLoading` state
  - Add skeletons per tab:
    - Overview: `DetailPageHeaderSkeleton` + `StatGridSkeleton`
    - Tasks: `TaskListSkeleton`
    - Activities: `ActivityFeedSkeleton`
    - Files: `CardGridSkeleton`
    - Deliverables: `CardGridSkeleton`
  - Fix tab switching: skeletons per tab, not full-page spinner
  - Add `PrefetchLink` for deliverable review links

- [ ] **3.4 Migrate `pages/DeliverableReview.tsx`** (608 lines)
  - Create or reuse `useDeliverable(deliverableId)` for single deliverable
  - Replace `useDeliverables` context with React Query hook
  - Replace `currentProject` manual fetch with `useProject(projectId)`
  - Remove: `isLoading`, `currentProject` state
  - Add: `DetailPageHeaderSkeleton` + `VideoPlayerSkeleton` while loading
  - Fix the triple-loading-state check (lines 254-290)

- [ ] **3.5 Migrate `pages/ProjectSettings.tsx`**
  - Replace manual project settings fetch with React Query hook
  - Add `FormFieldSkeleton` while loading

- [ ] **3.6 Create `shared/hooks/usePayments.ts`**
  - Query key: `['payments', 'list', { proposalId }]` or `['payments', 'all', filters]`
  - Fetch fn: `fetchPaymentsForProposal(proposalId)` or `fetchAllPayments(filters)`
  - Mutations: `useSendPaymentReminder()`, `useLinkPaymentToProject()`, `useRefundPayment()`

- [ ] **3.7 Migrate `pages/admin/ProposalDetail.tsx`**
  - Replace manual proposal, inquiry, and payments fetch with:
    - `useProposal(proposalId)` (existing hook)
    - `useInquiry(inquiryId)` (existing hook)
    - `usePayments({ proposalId })`
  - Remove: `proposal`, `inquiry`, `payments`, `isDataLoading` state
  - Add skeletons for proposal header and payment table

- [ ] **3.8 Add route-level prefetching for detail pages**
  - Project cards in ProjectList: prefetch `useProject(id)` + `useTasks(id)` on hover
  - Proposal links: prefetch `useProposal(id)` on hover
  - Deliverable links: prefetch `useDeliverable(id)` on hover

**Success criteria:** All detail pages load with cached data on revisit, show tab-specific skeletons on first visit, prefetch from parent list pages.

---

#### Phase 4: Admin Pages + Remaining Pages

**Goal:** Complete the migration for all remaining pages.

**Tasks:**

- [ ] **4.1 Create `shared/hooks/useUsers.ts`**
  - Query key: `['users', 'list', filters]`
  - Fetch fn: `GET /.netlify/functions/users-list?{params}`
  - Mutations: `useCreateUser()`, `useDeactivateUser()`

- [ ] **4.2 Migrate `pages/admin/UserManagement.tsx`**
  - Replace manual user fetch with `useUsers(filters)`
  - Add `TableRowSkeleton` while loading
  - Fix empty state guard

- [ ] **4.3 Migrate `pages/admin/InquiryDashboard.tsx`**
  - Replace manual inquiry fetch with `useInquiries()` (existing hook)
  - Replace manual stats computation with derived data from query
  - Add `StatGridSkeleton` + `TableRowSkeleton`

- [ ] **4.4 Migrate `pages/admin/InquiryDetail.tsx`**
  - Replace manual inquiry + proposal fetch with `useInquiry(id)` + `useProposal(id)` (existing hooks)
  - Add `DetailPageHeaderSkeleton`

- [ ] **4.5 Migrate `pages/admin/ProposalBuilder.tsx`**
  - Replace manual inquiry fetch with `useInquiry(inquiryId)` (existing hook)
  - Add `FormFieldSkeleton` while inquiry loads

- [ ] **4.6 Migrate `pages/admin/Payments.tsx`**
  - Replace manual payments fetch with `usePayments(filters)` (created in Phase 3)
  - Add `StatGridSkeleton` for summary + `TableRowSkeleton` for table

- [ ] **4.7 Migrate `pages/admin/ActivityLogs.tsx`**
  - Replace manual activity fetch with `useDashboardActivities()` or create `useActivityLogs(filters)`
  - Add `ActivityFeedSkeleton`
  - Consider `useInfiniteQuery` for "load more"

- [ ] **4.8 Migrate `pages/Settings.tsx`**
  - Create `shared/hooks/useUserSettings.ts`
  - Query key: `['settings', userId]`
  - Mutation: `useUpdateSettings()`
  - Add `FormFieldSkeleton`

- [ ] **4.9 Migrate `pages/InquiryTracking.tsx`** (public page)
  - Note: This is a public page — no auth requirement
  - Replace manual inquiry fetch with `useInquiry(inquiryNumber)` variant
  - Add appropriate skeleton

- [ ] **4.10 Update navigation throughout app**
  - Replace all `<Link>` to major routes with `<PrefetchLink>` in:
    - Sidebar navigation (`components/Layout.tsx` or similar)
    - Breadcrumbs
    - Admin navigation
    - Any inter-page links

**Success criteria:** All 17 pages migrated. Zero manual `fetch+useState` patterns remain. All pages show skeletons, use cache, and support prefetching.

---

#### Phase 5: Polish + Verification

**Goal:** Verify all pages work correctly, no regressions, consistent experience.

**Tasks:**

- [ ] **5.1 Audit all empty states**
  - Search entire codebase for `length === 0` patterns
  - Ensure all are guarded with `isSuccess` (not just `!isLoading`)
  - Pattern: `{isSuccess && data.length === 0 && <EmptyState />}`

- [ ] **5.2 Audit all loading states**
  - Verify every page uses skeleton components (not spinners)
  - Remove any remaining inline `animate-pulse` loading divs
  - Ensure `ProtectedRoute` skeleton matches the destination page

- [ ] **5.3 Verify prefetching works**
  - Test hover prefetch on all `PrefetchLink` instances
  - Verify debounce: quick hover doesn't trigger fetch
  - Verify cancel: hover-then-leave doesn't leave orphan requests

- [ ] **5.4 Verify caching behavior**
  - Navigate to page → navigate away → navigate back → should show cached data instantly
  - Verify background refresh updates data seamlessly (no flicker)
  - Test with React Query DevTools to confirm cache hits

- [ ] **5.5 Test error scenarios**
  - 401 during session: should redirect to login (global handler)
  - Network error on prefetch: should silently fail (not crash)
  - API error on page load: should show error boundary (not empty state)

- [ ] **5.6 Remove dead code**
  - Remove any unused manual fetch functions
  - Remove unused `useState` imports where all state moved to hooks
  - Clean up any `useEffect` cleanup functions that are no longer needed

- [ ] **5.7 Performance verification**
  - Measure time-to-interactive before/after on Dashboard
  - Verify React Query DevTools shows cache hits on revisits
  - Check Network tab: confirm no duplicate requests on navigation

## Alternative Approaches Considered

(see brainstorm: `docs/brainstorms/2026-03-07-snappy-page-loading-brainstorm.md`)

1. **Skeleton-first only** — Rejected: masks the problem without solving caching. Data still re-fetches on every visit.
2. **React Router data loaders** — Rejected: requires `createBrowserRouter` migration, blocks navigation until data loads (opposite of snappy).

## System-Wide Impact

### Interaction Graph

- `AuthProvider` mount → `useAuth()` query → `ProtectedRoute` renders → Page queries fire
- Hover on `PrefetchLink` → `queryClient.prefetchQuery()` → cache populated → navigation → component reads from cache
- Mutation success → `queryClient.invalidateQueries()` → stale queries refetch in background → UI updates
- 401 error on any query → global error handler → invalidate auth → redirect to `/login`

### Error & Failure Propagation

- **API 401**: Caught by global `onError` in QueryClient defaults → invalidates auth query → `ProtectedRoute` sees `user === null` → redirects to `/login`
- **API 500**: Caught by individual hook `throwOnError: false` → `isError` state → page shows error UI (not error boundary)
- **Network failure**: React Query retries once (configured `retry: 1`) → if still fails, `isError` state
- **Prefetch failure**: Silent — prefetch errors don't affect UI, user sees normal loading on navigation

### State Lifecycle Risks

- **Stale cache + mutation**: Mutation invalidates query → but if user navigates away before invalidation refetches, they see stale data on return. Mitigated by `staleTime` (data refetches after 5 min).
- **Auth race condition**: Multiple queries fire, auth expires mid-flight → first 401 triggers redirect, other queries cancelled by unmount. Global handler prevents cascading errors.
- **Prefetch + navigation**: Prefetch starts → user navigates to different page → prefetched data stays in cache (harmless, garbage collected after `gcTime`).

### API Surface Parity

All existing React Query hooks (`useTasks`, `useActivities`, `useProjectFiles`, `useInquiries`, `useProposals`) already follow the target pattern. New hooks mirror these exactly.

### Integration Test Scenarios

1. **Cache-then-navigate**: Visit Dashboard → click Project → click back → Dashboard renders instantly from cache (no loading spinner)
2. **Hover-prefetch**: Hover project card → wait 200ms → click → ProjectDetail renders with data already in cache
3. **Auth expiry during session**: User on ProjectDetail → auth expires → background refetch gets 401 → redirected to login → login → redirected back with data loaded
4. **Empty list vs loading**: Visit ProjectList with no projects → should show "No projects" (not skeleton), should not flash skeleton then empty state
5. **Rapid navigation**: Click Dashboard → immediately click Projects → immediately click Settings → no stale renders, no errors

## Acceptance Criteria

### Functional Requirements

- [ ] All 17 pages use React Query hooks instead of manual `fetch+useState`
- [ ] Every page shows skeleton placeholders while loading (not spinners)
- [ ] Revisiting a cached page shows data instantly (< 100ms perceived)
- [ ] Hovering over navigation links prefetches the target page data
- [ ] Empty states only appear when data is successfully loaded AND genuinely empty
- [ ] 401 errors redirect to login globally without page-specific handling
- [ ] All existing functionality (mutations, filters, pagination) works unchanged

### Non-Functional Requirements

- [ ] No `useState` + `useEffect` + `fetch` patterns remain in any page component
- [ ] All skeleton loaders come from `SkeletonLoaders.tsx` (no inline `animate-pulse`)
- [ ] Every React Query hook uses `placeholderData: keepPreviousData` for list queries
- [ ] Prefetch debounced at 100ms to prevent unnecessary fetches

### Quality Gates

- [ ] All existing E2E tests pass (Playwright)
- [ ] No console errors on any page load or navigation
- [ ] React Query DevTools confirms cache hits on revisits
- [ ] Zero "flash of empty state" on any page

## Dependencies & Prerequisites

- React Query v5 — already installed ✅
- `SkeletonLoaders.tsx` — already built, needs no changes ✅
- Existing React Query hooks — serve as pattern templates ✅
- No backend changes required — all API endpoints stay the same ✅

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing mutations during migration | Medium | High | Migrate one page at a time, test mutations after each |
| Auth race conditions with parallel queries | Low | High | Global 401 handler in QueryClient catches all |
| Over-prefetching on hover-heavy UIs | Low | Low | Debounce prefetch, `gcTime` garbage collects unused |
| Large PR size (17 pages) | High | Medium | Split into 5 PRs matching phases |
| Skeleton mismatch (wrong skeleton for page) | Low | Low | Visual review per page during migration |

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `shared/hooks/useAuth.ts` | Auth session React Query hook |
| `shared/hooks/useDashboardMetrics.ts` | Dashboard metrics hook |
| `shared/hooks/useDashboardActivities.ts` | Dashboard activities hook |
| `shared/hooks/useProjects.ts` | Project list hook |
| `shared/hooks/useProject.ts` | Single project detail hook |
| `shared/hooks/useDeliverables.ts` | Deliverables list hook |
| `shared/hooks/usePayments.ts` | Payments hook (admin + per-proposal) |
| `shared/hooks/useUsers.ts` | User management hook |
| `shared/hooks/useUserSettings.ts` | User settings hook |
| `shared/utils/prefetch.ts` | Prefetch utility functions |
| `shared/components/PrefetchLink.tsx` | Link with hover prefetch |

### Modified Files

| File | Change |
|------|--------|
| `contexts/AuthContext.tsx` | Internally use `useAuth` hook |
| `shared/providers/QueryProvider.tsx` | Add global 401 error handler |
| `shared/hooks/useTasks.ts` | Add `keepPreviousData` |
| `shared/hooks/useProjectFiles.ts` | Add `keepPreviousData` |
| `shared/hooks/useInquiries.ts` | Add `keepPreviousData` |
| `shared/hooks/useProposals.ts` | Add `keepPreviousData` |
| `pages/Dashboard.tsx` | Full migration |
| `pages/ProjectList.tsx` | Full migration |
| `pages/ProjectDetail.tsx` | Partial migration (project + deliverables) |
| `pages/ProjectSettings.tsx` | Full migration |
| `pages/DeliverableReview.tsx` | Full migration |
| `pages/Settings.tsx` | Full migration |
| `pages/InquiryTracking.tsx` | Full migration |
| `pages/admin/InquiryDashboard.tsx` | Full migration |
| `pages/admin/InquiryDetail.tsx` | Full migration |
| `pages/admin/ProposalBuilder.tsx` | Full migration |
| `pages/admin/ProposalDetail.tsx` | Full migration |
| `pages/admin/UserManagement.tsx` | Full migration |
| `pages/admin/Payments.tsx` | Full migration |
| `pages/admin/ActivityLogs.tsx` | Full migration |
| `App.tsx` or Layout component | `PrefetchLink` in navigation |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-07-snappy-page-loading-brainstorm.md](docs/brainstorms/2026-03-07-snappy-page-loading-brainstorm.md)
  - Key decisions carried forward: full migration (not incremental), both hover + route prefetching, cached data + skeletons (not either/or)

### Internal References

- Query pattern template: `shared/hooks/useTasks.ts`
- `keepPreviousData` example: `shared/hooks/useActivities.ts`
- Skeleton components: `components/ui/SkeletonLoaders.tsx`
- Auth flow: `contexts/AuthContext.tsx`
- QueryClient config: `shared/providers/QueryProvider.tsx`
- Route config: `App.tsx`

### External References

- [TanStack React Query v5 docs — Prefetching](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)
- [TanStack React Query v5 docs — Placeholder Data](https://tanstack.com/query/latest/docs/framework/react/guides/placeholder-query-data)
- [TanStack React Query v5 docs — Dependent Queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries)
