# Proposal Comments Feature

## What This Is

A Fiverr/Upwork-style comment thread for proposal negotiations in the Motionify portal. Enables clients and superadmins to have free-flowing conversations during proposal review, replacing the current turn-based model where one party must wait for the other to respond before commenting again.

## Core Value

Clients and superadmins can communicate naturally during proposal negotiation without artificial turn restrictions.

## Requirements

### Validated

- ✓ Proposal viewing for clients — existing
- ✓ Proposal management for superadmins — existing
- ✓ Magic link authentication — existing
- ✓ Email notification system — existing
- ✓ File upload infrastructure (R2 presign) — existing

### Active

- [ ] Unlimited comments from both parties (no turn-based restriction)
- [ ] Real-time comment updates (WebSocket/SSE)
- [ ] File attachments on comments
- [ ] Email notifications on new comments
- [ ] In-app notifications on new comments
- [ ] Comment editing (before further replies)
- [ ] Comments embedded in proposal detail page
- [ ] Comments persist after proposal acceptance/rejection

### Out of Scope

- Line-item comments — keeping it simple with proposal-level comments
- Comment deletion — preserving negotiation history
- Reply threading — flat comment list like Fiverr order page
- @mentions — not needed for 1:1 client-superadmin conversation
- Read receipts — overcomplicates the interaction

## Context

**Existing codebase:**
- Dual-app architecture: Vite SPA (admin portal) + Next.js (landing + client portal)
- Proposals managed via `netlify/functions/proposals.ts`
- Client views proposals at `landing-page-new/src/app/proposal/[proposalId]/page.tsx`
- Superadmin manages proposals at `pages/admin/ProposalDetail.tsx`
- File uploads use R2 presigned URLs via `netlify/functions/r2-presign.ts`
- Notifications via `contexts/NotificationContext.tsx` + email via Resend

**Current limitation:**
After a client sends a review request/comment, the system likely requires superadmin response before client can comment again. This creates friction in natural negotiation flow.

**Target experience:**
Like Upwork/Fiverr order messaging — both parties can post whenever they want, messages appear in real-time, with optional file attachments.

## Constraints

- **Tech stack**: Must integrate with existing Vite + Next.js + Netlify Functions architecture
- **Real-time**: Needs WebSocket or SSE solution compatible with Netlify (may need external service like Pusher, Ably, or Supabase Realtime)
- **Database**: PostgreSQL — need new `proposal_comments` table
- **Storage**: R2/S3 for comment attachments using existing presign infrastructure
- **Auth**: Must work with existing magic link authentication in both apps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flat comment thread (no replies) | Simpler UX, matches Fiverr/Upwork pattern | — Pending |
| Embedded in proposal page (not separate view) | Keeps negotiation in context of proposal content | — Pending |
| Real-time via WebSocket/SSE | Required for chat-like experience | — Pending |

---
*Last updated: 2026-01-20 after initialization*
