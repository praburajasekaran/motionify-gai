---
title: "feat: Add polling-based real-time task synchronization across users"
type: feat
date: 2026-02-01
---

# Add Polling-Based Real-Time Task Synchronization Across Users

## Overview

Add automatic polling so that when any user creates, updates, or deletes a task (or uploads a file), other users viewing the same project see the changes without a manual page refresh. Uses TanStack React Query's `refetchInterval` — no new dependencies, no WebSockets, no SSE.

## Problem Statement

Currently, tasks in `ProjectDetail.tsx` are fetched once on mount via `useEffect` + `fetchTasksForProject()`. If User A creates a task, User B must manually refresh to see it. The same applies to task edits, deletions, and file uploads. This creates a stale, disconnected experience for multi-user collaboration.

## Proposed Solution

Create a `useTasks` React Query hook with `refetchInterval: 10_000` (10 seconds, matching the existing comment polling pattern). Replace the current `useEffect` + `useState` task-fetching in `ProjectDetail.tsx` with this hook. The backend already filters by role (clients only see `visibleToClient` tasks), so no backend changes are needed.

Similarly, create a `useProjectFiles` hook for file polling and refetch activities on the same interval.

### Why Polling (not WebSockets/SSE)

- **Serverless backend** — Netlify Functions are stateless; persistent connections aren't viable without adding infrastructure (Pusher, Ably, etc.)
- **Constraint: no new dependencies** — rules out adding a real-time service
- **Existing pattern** — `CommentThread.tsx:65` and `NotificationContext.tsx:120` already use 10s `setInterval` polling
- **TanStack React Query already installed** — `refetchInterval` is built-in, handles deduplication, caching, and background refetching automatically

## Technical Approach

### Architecture

```
┌──────────────────────────────────────────────┐
│  ProjectDetail.tsx                            │
│                                               │
│  useTasks(projectId)  ←── refetchInterval 10s │
│  useProjectFiles(projectId) ←── refetchInterval 10s │
│  useActivities(projectId) ←── refetchInterval 30s │
│                                               │
│  Mutations: createTask / updateTask / deleteTask │
│    └── onSuccess: invalidateQueries(['tasks']) │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  GET /api/tasks?projectId={id}               │
│  (Netlify Function — already role-filtered)  │
└──────────────────────────────────────────────┘
```

## Acceptance Criteria

- [x] Tasks auto-refresh every 10 seconds for all users on a project page
- [x] New tasks created by one user appear for other users within ~10 seconds
- [x] Deleted tasks disappear from other users' views within ~10 seconds
- [x] Task status/field updates reflect for other users within ~10 seconds
- [x] File uploads appear for other users within ~10 seconds
- [x] Activity log refreshes for other users within ~30 seconds
- [x] Polling pauses when browser tab is hidden (performance)
- [x] Polling resumes immediately when tab regains focus (with instant refetch)
- [x] Mutations (create/update/delete) trigger an instant local refetch (no 10s wait)
- [x] Editing a task inline is not disrupted by background polling refresh
- [x] No new npm dependencies introduced
- [x] Client users continue to see only `visibleToClient` tasks (existing backend filtering)

## Exact Files to Be Modified

| # | File Path | Change |
|---|-----------|--------|
| 1 | `hooks/useTasks.ts` | **NEW** — React Query hook for task fetching + polling + mutations |
| 2 | `hooks/useProjectFiles.ts` | **NEW** — React Query hook for project files fetching + polling |
| 3 | `hooks/useActivities.ts` | **NEW** — React Query hook for activities fetching + polling |
| 4 | `pages/ProjectDetail.tsx` | Replace `useEffect`/`useState` task/file/activity fetching with new hooks; wire mutation callbacks |

## Step-by-Step Implementation Plan

### Step 1: Create `hooks/useTasks.ts`

Create a React Query-based hook following the pattern in `shared/hooks/useProposals.ts`:

```typescript
// hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasksForProject, createTask, updateTask, deleteTask } from '../services/taskApi';
import type { Task } from '../services/taskApi';

const POLL_INTERVAL = 10_000; // 10 seconds

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId] as const,
};

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.list(projectId!),
    queryFn: () => fetchTasksForProject(projectId!, true),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false, // pause when tab hidden
    staleTime: 5_000, // consider fresh for 5s to avoid redundant fetches
    throwOnError: false, // don't crash on poll failure
  });
}

export function useCreateTask(projectId: string) { /* useMutation + invalidate */ }
export function useUpdateTask(projectId: string) { /* useMutation + invalidate */ }
export function useDeleteTask(projectId: string) { /* useMutation + invalidate */ }
```

Key decisions:
- `refetchIntervalInBackground: false` — pauses polling when tab is hidden
- `throwOnError: false` — a failed poll shouldn't crash the app
- `staleTime: 5_000` — prevents redundant fetches when invalidating after mutations
- Mutations call `queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })` for instant local refresh

### Step 2: Create `hooks/useProjectFiles.ts`

Same pattern for project files polling:

```typescript
// hooks/useProjectFiles.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

const POLL_INTERVAL = 10_000;

export const projectFileKeys = {
  all: ['projectFiles'] as const,
  list: (projectId: string) => [...projectFileKeys.all, 'list', projectId] as const,
};

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: projectFileKeys.list(projectId!),
    queryFn: () => fetchProjectFiles(projectId!),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
}
```

