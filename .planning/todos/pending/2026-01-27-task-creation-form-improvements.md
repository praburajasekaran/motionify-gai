---
created: 2026-01-27T17:35
title: Add proper task creation form with assignee and date fields
area: ui
files:
  - pages/ProjectDetail.tsx:306-321
  - services/taskApi.ts:42-65
---

## Problem

Current task creation uses a simple text input with natural language parsing (e.g., "Review design @john tomorrow"). This approach has issues:

1. Users must know the @mention syntax for assignees
2. Date parsing is implicit and may be unreliable
3. No visual feedback for selected assignee or date
4. Discovery of team members requires memorizing names
5. API validation is failing due to field format mismatches (project_id → projectId, assignee_id → assignedTo)

Current implementation at `pages/ProjectDetail.tsx:306-321` uses `parseTaskInput()` to extract title, assignee, and deadline from natural language, but this is error-prone.

## Solution

Replace inline text input with a proper form or modal that includes:

1. **Title field** - Text input for task name
2. **Description field** - Optional textarea
3. **Assignee dropdown** - Select from project team members (shows names, submits UUIDs)
4. **Due date picker** - Calendar/date input that outputs ISO format
5. **Visibility toggle** - Checkbox for "Visible to client"

This would provide better UX and ensure proper data formats are sent to the API.

Consider using the existing `TaskEditModal` component pattern or creating a `TaskCreateModal`.
