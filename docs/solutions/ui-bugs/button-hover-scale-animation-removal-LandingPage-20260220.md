---
module: Landing Page
date: 2026-02-20
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "CTA button scales up on hover (hover:scale-105) causing jarring animation"
  - "After removing scale, button had no visible hover feedback at all"
root_cause: config_error
resolution_type: code_fix
severity: low
tags: [hover, animation, tailwind, button, cta, scale, gradient]
---

# Troubleshooting: CTA Button Scale Animation — Remove and Replace with Subtle Hover

## Problem

A primary CTA button used `hover:scale-105` for hover feedback, causing a distracting scale-up animation. After removing the scale, no visible hover effect remained, requiring a replacement that felt natural without motion.

## Environment

- Module: Landing Page
- Affected Component: `landing-page-new/src/components/ReadyToTellYourStory.tsx`
- Date: 2026-02-20

## Symptoms

- Button grows on hover due to `hover:scale-105` + `transform` Tailwind classes
- After removing scale classes, `hover:shadow-orange-500/50` was the only hover state — visually imperceptible on the orange button

## What Didn't Work

**Direct solution:** Two-step fix identified immediately — first remove scale, then add a better replacement.

## Solution

**Step 1 — Remove scale animation:**

```tsx
// Before (with jarring scale):
className="... transform transition-all duration-300 hover:scale-105 ..."

// After (scale removed):
className="... transition-all duration-200 ..."
```

Remove `transform` and `hover:scale-105`. Also tighten `duration-300` → `duration-200` for snappier feel.

**Step 2 — Add gradient-darken hover effect:**

```tsx
// Final className:
className="group inline-flex items-center gap-3 px-8 py-4 rounded-lg
  bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg
  shadow-2xl shadow-orange-500/30
  hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50
  transition-all duration-200
  ring-2 ring-orange-400/30"
```

The key addition: `hover:from-orange-600 hover:to-orange-700` — shifts the gradient one stop darker on hover, giving a natural "press" feedback without any motion.

## Why This Works

1. **Root cause:** `hover:scale-105` + `transform` causes the browser to scale the element's bounding box, which is visually loud for a CTA button and can disrupt surrounding layout flow.
2. **Why gradient-darken works:** Tailwind generates separate CSS gradient stop utilities (`--tw-gradient-from`, `--tw-gradient-to`). The `transition-all` smoothly interpolates background-color changes, so overriding the gradient stops on hover creates a seamless darkening effect — the standard "button press" affordance without spatial movement.
3. **Shadow enhancement** (`hover:shadow-orange-500/50`) subtly lifts the button on hover as a secondary cue, but the gradient shift is the primary feedback.

## Prevention

- Prefer `hover:brightness-110` or gradient-stop overrides (`hover:from-X hover:to-Y`) over `hover:scale-*` for CTA buttons — scale animations feel cheap and disrupt layout.
- When removing a hover animation, always check what remains. `hover:shadow-*` alone is often invisible on saturated/dark backgrounds.
- For orange/warm gradient buttons, darken by one Tailwind shade (`500→600`, `600→700`) on hover — this matches the visual weight users expect.
- `transform` is required for `scale-*` to work in older Tailwind v3 configs — removing both together avoids stale class debt.

## Related Issues

- See also: [tailwind-v4-cursor-pointer-buttons-20260220.md](./tailwind-v4-cursor-pointer-buttons-20260220.md) — Tailwind v4 button interaction gotchas
