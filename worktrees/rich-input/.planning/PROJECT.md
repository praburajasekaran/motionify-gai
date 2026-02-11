# Proposal Comments Feature

## What This Is

A Fiverr/Upwork-style comment thread for proposal negotiations in the Motionify portal. Enables clients and superadmins to have free-flowing conversations during proposal review, replacing the current turn-based model where one party must wait for the other to respond before commenting again. **v1.0 shipped with full feature set including real-time polling, file attachments, and email + in-app notifications.**

## Core Value

Clients and superadmins can communicate naturally during proposal negotiation without artificial turn restrictions.

## Requirements

### Validated

- ✓ Unlimited comments from both parties (no turn-based restriction) — v1.0
- ✓ Real-time comment updates (polling, 10-second interval) — v1.0
- ✓ File attachments on comments (R2 presigned URLs) — v1.0
- ✓ Email notifications on new comments — v1.0
- ✓ In-app notifications on new comments — v1.0
- ✓ Comment editing (before further replies) — v1.0
- ✓ Comments embedded in proposal detail page — v1.0
- ✓ Comments persist after proposal acceptance/rejection — v1.0

### Active

*(No active requirements - all v1 requirements shipped. Next milestone planning pending.)*

### Out of Scope

- Line-item comments — keeping it simple with proposal-level comments
- Comment deletion — preserving negotiation history
- Reply threading — flat comment list like Fiverr order page
- @mentions — not needed for 1:1 client-superadmin conversation
- Read receipts — overcomplicates the interaction
- Ably real-time — polling sufficient for v1, upgrade possible in v2

## Current State

**Shipped:** v1.0 — 2026-01-25

**Feature Set Delivered:**
- Full comment system with posting, viewing, and editing
- Real-time polling (10-second interval) in both admin and client portals
- File attachments via R2 presigned URLs with proper metadata handling
- Email notifications triggered on new comments (Resend integration)
- In-app notifications via NotificationContext
- Smart UI features: auto-scroll to new comments, edit button constraints (hasSubsequentReplies), attachment previews
- Gap closures: credential wiring fixes, database schema alignment, attachment flow fixes

**Codebase State:**
- 192,641 lines of TypeScript/JavaScript code
- 14 plan summaries across 6 phases
- 8/8 requirements delivered (100%)
- Tech stack: Vite (admin portal) + Next.js (client portal) + Netlify Functions + PostgreSQL + R2

**Known Issues:** None. All gaps from v1 audit resolved.

## Next Milestone Goals

*(To be defined - next milestone planning pending)*

## Context

### Before v1

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

### After v1

**Delivered:**
- `proposal_comments` table with proper schema (UUIDs, indexes, foreign keys)
- `comment_attachments` table with foreign key to comments
- `netlify/functions/comments.ts` API with GET/POST/PUT endpoints
- `netlify/functions/attachments.ts` API with GET/POST endpoints
- `lib/comments.ts` API client functions
- `lib/attachments.ts` client library for both portals
- `netlify/functions/send-email.ts` with `sendCommentNotificationEmail` function
- CommentThread, CommentItem, CommentInput components for admin SPA
- CommentThread, CommentItem, CommentInput components for Next.js client portal
- Integration in admin ProposalDetail.tsx (before Response Tracking)
- Integration in client proposal page (after ProposalActions)
- Real-time polling with 10-second interval in both portals
- `since` parameter for efficient polling API optimization
- File upload UI with progress tracking
- Attachment display and download functionality
- Email notification on new comments (sender excluded)
- In-app notification creation in notifications table
- NotificationContext integration for comment notifications
- Client portal NotificationContext at `landing-page-new/src/contexts/NotificationContext.tsx`
- Client portal NotificationProvider in `landing-page-new/src/app/layout.tsx`
- **Gap closures completed:**
  - Attachment flow (duplicates, submission, multiple files)
  - Polling stale closure (new comments invisible until refresh)
  - Auto-scroll to new comments
  - Edit button visibility (hasSubsequentReplies logic)
  - Credential wiring (missing `credentials: 'include'` on 4 fetch calls)
  - Database schema alignment (documentation consistency)

