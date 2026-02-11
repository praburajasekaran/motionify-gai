---
title: Add proper task creation form with assignee and date fields
type: feat
date: 2026-01-29
---

# Add Proper Task Creation Inline Form

## Overview

Replace the single-line natural language task input with a proper inline form that has explicit fields for Title, Description, Assignee, and Due Date. The current NLP-based input (`"Add a task... (e.g., 'Review design @john tomorrow')"`) is undiscoverable and limiting — users don't know what keywords work and can't set a description at creation time.

## Problem Statement

The current task creation flow at `pages/ProjectDetail.tsx:1176-1196` is a single `<Input>` that uses `utils/taskParser.ts` to extract `@name` mentions and date keywords ("tomorrow", "next week", "today"). Problems:

1. **Undiscoverable** — users must know the `@name` and keyword syntax
2. **No description field** — `description` is set to the same value as `title` (line 402)
3. **Limited date support** — only "today", "tomorrow", "next week" work; no arbitrary date selection
4. **No visual feedback** — no indication of who got assigned or what deadline was parsed
5. **Assignee matching is fragile** — matches on first name only, case-insensitive

## Proposed Solution

Replace the single-line input with a collapsible inline form that expands when the user clicks "+ Add Task". The form has four fields: Title (required), Description (optional), Assignee dropdown (optional), and Due Date picker (optional).

### UI Behavior

- **Collapsed state:** A button or styled prompt reading "+ Add Task" (similar to the current input area)
- **Expanded state:** An inline card/form with the four fields, plus "Create Task" and "Cancel" buttons
- **After submission:** Form resets and stays expanded for rapid multi-task creation
- **Cancel / Escape:** Collapses the form, clears fields
- **Enter key on Title field:** Submits the form (same as clicking "Create Task")

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | Text input | Yes | Max length per `nameSchema` (existing Zod validation) |
| Description | Textarea | No | Max 5000 chars (existing Zod validation) |
| Assignee | Select dropdown | No | Populated from `project.team` (real API data, not `TEAM_MEMBERS` constant) |
| Due Date | `<input type="date">` | No | Native HTML date input — simple, accessible, no library needed |

### Key Decisions

1. **Native `<input type="date">`** over a third-party date picker. The codebase has no date picker component, and a native input is simple, accessible, and sufficient for picking a due date. Can be upgraded later if needed.

2. **Use `project.team`** for the assignee dropdown, not the hardcoded `TEAM_MEMBERS` from `constants.ts`. This is also a fix for the `TaskEditModal` which currently uses the wrong data source (`ProjectDetail.tsx:1206`).

3. **Keep the NLP parser as a stretch/future option** — don't remove `utils/taskParser.ts`, but the inline form is the primary creation method.

4. **Form stays expanded after submit** so users can quickly create multiple tasks in sequence.

## Technical Approach

### Files to Modify

- **`pages/ProjectDetail.tsx`** — Replace the input at lines 1176-1196 with the new inline form. Two options:
  - **Option A (Recommended):** Extract a `<TaskCreateForm>` component to `components/tasks/TaskCreateForm.tsx` to keep ProjectDetail clean
  - **Option B:** Inline the form directly in ProjectDetail (simpler but adds to an already large file)

- **`services/taskApi.ts`** — No changes needed. The existing `createTask()` already accepts `description`, `assignee_id`, and `deadline`.

- **`netlify/functions/tasks.ts`** — No changes needed. The POST handler and Zod schema already validate all four fields.

- **`netlify/functions/_shared/schemas.ts`** — No changes needed. `createTaskSchema` already accepts `description`, `assignedTo`, and `dueDate`.

### Component: `TaskCreateForm`

```
components/tasks/TaskCreateForm.tsx
```

**Props:**
- `projectId: string` — the project to create the task in
- `teamMembers: User[]` — list from `project.team` for the assignee dropdown
- `onTaskCreated: (task: Task) => void` — callback after successful creation
- `userId: string` — current user ID for `created_by`

**State:**
- `isExpanded: boolean` — collapsed/expanded toggle
- `title: string`
- `description: string`
- `assigneeId: string | null`
- `dueDate: string` — ISO date string from native date input
- `isSubmitting: boolean` — loading state during API call

**Behavior:**
1. Collapsed: renders a button "+ Add Task"
2. Expanded: renders the form card
3. On submit: calls `createTask()` from `services/taskApi.ts`, calls `onTaskCreated` with the result, resets fields (keeps form expanded)
4. On cancel: resets fields and collapses
5. Title field is auto-focused when form expands

### Integration in ProjectDetail

Replace lines 1176-1196 with:

```
<TaskCreateForm
  projectId={project.id}
  teamMembers={project.team}
  onTaskCreated={(task) => {
    setTasks(prev => [...prev, task]);
    toast({ title: 'Task created' });
  }}
  userId={user.id}
/>
```

Remove the `newTaskInput` state variable and `handleAddTask` function from ProjectDetail since the form component handles its own state.

## Acceptance Criteria

- [x] Clicking "+ Add Task" expands the inline form with Title, Description, Assignee, and Due Date fields
- [x] Title is required; form shows validation error if submitted empty
- [x] Assignee dropdown is populated from `project.team` (real users, not hardcoded constants)
- [x] Due Date uses a native `<input type="date">` picker
- [x] Submitting creates the task via the existing API and it appears in the task list immediately
- [x] Form resets after successful submission but stays expanded
- [x] Cancel button or Escape key collapses the form and clears fields
- [x] Only Motionify team members see the form (not clients) — preserve existing `!isClient(user)` gate
- [x] Keyboard: Enter on the Title field submits; Escape collapses
- [x] Loading state shown on "Create Task" button during submission
- [x] Error toast shown if API call fails

## Edge Cases

- **Empty project team:** Assignee dropdown shows "No team members" or is disabled
- **Long title/description:** Handled by existing Zod schema validation (nameSchema / 5000 char limit)
- **Past due dates:** Allow selection — some tasks may be entered retroactively
- **Concurrent creation:** Each submit is independent; optimistic UI append is fine
- **Form state on tab switch:** If user switches away from Tasks tab and back, form should reset to collapsed

## Out of Scope

- Priority field (Zod schema accepts it but DB has no column — separate migration needed)
- Status field at creation (defaults to 'pending', can be changed via edit)
- Client visibility toggle at creation (defaults to false, can be changed via edit)
- Fixing `TaskEditModal` to use `project.team` instead of `TEAM_MEMBERS` (related but separate task)
- Removing `utils/taskParser.ts` — keep it for now, remove later if unused

## References

- Current task input: `pages/ProjectDetail.tsx:1176-1196`
- handleAddTask function: `pages/ProjectDetail.tsx:392-425`
- Task parser: `utils/taskParser.ts`
- Task API service: `services/taskApi.ts:41-72`
- Backend handler: `netlify/functions/tasks.ts:441-541`
- Zod schema: `netlify/functions/_shared/schemas.ts:167-175`
- TaskEditModal: `components/tasks/TaskEditModal.tsx`
- Hardcoded team members: `constants.ts:40-46`
