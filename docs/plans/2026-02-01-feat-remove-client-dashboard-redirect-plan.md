---
title: Remove Client Dashboard and Redirect to Projects or Inquiries
type: feat
date: 2026-02-01
---

# Remove Client Dashboard and Redirect to Projects or Inquiries

## Feature Summary

Remove the dedicated Dashboard page for client users and redirect them after login to the **Projects page** (if they have active projects) or the **Inquiries page** (if not). The admin Dashboard remains unchanged.

## Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `App.tsx` | Replace the `"/"` route with a new `ClientRedirect` component that conditionally redirects clients |
| 2 | `components/Layout.tsx` | Hide the "Dashboard" sidebar item for client users |
| 3 | `pages/Dashboard.tsx` | Remove the `ClientDashboard` function and its client-specific imports/constants (dead code cleanup) |

## Step-by-Step Implementation Plan

### Step 1 — Create a `ClientRedirect` wrapper in `App.tsx`

In `App.tsx`, create a small `ClientHomeRedirect` component that:

1. Uses `useAuthContext()` to get the current user
2. Uses `isClient(user)` from `lib/permissions` to check role
3. **If admin** → renders `<Dashboard />` as before (no change to admin behaviour)
4. **If client** → fetches `/api/projects?userId={user.id}` to check if the user has any projects
   - If projects exist → `<Navigate to="/projects" replace />`
   - If no projects → `<Navigate to="/admin/inquiries" replace />`
   - While loading → show a spinner (same pattern as `ProtectedRoute`)

Replace the `"/"` route element from `<Dashboard />` to `<ClientHomeRedirect />`.

### Step 2 — Hide "Dashboard" sidebar item for clients in `Layout.tsx`

Wrap the Dashboard `<SidebarItem>` in a conditional that hides it when the user is a client:

```
{!isClient(user) && (
  <SidebarItem icon={LayoutDashboard} label="Dashboard" path="/" active={...} />
)}
```

Import `isClient` from `../lib/permissions` (already imports `isSuperAdmin` from there).

### Step 3 — Remove dead `ClientDashboard` code from `Dashboard.tsx`

Remove the `ClientDashboard` function (lines 220–345) and all client-only constants/imports that are no longer referenced:

- `CLIENT_STATUS_CONFIG`
- `STATUS_DOT_COLORS`, `STATUS_BG_COLORS`, `STATUS_TEXT_COLORS`
- `getInquiriesByClientUserId` import
- `isClient` import
- Unused Lucide icon imports that were only used by `ClientDashboard`

Remove the `isClientUser` check and early return in the main `Dashboard` component (line 458–459) since only admins will reach this page.

### Step 4 — Update command palette and keyboard shortcuts in `Layout.tsx`

In the `commandItems` array and `globalShortcuts` array, conditionally exclude the "Go to Dashboard" entry for client users so they aren't offered a shortcut to a page that no longer exists for them.

## Assumptions and Edge Cases

| # | Item | Detail |
|---|------|--------|
| 1 | **Client inquiries path** | Clients currently navigate to `/admin/inquiries` for their inquiries page (same route, different data scoping). This path is already in the sidebar. |
| 2 | **API call to check projects** | Uses the existing `/api/projects?userId={user.id}` endpoint that `ProjectList.tsx` already calls. No new API needed. |
| 3 | **Loading state** | The redirect component needs a brief loading state while checking for projects. A simple centered spinner (matching `ProtectedRoute` pattern) is sufficient. |
| 4 | **Catch-all route** | The `"*"` catch-all redirects to `"/"`, which will trigger the redirect logic for clients. This is correct behaviour. |
| 5 | **Logo click** | The sidebar logo links to `"/"`. For clients, this will trigger the redirect to Projects or Inquiries. Acceptable — no change needed. |
| 6 | **Breadcrumb text** | The header breadcrumb shows "Dashboard" when `location.pathname === '/'`. Since clients will be redirected away from `/`, they'll never see this. No change needed. |
| 7 | **Dual-portal pattern** | Per institutional learnings, there's a Next.js portal in `landing-page-new/`. This change only affects the React SPA (`pages/`). The Next.js portal has its own routing and is not affected. |

## What Will NOT Be Changed

- **Admin Dashboard** — remains exactly as-is (metrics, activity table, all functionality)
- **`pages/Dashboard.tsx` admin code** — only the `ClientDashboard` function and its supporting constants are removed
- **`netlify/functions/dashboard-metrics.ts`** — admin-only endpoint, untouched
- **`netlify/functions/activities.ts`** — admin-only endpoint, untouched
- **`pages/ProjectList.tsx`** — no changes
- **`pages/admin/InquiryDashboard.tsx`** — no changes
- **`landing-page-new/` (Next.js portal)** — no changes
- **No new dependencies or libraries**
- **No config, env, build, or infrastructure files**
