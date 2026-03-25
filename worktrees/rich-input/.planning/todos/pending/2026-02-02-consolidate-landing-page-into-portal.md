---
created: 2026-02-02T19:45
title: Consolidate landing-page-new into portal (5173)
area: architecture
files:
  - landing-page-new/src/app/api/proposals/[id]/route.ts
  - landing-page-new/src/app/api/proposals/route.ts
  - landing-page-new/src/app/proposal/[proposalId]/page.tsx
  - landing-page-new/src/lib/proposals.ts
  - landing-page-new/src/app/api/inquiries/route.ts
  - landing-page-new/src/app/api/payments/
  - pages/admin/ProposalDetail.tsx
  - netlify/functions/proposal-detail.ts
  - lib/proposals.ts
---

## Problem

The app has two separate data stores that cause sync bugs:

1. **Admin SPA** (port 5173, Vite) writes to **PostgreSQL** via Netlify functions
2. **Client Next.js app** (landing-page-new, port 5174) reads/writes to **JSON file storage** via Next.js API routes

This dual data store caused the proposal revision workflow bug where the admin resubmits a revised proposal but the client doesn't see the updated status (approve/reject buttons missing). We patched this in commit 665b2f6 by making the client read from PostgreSQL first and syncing status changes back, but the root architectural issue remains.

Every new feature touching both admin and client needs to handle two data stores — this will keep producing bugs.

**Goal:** `landing-page-new` should ONLY serve:
- Landing page (marketing)
- Quiz

Everything else moves to the portal (5173):
- Client proposal view (`/proposal/[proposalId]`)
- Payment pages (Razorpay integration)
- All API routes currently in `landing-page-new/src/app/api/`
- Client portal pages

This eliminates JSON file storage entirely — single source of truth (PostgreSQL via Netlify functions).

## Solution

TBD — needs a proper plan (`/workflows:plan`). Key considerations:
- Proposal page is accessed by clients via shared links (needs token-based or public access)
- Payment flows (Razorpay) need to be rewired to the portal
- The portal is a Vite SPA — client-facing pages would use the same Netlify functions backend
- May need route-based code splitting in the portal for client vs admin pages
