---
title: "feat: Allow task self-assignment for all user roles"
type: feat
date: 2026-01-31
---

# feat: Allow task self-assignment for all user roles

## Overview

Currently, client users cannot assign tasks to anyone (backend strips `assignedTo`), and the assignee dropdown shows "No team members" when the current user is not in the project team list. This plan adds self-assignment capability for all roles and defines a clear assignment permission matrix.

## Problem Statement

From the screenshot: a client user ("Prabu Shane") sees the task creation form with the assignee dropdown showing "No team members" — even though the client themselves should at minimum be able to assign the task to themselves.

**Root causes:**

1. **Backend strips `assignedTo` for clients** — `netlify/functions/tasks.ts:452-454` sets `taskData.assignedTo = undefined` for all client roles on POST
2. **Backend blocks all PATCH for clients** — `netlify/functions/tasks.ts:562` returns 403 for any client trying to update a task
3. **Dropdown depends on `project.team`** — if the client isn't in the team list (or the team list is empty), the dropdown is disabled with "No team members"
4. **`canEditTask()` returns false for clients** — `utils/deliverablePermissions.ts:389` prevents clients from editing tasks entirely

## Proposed Solution

### Assignment Permission Matrix

| Role | Assign to self | Assign to others | Reassign existing tasks |
|------|---------------|-----------------|------------------------|
| `super_admin` | Yes | Yes (any team member) | Yes (any task) |
| `project_manager` | Yes | Yes (any team member) | Yes (any task) |
| `team_member` | Yes | No | Only own tasks |
| `client` | Yes (create only) | No | No |

### Key Design Decisions

- **Clients can self-assign on create only** — they still cannot PATCH/edit tasks (no backend change to PATCH needed for clients)
- **The assignee dropdown always shows "Assign to me" as the first option** for all roles, even if the user isn't in `project.team`
- **No database changes needed** — `assigned_to` column already accepts any UUID from the `users` table
- **Backend validation**: allow clients to set `assignedTo` ONLY to their own user ID

## Technical Approach

### 1. Backend — Allow client self-assignment on POST

**File:** `netlify/functions/tasks.ts`

Current code (lines 452-455):
```typescript
if (isClientUser) {
  taskData.assignedTo = undefined;  // ← strips assignment entirely
  taskData.priority = undefined;
}
```

Change to:
```typescript
if (isClientUser) {
  // Clients can only assign to themselves
  if (taskData.assignedTo && taskData.assignedTo !== auth?.user?.id) {
    taskData.assignedTo = undefined;
  }
  taskData.priority = undefined;
}
```

This preserves the security constraint (clients can't assign tasks to other people) while allowing self-assignment.

### 2. Frontend — Always show "Assign to me" option

**File:** `components/tasks/TaskCreateForm.tsx` (TaskFormFields, lines 150-173)

Current dropdown logic:
```tsx
<option value="">
  {teamMembers.length ? 'Unassigned' : 'No team members'}
</option>
{teamMembers.some(m => m.id === userId) && (
  <option value={userId}>...</option>
)}
```

Change to always show the current user as an option, even if not in `teamMembers`:

```tsx
<option value="">Unassigned</option>
{/* Always show "Assign to me" */}
<option value={userId}>
  {currentUserName} (me)
</option>
{/* Show other team members (excluding self, already shown above) */}
{teamMembers
  .filter(m => m.id !== userId)
  .map((member) => (
    <option key={member.id} value={member.id}>{member.name}</option>
  ))}
```

This requires passing the current user's name to `TaskFormFields`. Options:
- Add a `userName` prop (simplest)
- Find user name from `teamMembers` if present, fallback to a new prop

The dropdown should also **never be disabled** — remove the `disabled={!teamMembers.length}` since self-assignment is always available.

### 3. Frontend — Role-based dropdown filtering

**File:** `components/tasks/TaskCreateForm.tsx` (TaskFormFields)

For client users, only show the "Assign to me" option (not other team members):

```tsx
{/* Show other team members only for non-client roles */}
{!isClientRole && teamMembers
  .filter(m => m.id !== userId)
  .map((member) => (
    <option key={member.id} value={member.id}>{member.name}</option>
  ))}
```

This requires passing the user's role to `TaskFormFields`. Options:
- Add a `userRole` prop
- Add a `user: User` prop instead of separate `userId`/`userName`/`userRole` (cleaner)

### 4. Frontend permissions — Add `canAssignTask`

**File:** `utils/deliverablePermissions.ts`

Add a new permission function:

```typescript
/**
 * Check if user can assign a task to a specific target user
 * All roles can assign to self. Only admin/PM can assign to others.
 */
export function canAssignTask(user: User, targetUserId: string): boolean {
  // Everyone can assign to themselves
  if (targetUserId === user.id) return true;
  // Only admin/PM can assign to others
  return user.role === 'super_admin' || user.role === 'project_manager';
}
```

### 5. No changes needed for PATCH endpoint

Client users still cannot edit tasks (PATCH returns 403). This is correct — the self-assignment feature is for task creation only. If a client wants to change assignment after creation, they must ask an admin/PM.

Team members can already PATCH tasks assigned to them (the backend allows non-client PATCH), so they can reassign their own tasks to themselves or update them.

## Acceptance Criteria

- [x] Client users see "Assign to me" in the assignee dropdown when creating a task
- [x] Client users can successfully create a task assigned to themselves (API accepts it)
- [x] Client users CANNOT assign tasks to other team members (backend enforces)
- [x] Team members see "Assign to me" + all other team members in the dropdown
- [x] Admin/PM see full team member list as before
- [x] Dropdown is never disabled — always shows at least "Unassigned" and "(me)"
- [x] Existing task edit behavior is unchanged (clients still cannot edit, team members can edit own tasks)
- [x] Assignment email notification fires when a client self-assigns

## Files to Modify

| File | Change |
|------|--------|
| `netlify/functions/tasks.ts` | Allow client self-assignment on POST (line ~452) |
| `components/tasks/TaskCreateForm.tsx` | Always show "me" option, pass user info, role-filter dropdown |
| `utils/deliverablePermissions.ts` | Add `canAssignTask()` function |
| `components/tasks/TaskEditModal.tsx` | Same dropdown changes for edit modal (if applicable) |

## Edge Cases

1. **Client not in `project.team`** — "Assign to me" still appears because it's based on `userId`, not `project.team`
2. **Client tries to assign to someone else via API manipulation** — Backend validates `assignedTo === auth.user.id` for clients
3. **Team member tries to assign to another team member** — Dropdown shows all members but `canAssignTask` could be used for future validation
4. **User's name not available** — Fallback to "Me" or "Myself" if name prop is missing
5. **Assignment email to self** — The email notification system should still send it (confirms assignment)

## Institutional Learnings Applied

- **Pass both `assigneeId` and `assignee` object** when saving (from task-assignee-lost-after-inline-edit-save)
- **Check all 3 permission layers** — API, utility functions, error messages (from client-deliverables-hidden-by-status-filter)
- **allowedFields must match Zod schema keys** (from api-field-name-mismatch-task-data-loss)
- **Don't blindly spread API responses** — preserve local User objects (from task-assignee-lost-after-inline-edit-save)

## References

- `netlify/functions/tasks.ts:446-455` — Client field stripping on POST
- `netlify/functions/tasks.ts:558-571` — Client PATCH 403 block
- `components/tasks/TaskCreateForm.tsx:150-173` — Assignee dropdown rendering
- `utils/deliverablePermissions.ts:372-390` — canEditTask permission
- `utils/deliverablePermissions.ts:326-328` — canCreateTask permission
- `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md`
- `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md`
