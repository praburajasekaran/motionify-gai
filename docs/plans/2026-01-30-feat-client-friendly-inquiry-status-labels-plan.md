---
title: "feat: Show client-friendly status labels on Inquiry Dashboard"
type: feat
date: 2026-01-30
---

# Show Client-Friendly Status Labels on Inquiry Dashboard

## Overview

Clients viewing the Inquiry Dashboard see admin-internal terminology like "Converted" on status badges and in the filter dropdown. These should show client-friendly labels like "Project Started" to match the language used elsewhere in the client experience.

## Problem Statement

The `pages/admin/InquiryDashboard.tsx` page is shared between admin and client users. While some elements already adapt based on `isClient(user)` (stat cards, subtitle, New Inquiry button), **two areas still show admin terminology to clients**:

1. **Status badge on inquiry cards** (line 339) — always uses `STATUS_LABELS`, showing "Converted", "Proposal Sent", etc.
2. **Filter dropdown** (lines 285-293) — hardcoded admin terms like "Converted", "Proposal Sent", "Negotiating"

Other client-facing pages already use client-friendly labels but are inconsistent with each other:

| Page | "converted" label |
|------|-------------------|
| `pages/Dashboard.tsx` | "Project Started" |
| `pages/InquiryTracking.tsx` | "Project Created" |
| `landing-page-new/.../inquiries/page.tsx` | "Active Project" |
| `pages/admin/InquiryDashboard.tsx` | "Converted" (bug) |

## Proposed Solution

Add a `CLIENT_STATUS_LABELS` map to `InquiryDashboard.tsx` and conditionally render it for client users. Also update the filter dropdown to show client-friendly options.

### Client-to-Admin Label Mapping

Per the documented convention in `docs/solutions/ui-bugs/client-status-labels-show-admin-terminology.md`:

| Admin Label | Client Label |
|---|---|
| New | Submitted |
| Reviewing | Under Review |
| Proposal Sent | Proposal Received |
| Negotiating | In Discussion |
| Accepted | Accepted |
| Setting Up | Project Starting |
| Payment Pending | Payment Due |
| Paid | Paid |
| Converted | Project Started |
| Rejected | Declined |
| Archived | Archived |

> **Note:** Using "Project Started" (from `Dashboard.tsx`) rather than "Active Project" (from Next.js portal) since the old React SPA `Dashboard.tsx` is the primary client dashboard and consistency within the same app matters most. A follow-up task could unify the Next.js portal label to match.

## Acceptance Criteria

- [x] Client users see "Project Started" instead of "Converted" on inquiry card badges
- [x] Client users see client-friendly labels for ALL statuses on card badges (Submitted, Under Review, Proposal Received, etc.)
- [x] Client users see client-friendly labels in the filter dropdown
- [x] Admin users continue to see admin labels (no change to admin experience)
- [x] Filter dropdown still functions correctly when client labels are shown

## MVP

### `pages/admin/InquiryDashboard.tsx`

**1. Add CLIENT_STATUS_LABELS map** (after the existing `STATUS_LABELS` on line 37):

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

**2. Update badge rendering** (line 338-340):

```tsx
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_COLORS[inquiry.status]}`}>
  {isClient(user) ? CLIENT_STATUS_LABELS[inquiry.status] : STATUS_LABELS[inquiry.status]}
</span>
```

**3. Update filter dropdown** (lines 285-293) to conditionally show client labels:

```tsx
<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value as InquiryStatus | 'all')}
  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent appearance-none cursor-pointer"
>
  <option value="all">All Status</option>
  {Object.entries(isClient(user) ? CLIENT_STATUS_LABELS : STATUS_LABELS)
    .filter(([key]) => !['archived', 'project_setup', 'payment_pending', 'paid'].includes(key))
    .map(([value, label]) => (
      <option key={value} value={value}>{label}</option>
    ))
  }
</select>
```

> **Note on filter options:** The current hardcoded filter shows: New, Reviewing, Proposal Sent, Negotiating, Accepted, Converted, Rejected (7 options). The dynamic approach above should match the same set of visible statuses. The `filter` call excludes statuses not shown in the current dropdown.

## Edge Cases

- **Status value unchanged:** The filter `value` stays as the internal status key (`converted`, `proposal_sent`, etc.) — only the display label changes. No backend changes needed.
- **`isClient(user)` when user is null:** The `isClient` helper already handles null safely (returns false), so admin labels are the safe default.

## References

- Documented solution: `docs/solutions/ui-bugs/client-status-labels-show-admin-terminology.md`
- Existing client labels in Dashboard: `pages/Dashboard.tsx:179-191`
- Existing client labels in InquiryTracking: `pages/InquiryTracking.tsx:25-32`
- Next.js portal client labels: `landing-page-new/src/app/portal/inquiries/page.tsx:37-53`
- Badge rendering: `pages/admin/InquiryDashboard.tsx:338-340`
- Filter dropdown: `pages/admin/InquiryDashboard.tsx:285-293`
