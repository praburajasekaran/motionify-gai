---
module: Portal
date: 2026-02-21
problem_type: best_practice
component: frontend_stimulus
symptoms:
  - "Theme toggle shows tiny 8px Monitor icon overlaid on Sun icon when system mode active"
  - "System mode visually indistinguishable from light mode at small icon size"
root_cause: logic_error
resolution_type: code_fix
severity: low
tags: [theme, dark-mode, ux, icons, lucide, toggle-pattern, three-state]
---

# Best Practice: Three-State Theme Toggle Icon Pattern

## Problem

A theme toggle cycling through light → dark → system modes used a Sun/Moon icon as the primary display, with a tiny overlaid Monitor icon (8px, `h-2 w-2`) in the corner to indicate "system" mode. The overlay was too small to read at a glance, and was inconsistent with how established design systems handle this pattern.

## Environment

- Module: Portal
- Affected Component: `components/Layout.tsx` — theme toggle button in top header
- Date: 2026-02-21

## Symptoms

- In system mode, a small Monitor icon (`h-2 w-2`) appears overlaid in bottom-right of the Sun/Moon button
- Icon is barely visible — 8px in a 32px button
- Visual state ambiguity: system mode looks nearly identical to light mode

## What Didn't Work

**Direct solution:** Pattern improved on first attempt. The overlay approach was functional but below best-practice standard.

## Solution

Show the primary icon for each state directly — no overlay needed:

```tsx
// Before (overlay pattern — hard to read):
{resolvedTheme === 'dark' ? (
  <Moon className="h-4 w-4" />
) : (
  <Sun className="h-4 w-4" />
)}
{theme === 'system' && (
  <Monitor className="h-2 w-2 absolute bottom-1 right-1" />
)}

// After (clean three-state pattern — each state has one clear icon):
{theme === 'dark' ? (
  <Moon className="h-4 w-4" />
) : theme === 'light' ? (
  <Sun className="h-4 w-4" />
) : (
  <Monitor className="h-4 w-4" />
)}
```

Key change: switch on `theme` (user's chosen mode) not `resolvedTheme` (the computed result), so the icon represents intent, not output.

## Why This Works

Each of the three states (light, dark, system) maps to a distinct, well-understood icon from the Lucide React set: Sun, Moon, and Monitor. Showing the active icon at full size (`h-4 w-4`) in a consistent button makes the current state instantly scannable. This matches the pattern used by Vercel, Linear, and other apps with multi-state theme toggles.

Switching from `resolvedTheme` to `theme` is important: `resolvedTheme` is `'light'` or `'dark'` (never `'system'`), so you'd never be able to show the Monitor icon using `resolvedTheme`.

## Prevention

- For any N-state toggle: give each state its own primary icon — don't use overlays or badges to communicate secondary states.
- Always branch on `theme` (user intent) not `resolvedTheme` (computed output) when rendering which mode is active.
- Lucide React has `Sun`, `Moon`, and `Monitor` available for exactly this use case.

## Related Issues

No related issues documented yet.