Note: Will need to extract the existing file fetch logic from `ProjectDetail.tsx` (currently files come from `project.files` — may need a dedicated API endpoint or continue using the project endpoint).

### Step 3: Create `hooks/useActivities.ts`

Activities poll at a longer interval (30s) since they're less time-critical:

```typescript
// hooks/useActivities.ts
const POLL_INTERVAL = 30_000; // 30 seconds — less urgent than tasks

export function useActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ['activities', 'list', projectId!],
    queryFn: () => fetchActivities({ projectId: projectId!, limit: 50 }),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    throwOnError: false,
  });
}
```

### Step 4: Refactor `pages/ProjectDetail.tsx`

Replace the existing task/file/activity state management:

**Remove:**
- `const [tasks, setTasks] = useState<Task[]>(...)` (line 173)
- `useEffect` that calls `fetchTasksForProject` (lines 252-269)
- `useEffect` that calls `fetchActivities` (lines 271-299)
- Direct `setTasks()` calls in task mutation handlers

**Replace with:**
```typescript
const { data: tasks = [], isLoading: tasksLoading } = useTasks(project?.id);
const { data: activities = [] } = useActivities(project?.id);
const createTaskMutation = useCreateTask(project?.id);
const updateTaskMutation = useUpdateTask(project?.id);
const deleteTaskMutation = useDeleteTask(project?.id);
```

**Critical: Preserve editing state during polls.**
The current `editingTask` state tracks which task is open in the edit form. Since React Query replaces the `tasks` array reference on each poll, the edit form must use its own local copy of the task data (which `TaskEditForm` already does — it copies props into local state on mount). No additional work needed here as long as we don't force re-mount the form on data change.

**Wire mutation handlers:**
```typescript
const handleCreateTask = async (taskData) => {
  await createTaskMutation.mutateAsync(taskData);
  // invalidation handled by hook — no manual setTasks needed
};

const handleDeleteTask = async (taskId) => {
  await deleteTaskMutation.mutateAsync(taskId);
  // invalidation handled by hook
};
```

## Assumptions and Edge Cases

### Assumptions
1. **10-second interval is acceptable latency** — not true real-time, but matches existing CommentThread pattern and is adequate for a project management tool
2. **Backend already handles role-based filtering** — confirmed in `tasks.ts:163-167`, clients only see `visibleToClient` tasks
3. **TaskEditForm uses local state** — confirmed in `TaskCreateForm.tsx`, the edit form copies props into local state, so background polls won't disrupt an active edit
4. **Project files come from project data** — files are currently set from `project.files` on mount; if no dedicated files endpoint exists, file polling may require fetching the project endpoint

### Edge Cases Handled
| Edge Case | Handling |
|-----------|----------|
| User editing task while poll refreshes | Edit form uses local state; poll updates the list but doesn't re-mount the form |
| Two users edit same task simultaneously | Last write wins (standard HTTP semantics); no conflict resolution needed for MVP |
| Network error during poll | `throwOnError: false` + React Query's built-in retry (1 retry per QueryProvider config) |
| Tab hidden for a long time | Polling pauses; on tab focus, React Query refetches stale data immediately |
| Rapid create/delete by same user | Mutation's `onSuccess` invalidates cache for instant local update; next poll confirms server state |
| Large task list performance | `includeComments: true` adds overhead; consider switching to `false` for polls and only fetching comments on demand (future optimization) |

### Edge Cases NOT Handled (Out of Scope)
- Optimistic updates for create/update/delete (can add later)
- Conflict resolution for simultaneous edits
- Notification toast when new tasks appear from other users

## What Will NOT Be Changed

- **`netlify/functions/tasks.ts`** — No backend changes needed; existing GET endpoint already role-filters
- **`services/taskApi.ts`** — API service layer stays as-is; hooks wrap these functions
- **`components/tasks/TaskCreateForm.tsx`** — Form component unchanged
- **`components/tasks/CommentItem.tsx`** — Comment component unchanged
- **`components/tasks/MentionInput.tsx`** — Mention component unchanged
- **`components/files/FileUpload.tsx`** — Upload component unchanged
- **`components/files/FileList.tsx`** — File list component unchanged
- **`shared/providers/QueryProvider.tsx`** — Global React Query config unchanged
- **`netlify/functions/_shared/*`** — No middleware/shared utility changes
- **`database/*`** — No schema or migration changes
- **Config files** — No changes to `package.json`, `tsconfig.json`, `vite.config.ts`, etc.

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Increased API load from polling | 10s interval is modest; `refetchIntervalInBackground: false` prevents hidden-tab waste |
| Serverless cold starts on poll | Netlify Functions stay warm with regular traffic; cold start is ~200ms |
| Stale data flash on tab return | React Query refetches immediately on focus; staleTime of 5s prevents double-fetch |
| Breaking existing task state management | Incremental migration — replace useState/useEffect one piece at a time; test each step |

## References

### Internal References
- `shared/hooks/useProposals.ts` — existing React Query hook pattern to follow
- `components/proposals/CommentThread.tsx:65` — existing 10s polling pattern
- `contexts/NotificationContext.tsx:114-133` — existing polling with visibility API
- `netlify/functions/tasks.ts:155-197` — GET tasks endpoint with role filtering
- `pages/ProjectDetail.tsx:252-269` — current task fetch logic to replace
- `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md` — state merge gotcha to avoid

### External References
- [TanStack React Query refetchInterval docs](https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching)
