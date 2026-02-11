---
title: API Field Name Mismatch Causes Task Data Loss on Page Refresh
date: 2026-01-30
category: integration-issues
tags:
  - api
  - field-mapping
  - data-persistence
  - netlify-functions
  - react
module: tasks
severity: high
resolved: true
symptoms:
  - Task assignee disappears after page refresh
  - Task due date disappears after page refresh
  - Due date updates via PATCH are silently dropped
  - Clearing description/assignee/deadline has no effect
  - No errors in console — data is silently lost
---

# API Field Name Mismatch Causes Task Data Loss on Page Refresh

## Problem

After editing a task (assigning someone, setting a due date), the changes appear to save (toast confirmation, UI updates) but are lost on page refresh. The assignee dropdown resets to "Unassigned" and the due date field is empty.

## Root Causes (3 issues)

### 1. Frontend doesn't map API response field names

The backend `mapTaskFromDB()` returns `assignedTo` (UUID) and `dueDate`. The frontend `Task` type uses `assigneeId` and `deadline`. When `fetchTasksForProject()` returns raw API data, those fields are silently undefined.

```
DB column:      assigned_to    due_date
Backend API:    assignedTo     dueDate      ← mapTaskFromDB()
Frontend type:  assigneeId     deadline     ← MISMATCH
```

### 2. Backend PATCH allowedFields uses wrong key

The PATCH handler's `allowedFields` array listed `'deadline'`, but the Zod-validated request body uses `'dueDate'`. The field never matched, so due date updates were silently dropped.

```typescript
// BEFORE (broken) — 'deadline' never matches Zod output 'dueDate'
const allowedFields = ['title', 'description', 'status', 'visibleToClient', 'assignedTo', 'deadline'];

// AFTER (fixed)
const allowedFields = ['title', 'description', 'status', 'visibleToClient', 'assignedTo', 'dueDate'];
```

### 3. Truthy checks prevent clearing fields

`taskApi.ts` used `if (updates.description)` which is falsy for empty string, preventing fields from being cleared to null.

## Solution

### Fix 1: Add `mapApiTask()` in `services/taskApi.ts`

```typescript
function mapApiTask(task: any): Task {
    return {
        ...task,
        assigneeId: task.assignedTo || task.assigneeId,
        deadline: task.deadline || task.dueDate,
    };
}
```

Applied to all three API functions: `fetchTasksForProject`, `createTask`, `updateTask`.

### Fix 2: Align `allowedFields` to Zod schema output

In `netlify/functions/tasks.ts`, changed `'deadline'` to `'dueDate'` in both `allowedFields` and the DB column mapping.

### Fix 3: Use `!== undefined` checks

```typescript
// BEFORE — can't clear fields
if (updates.assigneeId) apiPayload.assignedTo = updates.assigneeId;

// AFTER — empty string / null clears the field
if (updates.assigneeId !== undefined) apiPayload.assignedTo = updates.assigneeId || null;
```

## Files Changed

| File | Change |
|------|--------|
| `services/taskApi.ts` | Added `mapApiTask()`, applied to all responses, fixed truthy checks |
| `netlify/functions/tasks.ts` | Fixed `allowedFields` and DB column mapping to use `dueDate` |
| `netlify/functions/_shared/schemas.ts` | Made `description` nullable in `updateTaskSchema` |

## Prevention

When adding a new field that flows DB → Backend → Frontend:

1. Check `mapTaskFromDB()` output field name
2. Check Zod schema field name (must match)
3. Check `allowedFields` array (must match Zod output)
4. Check frontend `Task` type field name
5. If names differ, add mapping in `mapApiTask()`

**The rule**: `allowedFields` keys must match **Zod schema output keys** (camelCase), not database column names or frontend type names.

## Related

- Similar pattern in `proposals.ts` which uses a `fieldMapping` object to convert camelCase → snake_case
- `docs/solutions/database-issues/migration-if-not-exists-schema-mismatch.md`
