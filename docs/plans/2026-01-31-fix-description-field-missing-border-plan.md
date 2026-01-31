---
title: "fix: Description field border missing in task create form"
type: fix
date: 2026-01-31
---

# fix: Description field border missing in task create form

## Problem Statement

On the task creation form, the Description textarea field has no visible border/outline, while the Title, Assignee, and Due Date fields all show proper borders. The red arrow in the screenshot points to the Description field's missing outline.

## Root Cause

The Description field at `components/tasks/TaskCreateForm.tsx:111-119` uses a raw `<textarea>` HTML element with inline Tailwind classes including `border border-zinc-200`. However, the design system already exports a `Textarea` component (`components/ui/design-system.tsx:204-218`) that uses `border border-input` — which maps to the CSS variable `--input: oklch(0.9809 0.0025 228.7836)` (a visible light gray border consistent with other form fields).

The likely issue is a CSS specificity conflict or that `border-zinc-200` is being overridden by another style. The Title field works correctly because it uses the design system `Input` component which has consistent styling with `shadow-sm` and `hover:border-zinc-300` — visual cues that make the border more apparent.

Comparing the two approaches:
- **Title field (works):** Uses `<Input>` from design system — gets `border border-input bg-white/50 shadow-sm hover:border-zinc-300`
- **Description field (broken):** Uses raw `<textarea>` — has `border border-zinc-200` but no `shadow-sm` and different `bg-white` instead of `bg-white/50`

The missing `shadow-sm` and the flat `bg-white` make the border nearly invisible against the white card background.

## Proposed Solution

Replace the raw `<textarea>` with the design system `Textarea` component, matching the same pattern used by the Title field's `Input` component. This ensures visual consistency and leverages the design system's tested styling.

## Acceptance Criteria

- [ ] Description field shows a visible border matching Title, Assignee, and Due Date fields
- [ ] Description field uses the design system `Textarea` component instead of raw `<textarea>`
- [ ] Focus state shows the primary ring (consistent with other fields)
- [ ] Hover state shows darker border (consistent with other fields)
- [ ] Existing functionality preserved: placeholder, maxLength, rows, onKeyDown, onChange

## Implementation

### `components/tasks/TaskCreateForm.tsx`

1. The `Textarea` component is already exported from `@/components/ui/design-system` but not imported in this file. Add it to the existing import:

```tsx
// Line 4: Change from
import { Button, Input } from '@/components/ui/design-system';
// To
import { Button, Input, Textarea } from '@/components/ui/design-system';
```

2. Replace the raw `<textarea>` (lines 111-119) with the `Textarea` component:

```tsx
// From
<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Optional description..."
  rows={2}
  maxLength={5000}
  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all resize-none"
/>

// To
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

The `Textarea` design system component already provides: border, background, padding, focus ring, hover state, text sizing, and transitions. Only `resize-none` needs to be passed as an override.

## References

- `components/tasks/TaskCreateForm.tsx:111-119` — the broken textarea
- `components/ui/design-system.tsx:204-218` — the Textarea component to use
- `components/ui/design-system.tsx:186-201` — the Input component (reference for consistent styling)
- `index.css:24` — `--input` CSS variable definition
