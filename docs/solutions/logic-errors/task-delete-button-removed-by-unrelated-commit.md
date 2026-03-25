---
title: "Task delete button accidentally removed during activities persistence fix"
date: 2026-01-30
category: logic-errors
tags:
  - tasks
  - deletion
  - permissions
  - project-detail
  - commit-regression
  - admin-features
module: tasks
symptoms:
  - "Task delete button (trash icon) missing from ProjectDetail task rows"
  - "Admin/PM users cannot delete tasks"
  - "canDeleteTask function no longer exported from deliverablePermissions"
severity: high
resolved: true
occurrences: 1
---

# Task Delete Button Accidentally Removed by Unrelated Commit

## Symptom

The task delete button (trash icon) was no longer visible next to the Edit button on task rows in the admin ProjectDetail page, despite having been implemented and tested.

## Root Cause

Commit `b29b3be` ("fix(activities): persist activities from ProjectDetail page") **overwrote** the delete feature added in `3b32280` ("feat(tasks): add task deletion for admins and client task creation").

The activities commit produced a diff that removed:

1. **`pages/ProjectDetail.tsx`**:
   - `Trash2` icon import
   - `canDeleteTask`, `deleteTask` imports
   - `handleDeleteTask` async function (confirmation + API call + toast)
   - Delete button JSX (`<Button>` with `<Trash2>` icon)

2. **`utils/deliverablePermissions.ts`**:
   - `canDeleteTask()` function export

The likely cause: the activities fix was developed against an older version of the file (before the delete feature landed), so when it was committed, it replaced the file contents wholesale — silently reverting the delete feature.

## Investigation

1. Noticed the delete button was missing from the UI
2. Searched for `canDeleteTask` / `Trash2` / `handleDeleteTask` in current code — not found
3. Found commit `3b32280` that originally added the feature via `git log --grep="delete"`
4. Ran `git log 3b32280..HEAD -- pages/ProjectDetail.tsx` — found one commit: `b29b3be`
5. Diffed `git diff 3b32280..b29b3be -- pages/ProjectDetail.tsx` — confirmed the activities commit removed all delete-related code

## Solution

Restored all removed code:

**`pages/ProjectDetail.tsx`** — imports:
```tsx
import { Trash2 } from 'lucide-react';
import { canDeleteTask } from '../utils/deliverablePermissions';
import { deleteTask } from '../services/taskApi';
```

**`pages/ProjectDetail.tsx`** — handler function:
```tsx
const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    try {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        addToast({ title: 'Task Deleted', description: 'Task has been deleted successfully', variant: 'success' });
    } catch (err) {
        console.error('Failed to delete task:', err);
        addToast({ title: 'Error', description: 'Failed to delete task. Please try again.', variant: 'destructive' });
    }
};
```

**`pages/ProjectDetail.tsx`** — JSX (next to Edit button):
```tsx
{user && canDeleteTask(user) && (
    <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)}
        className="h-7 w-7 p-0 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
        title="Delete task">
        <Trash2 className="h-3.5 w-3.5" />
    </Button>
)}
```

**`utils/deliverablePermissions.ts`** — permission function:
```tsx
export function canDeleteTask(user: User): boolean {
  return user.role === 'super_admin' || user.role === 'project_manager';
}
```

## Prevention

- **Review diffs carefully** when a commit touches a file that was recently modified by another feature branch. Look for unintended removals.
- **Use feature branches** and rebase onto the latest main before committing, so new features are preserved in the base.
- **After committing a large change to a shared file**, spot-check that recently added features still exist by scanning for their key identifiers (function names, imports).

## Related

- [Activity not persisted to database](./activity-not-persisted-to-database.md) — the commit that caused this regression was fixing activity persistence
- Commit `3b32280`: original delete feature
- Commit `b29b3be`: regression commit
