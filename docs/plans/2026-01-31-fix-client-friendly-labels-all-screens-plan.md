---
title: "fix: Apply client-friendly status labels across ALL screens"
type: fix
date: 2026-01-31
---

# Apply Client-Friendly Status Labels Across ALL Screens

## Overview

The previous two PRs fixed client-friendly labels on `InquiryDashboard.tsx` and `InquiryDetail.tsx` only. The same admin terminology still leaks to clients on many other screens, and the label maps are duplicated across files — which already caused real inconsistencies.

## Problem Statement

| Term | InquiryDashboard | Dashboard.tsx | InquiryTracking.tsx | Next.js Portal |
|------|-----------------|---------------|---------------------|----------------|
| `converted` | Project Started | Project Started | Project Created | Active Project |
| `proposal_sent` | Proposal Received | Proposal Ready | Proposal Sent | Proposal Received |

Additionally:
- `ProposalDetail.tsx` shows "Rejected" instead of "Declined" to clients
- `ProjectDetail.tsx` activity feed shows "rejected the proposal" to clients

**Why was it missed?** Previous PRs scoped to one page at a time without auditing all client-visible screens. The documented learning in `docs/solutions/ui-bugs/client-status-labels-show-admin-terminology.md` warns: *"Always check both portals when fixing client-facing labels"*.

## Proposed Solution

One commit. No phases. Extend the existing `lib/status-config.ts` with inquiry status config (matching the established `{ adminLabel, clientLabel }` pattern), then fix every client-visible screen.

---

## Canonical Label Mappings

### Inquiry Statuses (new — to be added to `lib/status-config.ts`)

| DB Value | Admin Label | Client Label |
|----------|-------------|-------------|
| `new` | New | Submitted |
| `reviewing` | Reviewing | Under Review |
| `proposal_sent` | Proposal Sent | Proposal Received |
| `negotiating` | Negotiating | In Discussion |
| `accepted` | Accepted | Accepted |
| `project_setup` | Setting Up | Project Starting |
| `payment_pending` | Payment Pending | Payment Due |
| `paid` | Paid | Paid |
| `converted` | Converted | Project Started |
| `rejected` | Rejected | Declined |
| `archived` | Archived | Archived |

### Proposal Statuses (already in `lib/status-config.ts` — no changes)

### Activity Actions

| Admin Text | Client Text |
|---|---|
| rejected the proposal | declined the proposal |

---

## Files to Change

### 1. `lib/status-config.ts` — Add inquiry status config

Extend the existing file (which already handles proposal statuses) with inquiry status config. Follow the established pattern:

```typescript
import type { InquiryStatus } from './inquiries';

// Lighter interface — inquiry badges get their colors from
// a separate STATUS_COLORS map already used in InquiryDashboard/Detail.
interface InquiryStatusConfig {
  adminLabel: string;
  clientLabel: string;
}

export const INQUIRY_STATUS_CONFIG: Record<InquiryStatus, InquiryStatusConfig> = {
  new:             { adminLabel: 'New',             clientLabel: 'Submitted' },
  reviewing:       { adminLabel: 'Reviewing',       clientLabel: 'Under Review' },
  proposal_sent:   { adminLabel: 'Proposal Sent',   clientLabel: 'Proposal Received' },
  negotiating:     { adminLabel: 'Negotiating',     clientLabel: 'In Discussion' },
  accepted:        { adminLabel: 'Accepted',        clientLabel: 'Accepted' },
  project_setup:   { adminLabel: 'Setting Up',      clientLabel: 'Project Starting' },
  payment_pending: { adminLabel: 'Payment Pending',  clientLabel: 'Payment Due' },
  paid:            { adminLabel: 'Paid',             clientLabel: 'Paid' },
  converted:       { adminLabel: 'Converted',        clientLabel: 'Project Started' },
  rejected:        { adminLabel: 'Rejected',         clientLabel: 'Declined' },
  archived:        { adminLabel: 'Archived',         clientLabel: 'Archived' },
};
```

No helper function — call sites access `config.clientLabel` or `config.adminLabel` directly, same as they already do with `STATUS_CONFIG` for proposals.

### 2. `pages/admin/InquiryDashboard.tsx` — Remove inline maps, import from status-config

- Delete inline `STATUS_LABELS` and `CLIENT_STATUS_LABELS` (~25 lines)
- Import `INQUIRY_STATUS_CONFIG` from `lib/status-config`
- Replace usages: `isClient(user) ? INQUIRY_STATUS_CONFIG[status].clientLabel : INQUIRY_STATUS_CONFIG[status].adminLabel`

