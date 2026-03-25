---
title: Own Task Deletion & Creator Edit Visibility
type: feat
date: 2026-02-01
---

# Own Task Deletion & Creator Edit Visibility

## Overview

Allow task creators to delete their own tasks (in addition to super admins who can delete any task), and restore the Edit button visibility for client users who created a task in the portal.

## Problem Statement

1. **Task deletion is too restrictive**: Currently only `super_admin` and `project_manager` can delete tasks. Users who created a task cannot delete it themselves.
2. **Edit button missing for client task creators in portal**: The portal `TaskItem.tsx` only shows the Edit button for internal users (`MOTIONIFY_MEMBER`, `PROJECT_MANAGER`). Client users who created a task do not see the Edit button, even though `canEditTask()` in the main app already supports creator-based editing and the backend PATCH endpoint allows clients to edit their own tasks.

## Feature Summary

1. Task creators can delete their own tasks. Super admins can delete any task. Project managers retain existing delete access.
2. Client task creators see the Edit button in the portal UI (restoring lost functionality).

---

## Exact Files to Modify

| # | File Path | Change |
|---|-----------|--------|
| 1 | `utils/deliverablePermissions.ts` | Update `canDeleteTask()` to accept a `task` param and allow creators to delete their own tasks |
| 2 | `netlify/functions/tasks.ts` | Update DELETE handler to allow task creators to delete their own tasks |
| 3 | `pages/ProjectDetail.tsx` | Pass `task` to `canDeleteTask()` call |
| 4 | `landing-page-new/src/lib/portal/components/TaskItem.tsx` | Show Edit button (and Delete button) for task creators, not just internal users |
| 5 | `landing-page-new/src/lib/portal/components/TaskList.tsx` | Add delete handler and pass `onDelete` prop to TaskItem (if not already present) |

---

## Step-by-Step Implementation Plan

### Step 1: Update `canDeleteTask()` in `utils/deliverablePermissions.ts`

**Current** (line 318-320):
```typescript
export function canDeleteTask(user: User): boolean {
  return user.role === 'super_admin' || user.role === 'project_manager';
}
```

**Change to:**
```typescript
export function canDeleteTask(user: User, task?: Task): boolean {
  // Super admin and PM can delete any task
  if (user.role === 'super_admin' || user.role === 'project_manager') {
    return true;
  }
  // Any user can delete tasks they created
  if (task?.createdBy && task.createdBy === user.id) {
    return true;
  }
  return false;
}
```

### Step 2: Update backend DELETE handler in `netlify/functions/tasks.ts`

**Current** (lines 819-832): Only checks role against `['super_admin', 'project_manager']`.

**Change to:**
1. Keep the existing role check for super_admin and project_manager (they bypass ownership check).
2. If user is not super_admin/PM, query the task's `created_by` field.
3. If `created_by === auth.user.id`, allow deletion.
4. Otherwise, return 403.

```typescript
// Permission check: Admin/PM can delete any task; creators can delete their own
const deleteUserRole = auth?.user?.role;
const deleteAllowedRoles = ['super_admin', 'project_manager'];

if (!deleteAllowedRoles.includes(deleteUserRole)) {
  // Check if user is the task creator
  const taskOwnerCheck = await client.query(
    'SELECT created_by FROM tasks WHERE id = $1',
    [taskId]
  );
  if (!taskOwnerCheck.rows.length) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };
  }
  if (taskOwnerCheck.rows[0].created_by !== auth.user.id) {
    return {
      statusCode: 403, headers,
      body: JSON.stringify({ error: 'You can only delete tasks you created', code: 'PERMISSION_DENIED' }),
    };
  }
}
```

### Step 3: Update `pages/ProjectDetail.tsx` — pass task to `canDeleteTask()`

**Current** (line 1186):
```tsx
{user && canDeleteTask(user) && (
```

**Change to:**
```tsx
{user && canDeleteTask(user, task) && (
```

### Step 4: Update portal `TaskItem.tsx` — show Edit and Delete for task creators

**Current** `renderActions()` (lines 213-232): Only shows Edit for `isInternalUser`.

