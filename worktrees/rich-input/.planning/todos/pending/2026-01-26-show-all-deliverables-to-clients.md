---
created: 2026-01-26T19:30
title: Show all deliverables to clients regardless of status
area: ui
files:
  - netlify/functions/deliverables.ts:206-210
---

## Problem

Currently, clients can only see deliverables with statuses: `beta_ready`, `awaiting_approval`, `approved`, `payment_pending`, `final_delivered`.

Deliverables in `pending` or `in_progress` status are hidden from clients.

**This is confusing because:**
- Clients agreed to these deliverables when they accepted the proposal
- Clients should be able to track progress on ALL their deliverables
- Hiding deliverables until files are uploaded makes it seem like work hasn't started

## Solution

1. Remove status filter for clients in `deliverables.ts` GET endpoint (line 206-210)
2. Show all deliverables to clients regardless of status
3. Add clear status indicators in the UI:
   - `pending` → "Not Started"
   - `in_progress` → "In Progress"
   - `beta_ready` → "Ready for Review"
   - etc.
4. Only hide/disable the file download button until files are actually uploaded
5. Consider showing progress percentage or estimated completion

**Files to modify:**
- `netlify/functions/deliverables.ts` — remove viewableStatuses filter for clients
- `landing-page-new/src/lib/portal/components/DeliverableCard.tsx` — add status indicators
- `components/deliverables/DeliverableCard.tsx` — ensure consistent status display
