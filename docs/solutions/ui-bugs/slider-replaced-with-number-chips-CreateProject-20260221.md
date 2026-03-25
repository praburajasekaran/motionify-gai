---
module: CreateProject
date: 2026-02-21
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Range slider difficult to drag to exact integer values in 0–10 range"
  - "Users overshoot target values when dragging; imprecise for discrete integer selection"
root_cause: wrong_api
resolution_type: code_fix
severity: low
tags: [slider, number-chips, ux, form-control, discrete-selection, react]
---

# Troubleshooting: Slider Imprecise for Small Discrete Integer Range

## Problem

The "Max Revisions Included" slider in the project creation wizard used a Radix UI range slider (`<Slider>`) for selecting an integer between 0 and 10. The drag interaction was imprecise — users had to carefully position the thumb to land on exact integer values, making the control feel cumbersome.

## Environment

- Module: CreateProject (project creation wizard, Details step)
- Affected Component: `pages/CreateProject.tsx` — `renderDetails()` function
- Date: 2026-02-21

## Symptoms

- Range slider thumb was difficult to land on exact integer values when dragging
- Users could easily overshoot (e.g., trying to select 3, landing on 4 or 2)
- The control span was wide relative to the number of valid steps, making precise clicks rare
- Value label (shown bold next to heading) would flicker between adjacent values during drag

## What Didn't Work

**Direct solution:** The problem was identified and fixed on the first attempt.

The slider's imprecision is inherent — Radix UI `<Slider>` is designed for continuous or wide-range values. Using it for 11 discrete steps in a full-width container means each step is ~10% of the track, which is hard to target by dragging on a small screen or with a mouse.

## Solution

Replace the `<Slider>` entirely with a row of 11 clickable number chip buttons (0–10). Each chip is a single click to the desired value — no dragging required.

**Code changes:**

```tsx
// Before (broken UX):
<Slider
    value={[formData.maxRevisions]}
    max={10}
    step={1}
    onValueChange={(v) => updateField('maxRevisions', v[0])}
/>

// After (fixed):
<div className="flex flex-wrap gap-2">
    {Array.from({ length: 11 }, (_, i) => i).map(n => (
        <button
            key={n}
            type="button"
            onClick={() => updateField('maxRevisions', n)}
            className={cn(
                "w-9 h-9 rounded-md text-sm font-medium border transition-colors",
                formData.maxRevisions === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
            )}
        >
            {n}
        </button>
    ))}
</div>
```

Also remove the `Slider` import from line 29 of `CreateProject.tsx` since it's no longer used:

```tsx
// Remove from design-system imports:
Slider,
```

## Why This Works

1. **Root cause:** A range slider assumes a continuous or large-step value space. For a range of 0–10 (11 values), each unit of the slider track represents only ~9% of the width. Dragging accurately to a specific step requires fine motor precision that most users don't apply to form fields.

2. **Why chips work:** Each chip is an independent click target. With `w-9 h-9` (36×36px), the tap/click target for each number is large and unambiguous — clicking 3 always selects 3. No drag involved.

3. **Visual feedback:** The `bg-primary` active state makes the selected value immediately visible. The value shown in the form header stays consistent.

4. **`cn()` toggle pattern:** Using `cn()` with a ternary on `formData.maxRevisions === n` cleanly handles the active/inactive class switching without extra state.

## Prevention

- **Rule of thumb:** Use a range slider only when the value space is large (20+ values) or the exact value doesn't need to be precise (e.g., a volume control). For small discrete integers (≤ 15 values), prefer number chips, a stepper (`–` / `+`), or a select dropdown.
- **Alternatives by range:**
  - 0–5: Stepper (`–` / `+`) or star rating
  - 0–15: Number chips (most explicit)
  - 0–50: Slider with `step={5}` and visible tick marks, or a select
  - 50+: Slider is appropriate
- When using Radix `<Slider>`, always test the drag UX at the actual rendered width. Wide containers make it feel fine in isolation but imprecise in practice.

## Related Issues

No related issues documented yet.