## Constraints

- **Tech stack**: Must integrate with existing Vite + Next.js + Netlify Functions architecture
- **Real-time**: Needs WebSocket or SSE solution compatible with Netlify (may need external service like Pusher, Ably, or Supabase Realtime)
- **Database**: PostgreSQL — `proposal_comments` table created
- **Storage**: R2/S3 for comment attachments using existing presign infrastructure
- **Auth**: Works with existing magic link authentication in both apps

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flat comment thread (no replies) | Simpler UX, matches Fiverr/Upwork pattern | ✅ Applied - v1 |
| Embedded in proposal page (not separate view) | Keeps negotiation in context of proposal content | ✅ Applied - v1 |
| Polling for real-time (not Ably) | Simpler v1; Ably upgrade possible in v2 | ✅ Applied - v1 |
| 10-second polling interval | Balances freshness with server load | ✅ Applied - v1 |
| Page Visibility API for battery efficiency | Only poll when page is visible | ✅ Applied - v1 |
| since parameter for efficient polling | Reduces data transfer by fetching only new comments | ✅ Applied - v1 |
| Environment variable for API URL | Removes hardcoded localhost, allows per-environment configuration | ✅ Applied - v1 |
| R2 presigned URLs for file uploads | Leverage existing infrastructure, no custom storage needed | ✅ Applied - v1 |
| Permissive UUID regex | Strict RFC regex rejected valid UUIDs; prioritize compatibility | ✅ Applied - v1 |
| Centralized CORS headers | Ensure all API responses (even errors) have proper CORS | ✅ Applied - v1 |
| Callback prop for attachment flow | Use onAttachmentsChange to sync child state to parent ref | ✅ Applied - v1 |
| Export child types for parent use | Export PendingAttachment from CommentInput for CommentThread type safety | ✅ Applied - v1 |
| Remove from uploadingFiles after completion | Prevent duplicate file preview by cleaning up uploadingFiles when upload completes | ✅ Applied - v1 |
| Production SSL enforcement | Always use strict SSL validation (ssl: true) for database connections in production to prevent MITM attacks | ✅ Applied - PROD-01 |
| Development SSL flexibility | Use DATABASE_SSL env var for dev/staging control; default to SSL with self-signed cert support | ✅ Applied - PROD-01 |
| Mock auth complete removal | Remove mock authentication entirely rather than environment-gating to eliminate attack surface | ✅ Applied - PROD-01 |
| JWT standard library | Use jsonwebtoken library instead of custom crypto implementation for industry-standard JWT handling | ✅ Applied - PROD-01 |
| httpOnly cookies for tokens | Store JWT tokens in httpOnly cookies to prevent XSS token theft | ✅ Applied - PROD-01 |
| Cookie-based auth middleware | Create separate cookie-based auth functions alongside Bearer token auth for backward compatibility | ✅ Applied - PROD-01 |
| Composable middleware pattern | Right-to-left execution order (like function composition) for predictable middleware stacking | ✅ Applied - PROD-01 |
| Strict rate limiting for mutations | 10 req/min for sensitive operations, 100 req/min for reads to balance security with UX | ✅ Applied - PROD-01 |
| Path traversal prevention | Reject file keys containing .. or starting with / to prevent directory traversal attacks | ✅ Applied - PROD-01 |
| Filename sanitization | Replace special chars with _ in uploaded filenames to prevent injection attacks | ✅ Applied - PROD-01 |
| Frontend credentials pattern | All fetch calls must include credentials: 'include' for cookie-based auth; centralized in api-config/api-transformers | ✅ Applied - PROD-01 |
| Cookie session restoration | AuthContext relies solely on /auth-me API for session restoration; no localStorage fallback to ensure cookies are single source of truth | ✅ Applied - PROD-01 |
| Schema-based input validation | All POST/PUT/PATCH endpoints use Zod schemas from _shared/schemas.ts for consistent validation and error handling | ✅ Applied - PROD-01 |

---
*Last updated: 2026-01-25 after v1.0 milestone completion*
