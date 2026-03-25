---
title: Remove Client Dashboard and Redirect to Projects or Inquiries
date: 2026-02-01
category: ui-bugs
tags: [routing, client-ux, react-router, dead-code-cleanup]
module: client-portal
symptoms: Client users land on low-value Dashboard after login instead of Projects or Inquiries
severity: medium
slug: client-dashboard-redirect-to-projects-or-inquiries
---

# Remove Client Dashboard and Redirect to Projects or Inquiries

## Problem

Client users landing on `/` after login saw a dedicated `ClientDashboard` component that listed their inquiries with status cards. This was low-value because:

- Clients with active projects had to manually navigate away to `/projects`
- The inquiry list duplicated data already available on the Inquiries page (`/admin/inquiries`)
- The Dashboard added a navigation step without providing unique value

## Root Cause

Clients and admins shared the same `"/"` route in `App.tsx`, which rendered `<Dashboard />`. The `Dashboard` component checked `isClient(user)` and returned a `ClientDashboard` sub-component with inquiry cards. This design assumed clients benefited from a dashboard overview, but in practice they just needed to get to their projects or inquiries directly.

## Solution

Created a `ClientHomeRedirect` component in `App.tsx` that replaces the `"/"` route logic:

```tsx
function ClientHomeRedirect() {
  const { user } = useAuthContext();
  const [loading, setLoading] = React.useState(true);
  const [hasProjects, setHasProjects] = React.useState(false);

  React.useEffect(() => {
    if (!user || !isClient(user)) {
      setLoading(false);
      return;
    }
    fetch(`/api/projects?userId=${user.id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setHasProjects(Array.isArray(data) ? data.length > 0 : false);
      })
      .catch(() => setHasProjects(false))
      .finally(() => setLoading(false));
  }, [user]);

  if (!isClient(user)) return <Dashboard />;
  if (loading) return <Spinner />;
  return <Navigate to={hasProjects ? '/projects' : '/admin/inquiries'} replace />;
}
```

### Changes across 3 files

**`App.tsx`** — Added `ClientHomeRedirect`, replaced `"/"` route element.

**`components/Layout.tsx`** — Three conditional exclusions for client users:
- Dashboard `<SidebarItem>` wrapped in `{!isClient(user) && (...)}`
- "Go to Dashboard" removed from `commandItems` array
- `g d` keyboard shortcut removed from `globalShortcuts` array

Pattern used for conditional array items:
```tsx
...(!isClient(user) ? [{ label: 'Go to Dashboard', ... }] : [])
```

**`pages/Dashboard.tsx`** — Removed ~170 lines of dead code:
- `ClientDashboard` function
- `CLIENT_STATUS_CONFIG`, `STATUS_DOT_COLORS`, `STATUS_BG_COLORS`, `STATUS_TEXT_COLORS`
- `isClient` and `getInquiriesByClientUserId` imports
- Unused Lucide icons (`ArrowRight`, `Calendar`)
- `isClientUser` variable and all its guard clauses

## Key Decisions

1. **Redirect at route level, not inside Dashboard** — Cleaner separation. Dashboard.tsx becomes admin-only without conditional logic.
2. **Use existing `/api/projects` endpoint** — Same endpoint `ProjectList.tsx` uses. No new API needed.
3. **Fallback to Inquiries** — If the project fetch fails, `hasProjects` defaults to `false`, redirecting to Inquiries. Safe fallback.
4. **Spinner matches ProtectedRoute pattern** — Consistent loading UX across auth-dependent components.

## Prevention

- When adding role-specific pages, consider whether a redirect to an existing page provides better UX than a dedicated view
- The `isClient(user)` pattern from `lib/permissions.ts` is the standard way to conditionally show/hide UI for client users
- When removing a page from client view, also remove it from: sidebar, command palette, keyboard shortcuts

## Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| Admin visits `/` | Sees Dashboard as before |
| Client with projects visits `/` | Redirects to `/projects` |
| Client without projects visits `/` | Redirects to `/admin/inquiries` |
| Project fetch fails | Redirects to `/admin/inquiries` (safe fallback) |
| Catch-all `/*` route | Redirects to `/` which triggers redirect logic |
| Sidebar logo click (client) | Links to `/`, triggers redirect |
| Breadcrumb text | Clients never see `/` so "Dashboard" breadcrumb is never shown |

## Related Documentation

- [Client Status Labels](./client-status-labels-show-admin-terminology.md) — Related client-portal UX fix
- [Permission Matrix](../../PERMISSION_MATRIX.md) — Role-based access control reference
- [Plan Document](../../plans/2026-02-01-feat-remove-client-dashboard-redirect-plan.md) — Original implementation plan
- [PR #9](https://github.com/praburajasekaran/motionify-gai/pull/9) — Pull request with full diff