### 3. `pages/admin/InquiryDetail.tsx` — Same as above

- Delete inline `STATUS_LABELS` and `CLIENT_STATUS_LABELS` (~25 lines)
- Import `INQUIRY_STATUS_CONFIG` from `lib/status-config`
- Replace usages same as InquiryDashboard

### 4. `pages/InquiryTracking.tsx` — Use canonical client labels

This is a public page (no auth) — always client-facing. Current labels have **6 differences** from canonical:

| Status | Current | Canonical |
|--------|---------|-----------|
| `new` | New | Submitted |
| `proposal_sent` | Proposal Sent | Proposal Received |
| `project_setup` | Setting Up Your Project | Project Starting |
| `payment_pending` | Payment Pending | Payment Due |
| `paid` | Payment Received | Paid |
| `converted` | Project Created | Project Started |

- Delete inline `STATUS_LABELS`
- Import `INQUIRY_STATUS_CONFIG` from `lib/status-config`
- Use `INQUIRY_STATUS_CONFIG[status].clientLabel` everywhere (no role check needed)

### 5. `pages/Dashboard.tsx` line 182 — Fix one string

Change `'Proposal Ready'` to `'Proposal Received'` in `CLIENT_STATUS_CONFIG`.

That's it. Don't wire up imports from the centralized file — `Dashboard.tsx` has a rich page-specific config object with icons, colors, and descriptions. The label is just one field.

### 6. `pages/admin/ProposalDetail.tsx` line 942 — Fix "Rejected" for clients

Current: `"Rejected on {date}"` shown to both roles.

Change to: `{isClient ? 'Declined' : 'Rejected'} on {date}`

### 7. `pages/ProjectDetail.tsx` ~line 37 — Fix activity feed for clients

`formatActivityAction` includes `PROPOSAL_REJECTED: 'rejected the proposal'` — visible to clients in the activity tab.

Accept a role-aware approach: when `isClient(user)`, show `'declined the proposal'` instead.

### 8. `landing-page-new/src/app/portal/inquiries/page.tsx` ~line 47 — Align "converted" label

Change `converted: 'Active Project'` to `converted: 'Project Started'` in `clientFriendlyStatusLabels`.

---

## Out of Scope

- **`DeliverableReview.tsx`** — The `toUpperCase()` cosmetic issue is a separate concern, not admin-vs-client terminology. Separate fix if desired.
- **Notification text** — Generated server-side, separate concern.
- **Email templates** — Already use client-friendly terms.
- **Project status labels** — "Active", "Completed", "On Hold" are standard terms clients understand.
- **Deliverable status labels** — "Approved", "Revision Requested" describe actions the client took. Appropriate as-is.
- **`STATUS_COLORS` duplication** — The color maps for inquiry statuses are duplicated across InquiryDashboard, InquiryDetail, and InquiryTracking. Worth centralizing as a follow-up, but separate from the label fix.

## Acceptance Criteria

- [ ] `lib/status-config.ts` exports `INQUIRY_STATUS_CONFIG` with `adminLabel`/`clientLabel` for all 11 inquiry statuses
- [ ] `InquiryDashboard.tsx` uses centralized config (no inline label maps)
- [ ] `InquiryDetail.tsx` uses centralized config (no inline label maps)
- [ ] `InquiryTracking.tsx` uses canonical client labels (all 6 differences fixed)
- [ ] `Dashboard.tsx` shows "Proposal Received" not "Proposal Ready"
- [ ] `ProposalDetail.tsx` shows "Declined" not "Rejected" for client users
- [ ] `ProjectDetail.tsx` activity feed shows "declined the proposal" for client users
- [ ] `landing-page-new` portal uses "Project Started" not "Active Project"
- [ ] Admin users see no changes to their experience
- [ ] All label mappings are consistent across every screen

## Edge Cases

- **`isClient(user)` when user is null:** Returns false — admin labels are the safe default
- **InquiryTracking.tsx has no user context:** Public page — always use `.clientLabel`
- **Dashboard.tsx only renders ClientDashboard for clients:** No admin path, inline string fix is sufficient
- **New statuses added in future:** Adding one entry to `INQUIRY_STATUS_CONFIG` covers all screens

## References

- Previous plan: `docs/plans/2026-01-30-feat-client-friendly-inquiry-status-labels-plan.md`
- Documented learning: `docs/solutions/ui-bugs/client-status-labels-show-admin-terminology.md`
- Existing proposal status config: `lib/status-config.ts`
- InquiryStatus type: `lib/inquiries.ts:5-16`
- Permission helpers: `lib/permissions.ts` (`isClient`, `isMotionifyAdmin`)
