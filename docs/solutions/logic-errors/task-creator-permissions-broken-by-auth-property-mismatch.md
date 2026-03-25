---
title: Task edit/delete buttons not visible to task creators due to auth property mismatch
category: logic-errors
module: Task Management
tags:
  - permissions
  - authorization
  - task-creator
  - createdBy
  - property-mismatch
  - auth-middleware
symptoms:
  - Edit button not visible to clients who created tasks
  - Delete button not available to task creators
  - createdBy field set to wrong user on new tasks
  - Client self-assignment check silently failing
severity: high
date_resolved: 2026-01-31
---

## Problem

Task edit and delete buttons were not visible to clients who created tasks in the main admin app. The `createdBy` field was never correctly set on newly created tasks.

## Symptoms

- Client logs in, creates a task, but sees no edit or delete button on it
- `createdBy` in the database points to a random user instead of the actual creator
- Client self-assignment silently stripped because the identity check always fails

## Root Cause

Property name mismatch between the auth middleware and `tasks.ts`.

The `AuthResult.user` interface in `netlify/functions/_shared/middleware.ts` defines the user ID as `userId`:

```typescript
// middleware.ts:37-42
export interface AuthResult {
    user?: {
        userId: string;  // <-- the correct property name
        email: string;
        role: string;
        fullName: string;
    };
}
```

But `netlify/functions/tasks.ts` was referencing `auth.user.id` (a non-existent property) in three places:

1. **Task creation** (line 463): `createdBy = auth?.user?.id` — always `undefined`, fell back to `SELECT id FROM users LIMIT 1` (random user)
2. **Client self-assignment check** (line 454): `taskData.assignedTo !== auth?.user?.id` — always `true`, so client assignments were stripped
3. **Client edit permission** (line 567): `created_by !== auth.user.id` — always failed, blocking edits

Additionally, the delete handler only allowed admin/PM roles with no creator-based permission check.

## Solution

### 1. Fix property references in `netlify/functions/tasks.ts`

Three occurrences of `auth.user.id` changed to `auth.user.userId`:

```typescript
// Line 454: Client self-assignment check
if (taskData.assignedTo && taskData.assignedTo !== auth?.user?.userId) {

// Line 463: Task creator attribution
let createdBy = auth?.user?.userId || null;

// Line 567: Client edit permission check
if (!taskCreatorCheck.rows.length || taskCreatorCheck.rows[0].created_by !== auth.user.userId) {
```

### 2. Add creator-based delete permission in backend (`netlify/functions/tasks.ts`)

Updated the DELETE handler to check `created_by` against the authenticated user when the user is not admin/PM:

```typescript
if (!deleteAllowedRoles.includes(deleteUserRole)) {
    const creatorCheck = await client.query(
        'SELECT created_by FROM tasks WHERE id = $1', [taskId]
    );
    if (!creatorCheck.rows.length || creatorCheck.rows[0].created_by !== auth?.user?.userId) {
        return { statusCode: 403, ... };
    }
}
```

### 3. Update frontend permission function (`utils/deliverablePermissions.ts`)

```typescript
// Before
export function canDeleteTask(user: User): boolean {
    return user.role === 'super_admin' || user.role === 'project_manager';
}

// After
export function canDeleteTask(user: User, task?: Task): boolean {
    if (user.role === 'super_admin' || user.role === 'project_manager') return true;
    if (task?.createdBy && task.createdBy === user.id) return true;
    return false;
}
```

### 4. Update frontend call site (`pages/ProjectDetail.tsx`)

```typescript
// Before
{user && canDeleteTask(user) && (

// After
{user && canDeleteTask(user, task) && (
```

## Files Modified

- `netlify/functions/tasks.ts` — Fixed `auth.user.id` → `auth.user.userId` (3 places); added creator-based delete permission
- `utils/deliverablePermissions.ts` — Updated `canDeleteTask` signature to accept optional task
- `pages/ProjectDetail.tsx` — Pass task to `canDeleteTask` call

## Prevention

- **Pattern to watch for:** The auth middleware uses `userId`, not `id`. Any new code accessing the authenticated user's ID must use `auth.user.userId`.
- **Existing tasks:** Tasks created before this fix have incorrect `created_by` values in the database. Consider a backfill migration if needed.
- **TypeScript would catch this:** If `auth.user` were strongly typed throughout `tasks.ts` (not `any`), the compiler would flag `auth.user.id` as a type error.

## Related Documentation

- [Task delete button removed by unrelated commit](./task-delete-button-removed-by-unrelated-commit.md)
- [API field name mismatch causes task data loss](../integration-issues/api-field-name-mismatch-task-data-loss.md)
- [Client deliverables hidden by status filter](./client-deliverables-hidden-by-status-filter.md)
