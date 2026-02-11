---
title: "Client-assigned tasks invisible to clients due to hardcoded visible_to_client: false"
date: 2026-02-01
category: logic-errors
tags:
  - task-management
  - access-control
  - visibility
  - client-experience
module: Task Management
component: TaskCreateForm.tsx
symptoms:
  - Admin creates a task and assigns it to a client user
  - Client cannot see the task in their task list
  - No error messages shown — task silently hidden
  - Task only visible after admin manually edits it and toggles visibility
severity: high
---

# Client-Assigned Tasks Invisible to Clients

## Problem

When a super admin creates a task via the TaskCreateForm and assigns it to a client, the client cannot see the task. The task appears to be created successfully (admin sees it), but it never shows up for the client user.

## Root Cause

Three-layer problem:

1. **`TaskCreateForm.tsx` line 287**: `visible_to_client` was hardcoded to `false` in the `createTask()` call.
2. **`TaskCreateForm.tsx` line 354**: The visibility toggle was hidden in create mode (`showVisibilityField={false}`), so admins had no way to change it.
3. **`tasks.ts` backend lines 162-167**: The GET endpoint filters out tasks where `visibleToClient` is falsy for client role users.

The visibility toggle UI already existed in `TaskFormFields` (used by the edit form), but it was never shown during task creation.

```typescript
// TaskCreateForm.tsx — the bug
const newTask = await createTask({
  project_id: projectId,
  title: trimmedTitle,
  visible_to_client: false,  // <-- always false, regardless of intent
  // ...
});

// TaskFormFields usage in create mode
<TaskFormFields
  showVisibilityField={false}  // <-- toggle never shown
/>
```

## Solution

Added `visibleToClient` state to the create form and conditionally show the toggle for non-client users. Clients' own tasks are always visible to clients.

### Changes to `components/tasks/TaskCreateForm.tsx`:

```typescript
// Added state
const isClientRole = userRole === 'client';
const [visibleToClient, setVisibleToClient] = useState(false);

// Reset form now clears visibility
const resetForm = () => {
  // ...existing resets...
  setVisibleToClient(false);
};

// createTask call uses state instead of hardcoded false
const newTask = await createTask({
  project_id: projectId,
  title: trimmedTitle,
  visible_to_client: isClientRole ? true : visibleToClient,
  // ...
});

// TaskFormFields now receives visibility props and shows toggle
<TaskFormFields
  visibleToClient={visibleToClient}
  setVisibleToClient={setVisibleToClient}
  showVisibilityField={!isClientRole}
/>
```

## Key Insight

The backend filtering was correct — the bug was purely in the frontend create form defaulting to hidden. The visibility toggle UI already existed (for the edit form) but was suppressed during creation. The fix was minimal: expose the existing toggle and wire the state.

## Prevention

- When adding boolean permission/visibility fields to create forms, ensure the default matches the most common use case or is explicitly configurable.
- If a toggle exists in edit mode, ask whether it should also appear in create mode.
- Test task creation flows from the client's perspective, not just the admin's.

## Related

- `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md` — related task state management issue
- `docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — related API field mapping
