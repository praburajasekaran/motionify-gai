---
module: Portal
date: 2026-02-21
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Horizontal divider below sidebar logo not aligned with top header divider"
  - "Sidebar border-b and main header border-b appear at different vertical positions"
root_cause: config_error
resolution_type: code_fix
severity: low
tags: [layout, height, sidebar, header, border, alignment, portal]
---

# Troubleshooting: Sidebar and Header Dividers Misaligned Due to Height Mismatch

## Problem

The horizontal divider at the bottom of the sidebar logo section and the bottom border of the main top header appeared at different vertical positions, creating a visible misalignment at the junction between the sidebar and main content area.

## Environment

- Module: Portal
- Affected Component: `components/Layout.tsx` (Vite React portal app)
- Date: 2026-02-21

## Symptoms

- The sidebar's bottom border (separating logo from nav) is at a different height than the header's bottom border (separating breadcrumb from page content)
- Visual gap or misalignment where the sidebar meets the main content area at the top

## What Didn't Work

**Direct solution:** Root cause identified on first inspection — height values were simply different.

## Solution

Match the header height to the sidebar logo container height in `components/Layout.tsx`:

```tsx
// Before (misaligned — different heights):
<div className="h-14 flex items-center px-4 shrink-0 border-b border-border"> {/* sidebar: 56px */}
<header className="h-12 border-b border-border z-30 shrink-0 sticky top-0 bg-background"> {/* header: 48px */}

// After (aligned — matching heights):
<div className="h-14 flex items-center px-4 shrink-0 border-b border-border"> {/* sidebar: 56px */}
<header className="h-14 border-b border-border z-30 shrink-0 sticky top-0 bg-background"> {/* header: 56px */}
```

## Why This Works

Both the sidebar logo container and the main header are fixed-height elements with `border-b`. When they have different heights, the borders land at different vertical positions. Setting both to `h-14` (56px) ensures their bottom borders form a single continuous horizontal line across the full width of the page.

## Prevention

- When adding a new fixed-height sidebar section with `border-b`, check that the corresponding main header height matches.
- Search for `h-` classes on `<aside>` and `<header>` in `Layout.tsx` to verify they match when both carry `border-b`.

## Related Issues

No related issues documented yet.
