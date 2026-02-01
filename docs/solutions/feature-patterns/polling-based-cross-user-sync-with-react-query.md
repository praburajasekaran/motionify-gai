---
title: "Polling-based cross-user sync for tasks, activities, and files using React Query"
date: 2026-02-01
category: feature-patterns
tags:
  - react-query
  - polling
  - real-time-sync
  - cross-user
  - tasks
  - activities
  - project-files
module: Project Detail
component: ProjectDetail.tsx, shared/hooks/
symptoms:
  - User A creates/edits/deletes a task, User B must refresh to see changes
  - File uploads only visible to the uploader (local state only)
  - Activity log stale until manual refresh
  - Project files lost on page refresh (no database persistence)
severity: high
---

# Polling-Based Cross-User Sync with React Query

## Problem

`ProjectDetail.tsx` used `useEffect` + `useState` for tasks, activities, and files. Data was fetched once on mount and never refreshed. Mutations updated local state only, so other users viewing the same project saw stale data until they refreshed the page.

Project files had an additional problem: file metadata was only stored in React state — never persisted to a database. Files disappeared on page refresh.

## Solution Architecture

```
ProjectDetail.tsx
  useTasks(projectId)         ← refetchInterval 10s
  useProjectFiles(projectId)  ← refetchInterval 10s
  useActivities(projectId)    ← refetchInterval 30s

  Mutations → onSuccess: invalidateQueries (instant local update)
```

### Why Polling (Not WebSockets)

- Serverless backend (Netlify Functions) — no persistent connections
- No new dependencies constraint — TanStack React Query already installed
- Existing pattern — `CommentThread.tsx` and `NotificationContext.tsx` already use 10s `setInterval`
- `refetchInterval` is built-in to React Query, handles deduplication and caching

### Hook Pattern

All three hooks follow the same pattern (modeled after existing `useProposals.ts`):

```typescript
// shared/hooks/useTasks.ts
const POLL_INTERVAL = 10_000;

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
};

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.list(projectId!),
    queryFn: () => fetchTasksForProject(projectId!, true),
    enabled: !!projectId,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,  // pause when tab hidden
    staleTime: 5_000,                    // prevent redundant fetches after invalidation
    throwOnError: false,                 // failed poll shouldn't crash app
  });
}
```

### Key Configuration

| Option | Value | Why |
|--------|-------|-----|
| `refetchInterval` | 10s (tasks/files) / 30s (activities) | Matches existing CommentThread pattern |
| `refetchIntervalInBackground` | `false` | Don't waste API calls on hidden tabs |
| `staleTime` | 5s (tasks only) | Prevents double-fetch when invalidating after mutation |
| `throwOnError` | `false` | Network failures during polling shouldn't crash the page |

### Mutation Invalidation Pattern

After any mutation (create/update/delete), invalidate the query cache for instant local refresh:

```typescript
const invalidateTasks = () => {
  queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
};

// In handlers:
await deleteTask(taskId);
invalidateTasks();  // instant refresh, no 10s wait
```

### Project Files — Full Stack Addition

Project files had no database persistence. Added:

1. **Migration** (`014_create_project_files.sql`): `project_files` table with `project_id`, `file_name`, `file_type`, `file_size`, `r2_key`, `uploaded_by`
2. **API** (`netlify/functions/project-files.ts`): GET/POST/DELETE with auth middleware
3. **Service** (`services/projectFileApi.ts`): Client-side API calls
4. **Hook** (`shared/hooks/useProjectFiles.ts`): React Query with 10s polling

File upload flow changed from:
```
Upload to R2 → Save to local state (lost on refresh)
```
To:
```
Upload to R2 → POST /project-files (persist to DB) → Invalidate cache → Poll syncs to other users
```

## Files Created/Modified

| File | Change |
|------|--------|
| `shared/hooks/useTasks.ts` | **New** — task polling + mutation hooks |
| `shared/hooks/useActivities.ts` | **New** — activity polling + invalidation helper |
| `shared/hooks/useProjectFiles.ts` | **New** — file polling + mutation hooks |
| `database/migrations/014_create_project_files.sql` | **New** — project_files table |
| `netlify/functions/project-files.ts` | **New** — files CRUD endpoint |
| `services/projectFileApi.ts` | **New** — client API service |
| `pages/ProjectDetail.tsx` | Replaced useState/useEffect with hooks |

## Edge Cases Handled

| Case | How |
|------|-----|
| User editing task while poll refreshes | Edit form uses local state; poll updates list but doesn't re-mount form |
| Tab hidden for long time | Polling pauses; on tab focus, React Query refetches stale data immediately |
| Network error during poll | `throwOnError: false` + React Query retry |
| Rapid create/delete by same user | Mutation `onSuccess` invalidates cache for instant update |
| File upload succeeds but DB save fails | Toast warns user; file exists in R2 but won't appear in list |

## Prevention / Best Practices

- For any new data displayed on `ProjectDetail`, create a React Query hook with polling rather than `useEffect` + `useState`.
- Always use query key factories (`taskKeys`, `activityKeys`, etc.) for consistent cache invalidation.
- When adding a new resource type (like project files), check whether it needs database persistence — don't rely on frontend state alone.

## Related

- `docs/solutions/logic-errors/activity-not-persisted-to-database.md` — the `activityRefreshKey` pattern that was replaced
- `docs/plans/2026-02-01-feat-task-polling-cross-user-sync-plan.md` — original implementation plan
- `shared/hooks/useProposals.ts` — the existing React Query hook pattern we followed