**Change to:**
```tsx
const renderActions = () => {
  const isTaskCreator = currentUser?.id === task.createdBy;

  if (isPrimaryContact && task.status === TaskStatus.AWAITING_APPROVAL) {
    return (
      <div className="flex space-x-2">
        <Button onClick={handleApprove} variant="primary">Approve</Button>
        <Button onClick={handleRequestRevision} variant="secondary">Request Revision</Button>
        {isTaskCreator && (
          <>
            <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
            <Button onClick={() => onDelete?.(task.id)} variant="destructive">Delete</Button>
          </>
        )}
      </div>
    );
  }

  if (isInternalUser) {
    return (
      <div className="flex space-x-2">
        <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
        <Button onClick={() => onDelete?.(task.id)} variant="destructive">Delete</Button>
      </div>
    );
  }

  // Client who created the task can edit and delete it
  if (isTaskCreator) {
    return (
      <div className="flex space-x-2">
        <Button onClick={() => onEdit(task)} variant="secondary">Edit</Button>
        <Button onClick={() => onDelete?.(task.id)} variant="destructive">Delete</Button>
      </div>
    );
  }

  return null;
};
```

Also update the component props to accept `onDelete`:
```tsx
onDelete?: (taskId: string) => void;
```

### Step 5: Update portal `TaskList.tsx` — add delete handler

Add a `handleDeleteTask` function that:
1. Shows a confirmation dialog/prompt.
2. Calls `deleteTaskAPI(taskId)` (already exists in `landing-page-new/src/lib/portal/api/tasks.api.ts`).
3. Removes the task from local state.
4. Pass `onDelete={handleDeleteTask}` to `<TaskItem>`.

---

## Assumptions and Edge Cases

### Assumptions
- `task.createdBy` is reliably populated for all tasks (the DB column `created_by` exists and is set on creation).
- The `deleteTaskAPI()` function in the portal already sends a DELETE request — only backend permission was blocking non-admin users.
- Hard delete (not soft delete) is acceptable, matching current behavior.
- Project managers retain their existing delete access (no change).

### Edge Cases
- **Task with no `createdBy`**: Old tasks might have `null` `created_by`. These can only be deleted by super_admin/PM (the creator check safely fails with `null !== userId`).
- **User deletes a task assigned to someone else**: Allowed only if they created it. The backend verifies `created_by`, not `assigned_to`.
- **Concurrent deletion**: If two users try to delete the same task, the second gets a 404. Frontend should handle this gracefully (remove from UI, show toast if already deleted).
- **Client editing restrictions still apply**: Even though clients can now see the Edit button for their own tasks, the backend still restricts which fields they can update (`title`, `description`, `status`, `dueDate` only). No change needed here.
- **Confirmation before delete**: The portal should show a confirmation dialog before deleting. The main app (`ProjectDetail.tsx`) should also confirm — check if it already does.

---

## What Will NOT Be Changed

- **No new dependencies or libraries** introduced.
- **No config/env/build/infrastructure changes**.
- **No changes to task creation flow**.
- **No changes to the main app's `canEditTask()` logic** (it already supports creators correctly).
- **No changes to the backend PATCH/UPDATE endpoint** (it already allows client creators to edit).
- **No changes to `TaskEditModal.tsx` or `TaskCreateForm.tsx`**.
- **No refactoring, renaming, or reformatting of unrelated code**.
- **No changes to comment deletion logic**.
- **No soft-delete migration** — stays as hard delete (existing pattern).

---

## References

- `utils/deliverablePermissions.ts:318-320` — current `canDeleteTask()`
- `utils/deliverablePermissions.ts:372-392` — existing `canEditTask()` (reference pattern)
- `netlify/functions/tasks.ts:807-852` — current DELETE handler
- `netlify/functions/tasks.ts:561-581` — PATCH creator check (reference pattern for DELETE)
- `pages/ProjectDetail.tsx:1174-1196` — main app edit/delete buttons
- `landing-page-new/src/lib/portal/components/TaskItem.tsx:213-232` — portal `renderActions()`
- `landing-page-new/src/lib/portal/api/tasks.api.ts:118-130` — existing `deleteTaskAPI()`
