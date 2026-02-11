---
title: Task Deletion for Admins and Client Task Creation Permissions
type: feat
date: 2026-01-30
---

# Task Deletion for Admins and Client Task Creation Permissions

## Overview

Add task deletion capability restricted to admin/PM roles and allow clients to create tasks with a limited field set. Currently, the DELETE endpoint has no permission check (any authenticated user can delete), no delete UI exists, and clients are fully blocked from creating tasks.

## Problem Statement / Motivation

Two gaps exist in the task permission model:

1. **Deletion is unprotected.** The `DELETE /tasks/:id` endpoint performs no role check — any authenticated user (including clients) can delete tasks via API. There is also no UI for deletion, so the feature is effectively invisible but exploitable.
2. **Clients cannot create tasks.** Clients often need to request work or log items. Currently they must communicate outside the platform, and an admin must manually create tasks on their behalf.

## Proposed Solution

### 1. Task Deletion (Admin/PM Only)

Add permission gating to the existing DELETE handler, matching the deliverable deletion pattern:

- **Backend** (`netlify/functions/tasks.ts`): Add role check — only `super_admin` and `project_manager` can delete. Return 403 for all others.
- **Permission utility** (`utils/deliverablePermissions.ts`): Add `canDeleteTask(user)` function.
- **Frontend**: Add a delete button (trash icon) to the task row/card for users with `canDeleteTask` permission. Use `window.confirm()` for confirmation (matches existing deliverable pattern).

### 2. Client Task Creation

Allow clients to create tasks with restricted fields:

- **Backend** (`netlify/functions/tasks.ts`): Remove the blanket client 403 on POST. Instead, allow clients to set: `title`, `description`, `dueDate`, `projectId`. Strip `assignedTo`, `priority`, `visibleToClient` from client payloads. Force `visible_to_client: true` for client-created tasks.
- **Permission utility**: Add `canCreateTask(user)` — returns `true` for all authenticated users.
- **Frontend** (`components/tasks/TaskCreateForm.tsx`): Show the form to clients but hide the assignee dropdown and any fields clients shouldn't set. Show the form when `canCreateTask(user)` is true (replacing the current `!isClient(user)` check).

## Technical Considerations

### Files to Modify

| File | Changes |
|------|---------|
| `netlify/functions/tasks.ts` (lines 446-460, 793-823) | Permission check on DELETE; relax POST for clients with field restrictions |
| `utils/deliverablePermissions.ts` | Add `canDeleteTask()`, `canCreateTask()` |
| `hooks/useDeliverablePermissions.ts` | Expose new permission functions |
| `components/tasks/TaskCreateForm.tsx` | Conditionally hide assignee field for clients |
| `pages/ProjectDetail.tsx` (~line 1170) | Change `!isClient(user)` to `canCreateTask(user)` for showing create form |
| Task card/row component | Add delete button with permission check |
| `services/taskApi.ts` | Ensure `deleteTask()` is exported (already exists but unused) |
| `landing-page-new/src/lib/portal/api/tasks.api.ts` | Ensure client portal task creation works |

### Multi-Layer Permission Enforcement

Per documented learnings (`docs/solutions/logic-errors/client-deliverables-hidden-by-status-filter.md`), permission changes must be enforced at **three layers**:

1. **API endpoint** — server-side role check in `netlify/functions/tasks.ts`
2. **Permission utility** — shared logic in `utils/deliverablePermissions.ts`
3. **UI** — conditional rendering in components

### Architecture Alignment

- Follow the existing `compose(withCORS, withAuth, withRateLimit)` middleware pattern
- Role checks happen inside the handler (matching current tasks.ts pattern), not via middleware
- Client role detection uses `['client', 'client_primary', 'client_team']` array (lines 110, 164, 449 of tasks.ts)

### Edge Cases

- **Deleting a task with comments/followers**: Database CASCADE should handle this (verify FK constraints)
- **Client creates task, then admin makes it invisible**: Client can still see it since they created it — decide if `visible_to_client` override should apply. Recommendation: respect `visible_to_client` flag regardless of creator.
- **Client portal task creation**: The landing-page-new portal at `landing-page-new/src/lib/portal/api/tasks.api.ts` also calls the tasks API. Ensure the client creation flow works from both portals.
- **Rate limiting**: Client task creation should respect existing rate limits (already applied via `withRateLimit`)

## Acceptance Criteria

- [x] `DELETE /tasks/:id` returns 403 for `client`, `team_member` roles
- [x] `DELETE /tasks/:id` succeeds for `super_admin` and `project_manager`
- [x] Delete button visible only to admin/PM in task UI with confirmation dialog
- [x] `POST /tasks` succeeds for client users with `title`, `description`, `dueDate`, `projectId`
- [x] `POST /tasks` strips `assignedTo`, `priority`, `visibleToClient` from client payloads
- [x] Client-created tasks have `visible_to_client: true` automatically
- [x] Task creation form visible to clients with assignee field hidden
- [x] `canDeleteTask()` and `canCreateTask()` added to permission utilities
- [x] Both main app and client portal support client task creation
- [x] Existing admin/PM/team_member task creation unchanged

## Success Metrics

- Clients can self-serve task creation without admin intervention
- No unauthorized task deletions possible (API returns 403)
- Admin/PM workflow gains delete capability with confirmation safeguard

## Dependencies & Risks

- **Database FK constraints**: Verify `task_comments` and `task_followers` CASCADE on task deletion. If not, the DELETE query will fail with a FK violation.
- **Client portal sync**: The `landing-page-new` portal must also surface the create form for clients.
- **Email notifications**: Currently task creation sends assignment emails. Client-created tasks have no assignee, so no notification fires — admins may want a notification that a client created a task. This is out of scope but noted for follow-up.

## References & Research

- Deliverable deletion pattern: `netlify/functions/deliverables.ts:436-516`
- Task DELETE handler (no perm check): `netlify/functions/tasks.ts:793-823`
- Task POST handler (client blocked): `netlify/functions/tasks.ts:446-460`
- Permission utilities: `utils/deliverablePermissions.ts`
- Permission hook: `hooks/useDeliverablePermissions.ts`
- Task create form: `components/tasks/TaskCreateForm.tsx`
- Project detail (create button guard): `pages/ProjectDetail.tsx:1170`
- Institutional learning on multi-layer permissions: `docs/solutions/logic-errors/client-deliverables-hidden-by-status-filter.md`
