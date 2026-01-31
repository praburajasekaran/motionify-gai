---
title: "feat: Navigate to project when clicking Project Started card"
type: feat
date: 2026-01-30
---

# Navigate to project when clicking Project Started card

## Overview

When a client clicks an inquiry card with "Project Started" status on the dashboard, it should navigate directly to the project detail page instead of the inquiry tracking page. This mirrors the existing pattern from commit `3b12e1c` that links "Proposal Ready" cards to the proposal page.

## Problem Statement

Currently, all inquiry cards (except "Proposal Ready") navigate to `/inquiry-status/${inquiryNumber}`. For converted inquiries, this is a dead-end -- the client sees an inquiry tracking page when they actually want to view their live project.

## Proposed Solution

Add a conditional check in the dashboard card rendering: when `status === 'converted'` and `convertedToProjectId` exists, use a React Router `<Link>` to `/projects/${convertedToProjectId}/1` (overview tab). Fall back to the inquiry tracking page if `convertedToProjectId` is missing.

### Key difference from Proposal Ready pattern

| Aspect | Proposal Ready | Project Started |
|--------|---------------|-----------------|
| Status | `proposal_sent` | `converted` |
| Field | `proposalId` | `convertedToProjectId` |
| Route | `/proposal/${proposalId}` | `/projects/${projectId}/1` |
| Link type | `<a href>` (Next.js app) | `<Link to>` (React Router) |

Proposal uses `<a href>` because the proposal page is in the Next.js app. Project detail is within the React Router SPA, so we use `<Link>`.

## Acceptance Criteria

- [x] Clicking a "Project Started" card navigates to `/projects/${convertedToProjectId}/1`
- [x] If `convertedToProjectId` is null/undefined, falls back to `/inquiry-status/${inquiryNumber}`
- [x] Navigation uses React Router `<Link>` (not `<a href>`)
- [x] Existing "Proposal Ready" card navigation is unaffected
- [x] Other status cards still navigate to inquiry tracking page

## MVP

### pages/Dashboard.tsx

Around lines 279-327 in the card rendering section, add a check for converted status:

```tsx
// Existing: proposal ready check
const isProposalReady = inquiry.status === 'proposal_sent' && inquiry.proposalId;

// NEW: project started check
const isProjectStarted = inquiry.status === 'converted' && inquiry.convertedToProjectId;

// ... cardContent JSX stays the same ...

// Existing proposal link
if (isProposalReady) {
  return (
    <a key={inquiry.id} href={`/proposal/${inquiry.proposalId}`} className="...">
      {cardContent}
    </a>
  );
}

// NEW: project link using React Router
if (isProjectStarted) {
  return (
    <Link
      key={inquiry.id}
      to={`/projects/${inquiry.convertedToProjectId}/1`}
      className="block bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-all"
    >
      {cardContent}
    </Link>
  );
}

// Default: inquiry tracking
return (
  <Link key={inquiry.id} to={`/inquiry-status/${inquiry.inquiryNumber}`} className="...">
    {cardContent}
  </Link>
);
```

## Files to modify

1. **`pages/Dashboard.tsx`** (~279-327) -- Add conditional navigation for `converted` status

## Edge cases

- **Missing `convertedToProjectId`**: Falls back to inquiry tracking page (defensive)
- **Deleted project**: Let the project detail page handle 404 (consistent with existing patterns)
- **Next.js portal**: Out of scope -- clients use the React SPA dashboard; Next.js portal inquiries page is separate and can be updated independently if needed

## References

- Recent precedent: commit `3b12e1c` (link Proposal Ready card directly to proposal page)
- Route definition: `App.tsx:69-74` (`/projects/:id/:tab?`)
- Inquiry interface: `lib/inquiries.ts:18-36` (`convertedToProjectId` field)
- Institutional learning: dual-portal architecture means changes to `pages/` don't automatically affect `landing-page-new/`
