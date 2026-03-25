---
title: "Dropdown menu clipped by overflow-hidden on project list cards"
date: "2026-02-26"
category: "ui-bugs"
tags: [z-index, overflow-hidden, dropdown-menu, css, tailwind]
module: "ProjectList"
symptoms:
  - "Dot menu dropdown not visible when clicking the ... button on project cards"
  - "Dropdown popup clipped/hidden behind adjacent list rows"
root_cause: "overflow-hidden on parent Link elements clips absolutely-positioned dropdown content"
severity: "minor"
time_to_resolve: "5 minutes"
files_affected:
  - "pages/ProjectList.tsx"
  - "components/ui/design-system.tsx"
related_docs:
  - "docs/solutions/ui-bugs/user-icon-direct-logout-no-dropdown-authentication-20260221.md"
---

## Problem

The "..." dot menu (DropdownMenu) on project cards in both the list and grid views was not rendering visibly. Clicking the button appeared to do nothing because the dropdown popup was clipped by its parent container.

## Investigation

The custom `DropdownMenu` component in `components/ui/design-system.tsx` uses `position: relative` on a wrapper div and `position: absolute` on the popup content. Unlike the Radix UI `DropdownMenu` (which uses a portal), this simplified version renders the popup **inside the DOM tree** of the card.

Both the list view `<Link>` and grid card `<Link>` in `pages/ProjectList.tsx` had `overflow-hidden` in their Tailwind classes, which created a clipping boundary that cut off the absolutely-positioned dropdown.

## Root Cause

`overflow-hidden` on the parent `<Link>` elements creates a CSS overflow clipping context. Since the custom `DropdownMenu` renders its popup as an absolutely-positioned child (not via a portal), the popup cannot escape the clipping boundary.

## Solution

Removed `overflow-hidden` from both Link wrappers:

**List view row (line ~310):**
```diff
- className="group flex bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors overflow-hidden"
+ className="group flex bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors"
```

**Grid card (line ~393):**
```diff
- className="group block bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors overflow-hidden"
+ className="group block bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors"
```

## Key Insight

When using a non-portal dropdown (one that renders inline in the DOM), parent containers must not use `overflow-hidden`. Either:
1. Remove `overflow-hidden` from ancestors (as done here), or
2. Switch to a portal-based dropdown (e.g., Radix `DropdownMenu` with `<Portal>`)

## Prevention

- Before adding `overflow-hidden` to a container, check whether any child uses absolute/fixed positioning for popups or tooltips.
- Consider migrating the custom `DropdownMenu` in `design-system.tsx` to use a portal for robustness against future overflow constraints.
