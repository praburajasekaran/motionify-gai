---
title: Client Inquiry Dashboard Shows Admin Status Labels Instead of Client-Friendly Labels
date: 2026-01-30
category: ui-bugs
tags: [status-labels, client-portal, inquiry-dashboard, dual-portal]
module: inquiry-system
symptoms: Inquiry card badge shows "Proposal Sent" instead of "Proposal Received" for client users
severity: low
slug: client-status-labels-show-admin-terminology
---

# Client Inquiry Dashboard Shows Admin Status Labels

## Problem

The client-facing inquiry dashboard (`pages/admin/InquiryDashboard.tsx`) showed "Proposal Sent" on individual inquiry card badges. From the client's perspective, the correct label is "Proposal Received" — they received the proposal, they didn't send it.

Confusingly, the **stat cards** at the top of the same page correctly showed "Proposal Received" (they had separate hardcoded labels), but the card badges and filter dropdown used admin terminology.

## Investigation

The fix had **already been applied** to the new Next.js portal (`landing-page-new/src/app/portal/inquiries/page.tsx`) which has a `clientFriendlyStatusLabels` map with `proposal_sent: 'Proposal Received'` and conditional rendering via `useClientLabels={!isAdmin}`.

However, clients were still seeing the old React SPA page (`pages/admin/InquiryDashboard.tsx`), which had a single `STATUS_LABELS` map with no client/admin distinction.

## Root Cause

**The client-friendly label fix was applied to the wrong page.** The new Next.js portal had the fix, but clients were actually using the old React SPA `InquiryDashboard` page. This is a recurring pattern in this codebase — see [dual-portal awareness](#related-documentation).

The old page had:
- `STATUS_LABELS` — single map used for all users, always showing admin terms
- Stat cards — hardcoded with separate client/admin labels (correct)
- Card badges — used `STATUS_LABELS` directly (incorrect for clients)
- Filter dropdown — hardcoded admin options (incorrect for clients)

## Solution

### 1. `pages/admin/InquiryDashboard.tsx`

Added a `CLIENT_STATUS_LABELS` map alongside the existing `STATUS_LABELS`:

```typescript
const CLIENT_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'Submitted',
  reviewing: 'Under Review',
  proposal_sent: 'Proposal Received',
  negotiating: 'In Discussion',
  accepted: 'Accepted',
  project_setup: 'Project Starting',
  payment_pending: 'Payment Due',
  paid: 'Paid',
  converted: 'Project Started',
  rejected: 'Declined',
  archived: 'Archived',
};
```

Updated card badge rendering to use client labels conditionally:

```tsx
{isClient(user) ? CLIENT_STATUS_LABELS[inquiry.status] : STATUS_LABELS[inquiry.status]}
```

Updated filter dropdown to show client-friendly options when `isClient(user)`.

### 2. `pages/InquiryTracking.tsx`

Changed `proposal_sent: 'Proposal Sent'` to `proposal_sent: 'Proposal Received'`. This page is client-only so no conditional needed.

### 3. `landing-page-new/src/components/proposal/StatusTimeline.tsx`

Changed `PROPOSAL_SENT` activity label from `'Proposal Sent'` to `'Proposal Received'`. This timeline is only visible to clients viewing a proposal.

## Prevention

### Pattern: Dual-Portal Label Consistency

This codebase has two frontends that clients can reach:
1. **Old React SPA** — `pages/` directory (React Router)
2. **New Next.js portal** — `landing-page-new/` directory

When fixing client-facing labels, **check both portals**. Search broadly:

```bash
# Find all status label maps across both portals
grep -r "proposal_sent.*Proposal" pages/ landing-page-new/src/
```

### Pattern: Client vs Admin Terminology

Any page accessible to both clients and admins needs conditional labels. The `isClient(user)` helper from `lib/permissions` determines the viewer role. Always use it when rendering status text.

**Admin terms -> Client terms:**
| Admin Label | Client Label |
|---|---|
| New | Submitted |
| Reviewing | Under Review |
| Proposal Sent | Proposal Received |
| Negotiating | In Discussion |
| Rejected | Declined |
| Converted | Project Started |

## Related Documentation

- [Client Deliverables Hidden by Status Filter](../logic-errors/client-deliverables-hidden-by-status-filter.md) — Same pattern: client-facing labels needed a `CLIENT_STATUS_CONFIG` map
- [Permission Matrix](/docs/PERMISSION_MATRIX.md) — Role-based permissions and client sub-roles
- [Portal Test Cases](/docs/MOTIONIFY-PORTAL-TEST-CASES.md) — Test cases covering client vs admin views
