---
title: "Task creation form description field missing border styling"
date: 2026-01-31
category: ui-bugs
tags:
  - form-styling
  - textarea
  - design-system-inconsistency
module: task-management
severity: medium
status: resolved
symptoms:
  - description-field-no-visible-border
  - inconsistent-form-field-styling
  - raw-html-element-bypasses-design-system
root_cause: "Raw <textarea> used instead of design system Textarea component, missing shadow-sm and bg-white/50"
files_changed:
  - components/tasks/TaskCreateForm.tsx
---

# Task creation form description field missing border styling

## Symptom

On the task creation form, the Description textarea field has no visible border/outline, while the Title, Assignee, and Due Date fields all display proper borders.

## Investigation

Compared the Description field's implementation against the working Title field:

- **Title field**: Uses `<Input>` from `@/components/ui/design-system` which provides `border border-input bg-white/50 shadow-sm hover:border-zinc-300`
- **Description field**: Used a raw `<textarea>` with `border border-zinc-200 bg-white` — no `shadow-sm`, no `bg-white/50`

The missing `shadow-sm` and flat `bg-white` (instead of `bg-white/50`) made the border nearly invisible against the white card background.

## Root Cause

The Description field used a raw `<textarea>` HTML element instead of the design system's `Textarea` component (`components/ui/design-system.tsx:204-218`). The design system component includes `shadow-sm`, `bg-white/50`, and `hover:border-zinc-300` which give form fields their visible border appearance.

## Solution

1. Import `Textarea` from the design system:

```tsx
// components/tasks/TaskCreateForm.tsx:4
import { Button, Input, Textarea } from '@/components/ui/design-system';
```

2. Replace the raw `<textarea>` with the design system component:

```tsx
// Before (raw element, border invisible)
<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Optional description..."
  rows={2}
  maxLength={5000}
  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all resize-none"
/>

// After (design system component, consistent styling)
<Textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Optional description..."
  rows={2}
  maxLength={5000}
  className="resize-none"
/>
```

## Prevention

- Always use design system components (`Input`, `Textarea`, `Select`) instead of raw HTML form elements
- When a form field looks visually different from siblings, check whether it uses the design system component or a raw element
- The design system components in `components/ui/design-system.tsx` provide consistent border, shadow, hover, and focus styling

## Related

- `components/ui/design-system.tsx:204-218` — Textarea component definition
- `components/ui/design-system.tsx:186-201` — Input component (reference for consistent styling)
- `docs/solutions/ui-bugs/task-assignee-lost-after-inline-edit-save.md` — another TaskCreateForm.tsx fix
