---
created: 2026-01-26T10:30
title: Deliverables list view and add button placement
area: ui
files:
  - components/deliverables/DeliverablesList.tsx
  - components/deliverables/DeliverablesTab.tsx
  - components/deliverables/DeliverableCard.tsx
---

## Problem

The deliverables page currently displays deliverables as cards (grid layout) instead of a list view. Users prefer a list layout for better scanning and comparison of deliverables.

Additionally, the "Add Deliverable" button is positioned in the top right corner. User wants the option to have it at the bottom of the list or consider alternative placement for better UX flow (adding after reviewing existing items).

## Solution

1. **List View**: Convert `DeliverablesList` from card grid to list layout
   - Create a `DeliverableListItem` component (compact row version of DeliverableCard)
   - Show key info inline: title, status badge, due date, progress
   - Keep card view as option with toggle if needed

2. **Add Button Placement**: Move or duplicate "Add Deliverable" button
   - Option A: Move to bottom of list
   - Option B: Add floating action button
   - Option C: Keep top button but also add inline "Add new" at bottom of list
   - TBD: Get user preference on exact placement
