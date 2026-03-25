---
title: Task Assignee Lost After Inline Edit Save (Before Page Refresh)
date: 2026-01-30
category: ui-bugs
tags:
  - react-state
  - api-response-merge
  - optimistic-ui
  - task-editing
module: tasks
severity: medium
resolved: true
symptoms:
  - Assignee appears briefly after save then reverts to unassigned
  - Assignee shows correctly in task card after save but edit form shows "Unassigned"
  - Local state has assignee but API response overwrites it
---

# Task Assignee Lost After Inline Edit Save

## Problem

After assigning someone to a task via the inline edit form, the assignee appears momentarily but then disappears — even before page refresh. The API call succeeds (DB has the correct value), but the local React state loses the assignee User object.

## Root Cause

The `handleSaveTask` function merges the API response directly into the task list state:

```typescript
// BEFORE (broken)
setTasks(prevTasks =>
    prevTasks.map(t => t.id === taskId ? { ...t, ...updatedTask } : t)
);
```

The API returns `assignedTo: "uuid-string"` (from `mapTaskFromDB`), not `assignee: { id, name, avatar, ... }` (User object). The spread `...updatedTask` overwrites the local task, but since the API response has no `assignee` field, it stays undefined. The `assigneeId` was also missing due to the field name mismatch (`assignedTo` vs `assigneeId`).

Meanwhile, the edit form was only passing `assignee` (User object) in the updates — not `assigneeId` (string). So `handleSaveTask` had to extract `updates.assignee?.id`, which worked for the API call but not for the state merge.

## Solution

### Fix 1: Edit form passes both `assigneeId` and `assignee`

```typescript
// TaskEditForm handleSubmit
await onSave(task.id, {
    title: trimmedTitle,
    assigneeId: assigneeId || undefined,           // string UUID
    assignee: assigneeId                            // User object
        ? teamMembers.find(m => m.id === assigneeId)
        : undefined,
    // ... other fields
});
```

### Fix 2: State merge preserves local User object

```typescript
// handleSaveTask in ProjectDetail
setTasks(prevTasks =>
    prevTasks.map(t => t.id === taskId ? {
        ...t,
        ...updatedTask,
        assignee: updates.assignee,          // preserve User object from form
        assigneeId: updates.assigneeId ?? updates.assignee?.id,
    } : t)
);
```

## Files Changed

| File | Change |
|------|--------|
| `components/tasks/TaskCreateForm.tsx` | Edit form passes both `assigneeId` and `assignee` |
| `pages/ProjectDetail.tsx` | State merge explicitly sets `assignee` and `assigneeId` |

## Prevention

When merging API responses into local state that contains richer objects (User, Project, etc.) than the API returns (just UUIDs):

1. Don't blindly spread `...apiResponse` — it will overwrite rich local objects with nothing
2. Explicitly merge the fields you know the API doesn't return
3. Or: have the API return the full object (JOIN in the query) so the response is self-sufficient

## Related

- `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — the underlying field naming mismatch that compounded this issue
