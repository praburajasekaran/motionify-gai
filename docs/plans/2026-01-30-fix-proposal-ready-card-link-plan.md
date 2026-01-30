---
title: "fix: Proposal Ready card should link directly to proposal"
type: fix
date: 2026-01-30
---

# fix: Proposal Ready card should link directly to proposal

## Overview

When an inquiry has status `proposal_sent` (displayed as "Proposal Ready"), the dashboard card currently says "Check your email for details" and links to the inquiry tracking page (`/inquiry-status/:inquiryNumber`). Instead, it should link directly to the proposal page (`/proposal/:proposalId`) and update the description text accordingly.

## Problem Statement

The client dashboard inquiry card always links to `/inquiry-status/${inquiry.inquiryNumber}` regardless of status. When a proposal is ready, the client should be taken directly to the proposal — not told to check their email. The `proposalId` field is already available on the `Inquiry` type and populated when a proposal is created.

## Proposed Solution

Two changes in `pages/Dashboard.tsx`:

1. **Update the description text** for `proposal_sent` status from `"We've prepared a proposal for you. Check your email for details."` to `"We've prepared a proposal for you. Click to view it."`

2. **Conditionally change the card link** — when status is `proposal_sent` and `inquiry.proposalId` exists, link to `/proposal/${inquiry.proposalId}` instead of `/inquiry-status/${inquiry.inquiryNumber}`.

## Acceptance Criteria

- [x] Card with "Proposal Ready" status links to `/proposal/:proposalId` when `proposalId` is present
- [x] Card description reads "We've prepared a proposal for you. Click to view it."
- [x] Falls back to `/inquiry-status/:inquiryNumber` if `proposalId` is missing (defensive)
- [x] All other statuses continue linking to inquiry tracking page as before

## Files to Change

### `pages/Dashboard.tsx`

**Change 1** — Update description text (line 182):

```tsx
// Before
proposal_sent: { label: 'Proposal Ready', color: 'purple', icon: FileText, description: 'We\'ve prepared a proposal for you. Check your email for details.' },

// After
proposal_sent: { label: 'Proposal Ready', color: 'purple', icon: FileText, description: 'We\'ve prepared a proposal for you. Click to view it.' },
```

**Change 2** — Compute link destination conditionally (around line 283-285):

```tsx
// Before
<Link
  key={inquiry.id}
  to={`/inquiry-status/${inquiry.inquiryNumber}`}
  ...
>

// After
const linkTo = inquiry.status === 'proposal_sent' && inquiry.proposalId
  ? `/proposal/${inquiry.proposalId}`
  : `/inquiry-status/${inquiry.inquiryNumber}`;

<Link
  key={inquiry.id}
  to={linkTo}
  ...
>
```

## Context

- The proposal page already exists at `/proposal/[proposalId]` in the Next.js app (`landing-page-new/src/app/proposal/[proposalId]/page.tsx`)
- However, the Dashboard is a React Router app (root `pages/`), not Next.js. Need to verify the proposal page route exists in the React Router app as well, or if it redirects to the Next.js app.
- The `proposalId` field is populated on the inquiry when the admin creates a proposal via `updateInquiryStatus(inquiry.id, 'proposal_sent', { proposalId: proposal.id })`
- The recent commit `a0402ae` fixed Unicode-safe Base64 encoding for proposal links

## References

- `pages/Dashboard.tsx:179-191` — CLIENT_STATUS_CONFIG
- `pages/Dashboard.tsx:279-311` — Inquiry card rendering
- `lib/inquiries.ts:31` — `proposalId` field on Inquiry interface
- `landing-page-new/src/app/proposal/[proposalId]/page.tsx` — Client proposal page
