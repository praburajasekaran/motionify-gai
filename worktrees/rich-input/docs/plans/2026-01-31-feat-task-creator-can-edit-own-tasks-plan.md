---
title: "feat: Allow task creators to edit their own tasks"
type: feat
date: 2026-01-31
---

# feat: Allow task creators to edit their own tasks

## Overview

Currently, clients who create tasks cannot edit them afterward. The `createdBy` field is stored on every task but is never used for authorization. This change adds "creator can edit" logic so that any user — regardless of role — can edit tasks they created, with appropriate field restrictions for client roles.

## Problem Statement

- All authenticated users (including clients) can **create** tasks
- But clients **cannot edit** any tasks — even ones they just created
- This is confusing UX: a client creates "TEst task for client" and immediately has no way to fix the typo or update the description
- The `createdBy` field exists on every task but is unused for permissions

## Proposed Solution

Add a "creator can edit" permission path at both the frontend and backend layers. Clients editing their own tasks will have restricted fields (title, description, due date) while admins/PMs retain full edit access on all tasks.

## Technical Approach

### Changes Required

#### 1. Frontend: `utils/deliverablePermissions.ts` — `canEditTask()`

**File:** `utils/deliverablePermissions.ts:372-390`

Current logic:
```
Admin/PM → true
Team member → true if assigned
Client → false (always)
```

New logic:
```
Admin/PM → true
Team member → true if assigned OR if creator
Client → true if creator
Otherwise → false
```

The function signature already accepts `(user: User, task?: Task)` and the `Task` type has `createdBy?: string`. Add a creator check before the final `return false`:

```typescript
// Any user can edit tasks they created
if (task?.createdBy && task.createdBy === user.id) {
  return true;
}
```

This check should go **after** the admin/PM check and **before** the final `return false`, benefiting both team members and clients.

#### 2. Backend: `netlify/functions/tasks.ts` — PATCH handler

**File:** `netlify/functions/tasks.ts:558-571`

Current logic blocks ALL client roles with 403. Change to:
1. Fetch the existing task first (already done later — move the fetch earlier)
2. If user is a client role, check if `created_by` matches `auth.user.id`
3. If creator match: allow edit but restrict to `clientAllowedFields`
4. If not creator: return 403 as before

**Client-allowed fields** (when editing own task):
- `title`
- `description`
- `dueDate`
- `status` (only certain transitions, e.g., Todo ↔ In Progress)

**Client-restricted fields** (cannot change even on own tasks):
- `assignedTo` — clients should not assign team members
- `visibleToClient` — this is an internal admin toggle
- `priority` — not a client concern

```typescript
// Replace the blanket client block with:
if (userRole && clientRoles.includes(userRole)) {
  // Fetch existing task to check creator
  const taskCheck = await db.query('SELECT created_by FROM tasks WHERE id = $1', [taskId]);
  if (!taskCheck.rows.length || taskCheck.rows[0].created_by !== auth.user.id) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'You can only edit tasks you created',
        code: 'PERMISSION_DENIED'
      }),
    };
  }
  // Strip fields clients cannot edit
  const clientAllowedFields = ['title', 'description', 'status', 'dueDate'];
  // Filter updates to only allowed fields (applied after Zod validation below)
}
```

#### 3. Frontend: `pages/ProjectDetail.tsx` — Edit form field restrictions

**File:** `pages/ProjectDetail.tsx` (task edit form rendering)

When a client is editing their own task, the edit form should only show fields they can change:
- Title (text input)
- Description (textarea)
- Due date (date picker)
- Status (dropdown — limited transitions)

Hide these fields for client editors:
- Assignee selector
- "Visible to client" toggle

This can be done by passing a `restrictedMode` prop or checking the user role inside `TaskEditForm` / `TaskCreateForm`.

#### 4. Frontend: `pages/ProjectDetail.tsx` — Pass `createdBy` to permission check

Verify that when `canEditTask(user, task)` is called, the `task` object includes the `createdBy` field. Check the task data flow from API → state → component to ensure `createdBy` is present.

**File:** `pages/ProjectDetail.tsx:1173` — already passes `task` to `canEditTask`, and `mapTaskFromDB` already maps `created_by` → `createdBy`. Should work without changes, but verify.

### Edge Cases

1. **Old tasks with null `createdBy`**: These remain non-editable by clients (only admin/PM). The check `task.createdBy === user.id` safely returns false when `createdBy` is undefined.

2. **Client creates task, admin modifies it**: Client should still be able to edit since they are the original creator. The `createdBy` field doesn't change when an admin edits.

3. **Task deletion by creators**: Out of scope for this change. Deletion remains admin/PM only. Can be considered as a follow-up.

4. **`createdBy` stored as auth user ID**: Verify that `auth.user.id` matches the format stored in `created_by` column (both should be UUIDs from the users table).

5. **Client status transitions**: When editing status, clients should only be able to set: `Todo` and `In Progress`. They should not be able to mark tasks as `Done` or `completed` — that should remain an admin/PM action. Evaluate if this restriction is needed or if clients should have full status control on their own tasks.

## Acceptance Criteria

- [x] A client user who creates a task sees the edit (pencil) button on that task
- [x] Clicking edit opens a form with title, description, due date, and status fields
- [x] The edit form does NOT show assignee or "visible to client" fields for client editors
- [x] Saving the edit persists changes to the database
- [x] A client cannot edit tasks created by other users (edit button hidden, API returns 403)
- [x] Admin/PM can still edit ALL tasks regardless of creator
- [x] Team members can edit tasks assigned to them OR tasks they created
- [x] Old tasks with no `createdBy` remain non-editable by clients
- [x] Backend strips restricted fields if a client attempts to set them (defense in depth)

## Files to Modify

| File | Change |
|------|--------|
| `utils/deliverablePermissions.ts:372-390` | Add creator check to `canEditTask()` |
| `netlify/functions/tasks.ts:558-571` | Allow client edits for own tasks with field restrictions |
| `pages/ProjectDetail.tsx` | Conditionally hide fields in edit form for client role |
| `components/tasks/TaskCreateForm.tsx` | Accept `restrictedMode` prop to hide admin-only fields |

## References

- **Permission utility:** `utils/deliverablePermissions.ts:372` (`canEditTask`)
- **Backend PATCH handler:** `netlify/functions/tasks.ts:558` (client block)
- **Task type definition:** `types.ts:49-62` (Task interface with `createdBy`)
- **Task DB mapping:** `netlify/functions/tasks.ts:53` (`createdBy: row.created_by`)
- **Documented learning:** `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — field name consistency
- **Documented learning:** `docs/solutions/logic-errors/task-delete-button-removed-by-unrelated-commit.md` — avoid overwriting permission code during merges
