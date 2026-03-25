---
title: "Portal activities not persisted to database - admin dashboard shows no recent activity"
date: 2026-01-30
category: logic-errors
tags:
  - activity-logging
  - database-persistence
  - admin-dashboard
  - portal
  - fire-and-forget
module: activity-logging
symptoms:
  - "Admin dashboard 'Recent Activity' shows only 1 old entry"
  - "Portal actions (task creation, status changes, team updates) don't appear in admin activity feed"
  - "Activities visible in portal UI (in-memory) but lost on page refresh"
  - "Project overview 'Recent Activity' sidebar shows 'No activity yet.' despite existing tasks"
severity: high
time_to_resolve: "2 hours"
resolved: true
occurrences: 2
---

# Portal activities not persisted to database

## Problem

The admin dashboard "Recent Activity" table only showed 1 activity. All portal actions (task creation, status changes, task updates, team member removal, file renames) were missing from the admin view.

## Root Cause

The portal had **two separate activity systems** that were never connected:

1. **In-memory**: `activityLogger.ts` utility functions (e.g., `createTaskStatusChangedActivity()`) create `Activity` objects stored in React state via `setProjectsData`. These are visible in the portal UI but lost on refresh.

2. **Database**: `createActivity()` in `activities.api.ts` makes a POST to `/activities` to persist to the database. The admin dashboard reads from this endpoint.

The in-memory functions were called, but `createActivity()` was never called alongside them. The API function existed and worked — it just wasn't wired up in the portal's action handlers.

## Solution

Import `createActivity` from `activities.api.ts` in `AppContext.tsx` and add fire-and-forget API calls at each action handler that creates in-memory activities.

### Files modified

| File | Change |
|------|--------|
| `landing-page-new/src/lib/portal/AppContext.tsx` | Added import + 5 `createActivity()` calls |

### Pattern: fire-and-forget alongside in-memory activity

```typescript
// In-memory activity (for portal UI)
const activity = createTaskStatusChangedActivity(currentUser, updatedTask, oldStatus, status);
updatedProject = { ...p, tasks, activities: [...p.activities, activity] };

// Database persistence (for admin dashboard) — fire-and-forget
createActivity({
  type: 'TASK_STATUS_CHANGED',
  userId: currentUser.id,
  userName: currentUser.name,
  projectId,
  details: { taskId: updatedTask.id, taskTitle: updatedTask.title, oldStatus, newStatus: status },
}).catch(err => console.error('Failed to log activity:', err));
```

### Call sites updated (5 total in AppContext.tsx)

| Function | Activity Type | Details |
|----------|--------------|---------|
| `updateTaskStatus` | `TASK_STATUS_CHANGED` | taskId, taskTitle, oldStatus, newStatus |
| `removeClientTeamMember` | `TEAM_MEMBER_REMOVED` | removedMemberName, removedMemberEmail |
| `addTask` | `TASK_CREATED` | taskId, taskTitle |
| `updateTask` | `TASK_UPDATED` | taskId, taskTitle, changes (only if changes detected) |
| `renameFile` | `FILE_RENAMED` | oldName, newName |

### No backend changes needed

The `createActivity()` API function and the `POST /activities` endpoint already existed. The `userId` from `AuthContext` is a UUID, matching the backend's `uuidSchema` validation.

## Complication: linter stripping the fix

The initial implementation was stripped by an IDE "organize imports on save" feature that:
1. Removed the `createActivity` import (seen as unused)
2. Removed the API call code along with it

**Why AppContext.tsx survived but AppRoot.tsx didn't**: AppRoot.tsx is legacy dead code (not imported anywhere). The IDE likely had AppRoot.tsx open and ran organize-imports on save, while AppContext.tsx was not open.

**Resolution**: AppRoot.tsx is dead code — only `AppContext.tsx` (via `AppProvider`) is used by the 20+ portal components. No changes needed in AppRoot.tsx.

## Prevention

### When adding activity logging

1. Always call both: the in-memory logger AND `createActivity()` API
2. Use fire-and-forget with `.catch()` so the UI isn't blocked
3. Verify by checking the admin dashboard after performing the action

### Avoid linter stripping

If a linter removes fire-and-forget calls, prefix with `void`:
```typescript
void createActivity({ ... }).catch(err => console.error('Failed:', err));
```

## Second Occurrence: `pages/ProjectDetail.tsx` (2026-01-30)

The same pattern resurfaced in the `pages/` app (Vite/React Router side). The project overview page showed "No activity yet." in the Recent Activity sidebar despite the project having tasks and deliverables.

### Why it wasn't caught earlier

`ProjectDetail.tsx` already had correct **fetch** logic (lines 272-299) calling `fetchActivities({ projectId })` and mapping results to `project.activityLog`. The fetch worked — the database simply had zero records for the project because no action handler ever called `createActivity()`.

### Additional fix: `AppContext.tsx` also missing fetch

The `landing-page-new` portal's `AppContext.tsx` had `createActivity` calls (from the first fix above) but never **fetched** activities on project load. `transformProject()` in `projects.api.ts` always initialized `activities: []`. Added `fetchActivities()` alongside `fetchTasksForProject()` via `Promise.all`.

### Files modified

| File | Change |
|------|--------|
| `pages/ProjectDetail.tsx` | Added `createActivity()` calls to 3 handlers + `activityRefreshKey` state for live UI updates |
| `landing-page-new/src/lib/portal/AppContext.tsx` | Added `fetchActivities()` on project load alongside task fetch |

### Call sites updated in ProjectDetail.tsx (3 total)

| Function | Activity Type | Details |
|----------|--------------|---------|
| `handleAddTask` | `TASK_CREATED` | taskId, taskTitle |
| `handleSaveTask` | `TASK_STATUS_CHANGED` or `TASK_UPDATED` | taskId, taskTitle, newStatus |
| `handleAddComment` | `COMMENT_ADDED` | taskId, taskTitle |

### Live UI refresh pattern

Used a state counter (`activityRefreshKey`) as an effect dependency to trigger activity list re-fetch after persisting:

```typescript
const [activityRefreshKey, setActivityRefreshKey] = useState(0);

// In the loadActivities effect:
useEffect(() => {
    // ... fetch and map activities ...
    loadActivities();
}, [project?.id, user?.id, activityRefreshKey]);

// After persisting an activity:
createActivity({ ... })
  .then(() => setActivityRefreshKey(k => k + 1))
  .catch(err => console.error('Failed to log activity:', err));
```

### Lesson

**Two codebases, same bug**: The app has two frontends (`landing-page-new/` portal and `pages/` admin). Both need activity persistence wired up independently. When fixing activity logging in one, check the other.

## Verification

1. Log in as super admin
2. Go to a project in the portal, create a task or change a task status
3. Go to the admin dashboard — the activity should appear in "Recent Activity"
4. Go to a project in the pages/ app, create a task — Recent Activity sidebar should update immediately
5. Check browser console for any "Failed to log activity" errors

## Related

- Branch: `feat/task-deletion-and-client-creation-permissions`, `feat/add-revisions-included-to-proposal`
- Portal: `landing-page-new/src/lib/portal/AppContext.tsx`
- Pages app: `pages/ProjectDetail.tsx`
- Dead code: `landing-page-new/src/lib/portal/AppRoot.tsx` (not imported anywhere)
- API clients: `landing-page-new/src/lib/portal/api/activities.api.ts`, `services/activityApi.ts`
- Backend: `netlify/functions/activities.ts`
- Admin dashboard: `pages/Dashboard.tsx` (fetches `GET /activities?limit=10`)
