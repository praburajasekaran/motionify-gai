---
title: "Centralize inquiry status labels to prevent inconsistent client terminology"
date: "2026-01-31"
category: ui-bugs
tags: [status-labels, centralization, client-portal, inquiry-dashboard, dual-portal, single-source-of-truth]
module: inquiry-system
severity: medium
symptoms:
  - "Client screens show admin terminology like 'Converted', 'Proposal Sent', 'Rejected'"
  - "Same status labeled differently across screens ('Project Started' vs 'Project Created' vs 'Active Project')"
  - "Previous one-screen-at-a-time fixes created new inline maps that diverged from each other"
root_cause: "Status labels duplicated as inline Record maps in 7+ files with no single source of truth"
supersedes: client-status-labels-show-admin-terminology
---

# Centralize Inquiry Status Labels Across All Screens

## Problem

Client-facing screens showed admin terminology instead of client-friendly labels. The `converted` status appeared as three different strings depending on the page:

| Screen | Label Shown |
|--------|-------------|
| InquiryDashboard | Project Started |
| InquiryTracking | Project Created |
| Landing Page Portal | Active Project |

Other inconsistencies: "Proposal Ready" vs "Proposal Received", "Rejected" shown to clients instead of "Declined".

## Investigation

A previous fix (2026-01-30) added `CLIENT_STATUS_LABELS` inline maps to `InquiryDashboard.tsx` and `InquiryDetail.tsx`. This created _more_ duplication — now 3 separate label maps existed across files, and other screens were missed entirely.

Searching the codebase revealed 7 files with inline status label maps or hardcoded status strings visible to clients:
- `pages/admin/InquiryDashboard.tsx` — two inline maps (STATUS_LABELS + CLIENT_STATUS_LABELS)
- `pages/admin/InquiryDetail.tsx` — one inline map (STATUS_LABELS)
- `pages/InquiryTracking.tsx` — one inline map (STATUS_LABELS) with 6 differences from canonical
- `pages/Dashboard.tsx` — inline config with "Proposal Ready"
- `pages/admin/ProposalDetail.tsx` — hardcoded "Rejected on {date}"
- `pages/ProjectDetail.tsx` — activity feed "rejected the proposal"
- `landing-page-new/.../inquiries/page.tsx` — "Active Project"

## Root Cause

No single source of truth for inquiry status labels. Each file maintained its own inline `Record<InquiryStatus, string>` map. Previous fixes added more inline maps instead of centralizing, compounding the problem.

## Solution

### 1. Centralized config (`lib/status-config.ts`)

Added `INQUIRY_STATUS_CONFIG` following the existing `STATUS_CONFIG` pattern for proposal statuses:

```typescript
import type { InquiryStatus } from './inquiries';

interface InquiryStatusConfig {
  adminLabel: string;
  clientLabel: string;
}

export const INQUIRY_STATUS_CONFIG: Record<InquiryStatus, InquiryStatusConfig> = {
  new:             { adminLabel: 'New',              clientLabel: 'Submitted' },
  reviewing:       { adminLabel: 'Reviewing',        clientLabel: 'Under Review' },
  proposal_sent:   { adminLabel: 'Proposal Sent',    clientLabel: 'Proposal Received' },
  negotiating:     { adminLabel: 'Negotiating',      clientLabel: 'In Discussion' },
  accepted:        { adminLabel: 'Accepted',         clientLabel: 'Accepted' },
  project_setup:   { adminLabel: 'Setting Up',       clientLabel: 'Project Starting' },
  payment_pending: { adminLabel: 'Payment Pending',  clientLabel: 'Payment Due' },
  paid:            { adminLabel: 'Paid',             clientLabel: 'Paid' },
  converted:       { adminLabel: 'Converted',        clientLabel: 'Project Started' },
  rejected:        { adminLabel: 'Rejected',         clientLabel: 'Declined' },
  archived:        { adminLabel: 'Archived',         clientLabel: 'Archived' },
};
```

### 2. Replaced inline maps in consumer files

```typescript
// BEFORE (each file had its own maps)
const STATUS_LABELS: Record<InquiryStatus, string> = { ... };
const CLIENT_STATUS_LABELS: Record<InquiryStatus, string> = { ... };
// Usage: isClient(user) ? CLIENT_STATUS_LABELS[s] : STATUS_LABELS[s]

// AFTER (import from centralized config)
import { INQUIRY_STATUS_CONFIG } from '../../lib/status-config';
// Usage: isClient(user) ? INQUIRY_STATUS_CONFIG[s].clientLabel : INQUIRY_STATUS_CONFIG[s].adminLabel
```

### 3. Fixed individual labels in other files

- **Dashboard.tsx**: `'Proposal Ready'` -> `'Proposal Received'`
- **ProposalDetail.tsx**: `{isClient ? 'Declined' : 'Rejected'} on {date}`
- **ProjectDetail.tsx**: Added `isClientUser` param to `formatActivityAction`, returns `'declined the proposal'` for clients
- **Landing page portal**: `'Active Project'` -> `'Project Started'`

### Files changed (8 total, net -28 lines)

1. `lib/status-config.ts` — Added `INQUIRY_STATUS_CONFIG`
2. `pages/admin/InquiryDashboard.tsx` — Removed 2 inline maps, uses centralized config
3. `pages/admin/InquiryDetail.tsx` — Removed 1 inline map, uses centralized config
4. `pages/InquiryTracking.tsx` — Removed 1 inline map, uses `.clientLabel` (always client-facing)
5. `pages/Dashboard.tsx` — One-word label fix
6. `pages/admin/ProposalDetail.tsx` — Role-conditional "Declined"/"Rejected"
7. `pages/ProjectDetail.tsx` — Role-aware activity feed text
8. `landing-page-new/src/app/portal/inquiries/page.tsx` — Label alignment

## Prevention

- **Single source of truth**: All status labels live in `lib/status-config.ts`. Never create inline label maps in components. When adding a new status to the `InquiryStatus` type, TypeScript will force you to add it to `INQUIRY_STATUS_CONFIG`.
- **Audit all surfaces when fixing labels**: Status text appears in dashboards, detail pages, filter dropdowns, badges, timelines, activity feeds, and the separate Next.js portal. Search broadly before declaring a fix complete.
- **Check both portals**: This codebase has two frontends — `pages/` (React SPA) and `landing-page-new/` (Next.js). When fixing client-facing text, check both.
- **Grep for stragglers**: `grep -r "oldLabel" --include="*.tsx" pages/ landing-page-new/src/ | grep -v status-config` should return zero matches after a label change.

## Checklist for Future Label Changes

- [ ] Update `INQUIRY_STATUS_CONFIG` in `lib/status-config.ts` (both `adminLabel` and `clientLabel`)
- [ ] Run `grep -r "oldValue" --include="*.tsx"` across both portals to find any remaining hardcoded instances
- [ ] Verify filter dropdowns, badges, timelines, and activity feeds all render the new label
- [ ] Test as both admin and client roles

## Related Documentation

- [Previous fix (superseded)](./client-status-labels-show-admin-terminology.md) — Added inline maps per-file; this solution centralizes them
- [Client Deliverables Hidden by Status Filter](../logic-errors/client-deliverables-hidden-by-status-filter.md) — Same pattern of client-facing config needing role awareness
