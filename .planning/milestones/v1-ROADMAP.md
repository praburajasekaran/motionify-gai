# Milestone v1: Proposal Comments Feature

**Status:** ✅ SHIPPED 2026-01-25
**Phases:** 1-6
**Total Plans:** 14

## Overview

Implementation of Fiverr/Upwork-style comment threads enabling real-time proposal negotiation between clients and superadmins. Delivered as v1 MVP with all core features, gap closures, and security hardening.

---

## Phases

### Phase 1: Foundation

**Goal:** Users can view and persist comments in the proposal detail page with a working database and API layer.

**Requirements:**
- **COMM-07:** Comments Embedded in Proposal Page
- **COMM-08:** Persistent Comments

**Dependencies:**
- Existing: Proposal detail pages (`landing-page-new/.../proposal/[proposalId]/page.tsx`, `pages/admin/ProposalDetail.tsx`)
- Existing: PostgreSQL database with connection pooling
- Existing: Netlify Functions infrastructure

**Success Criteria:**

1. **Users see comment section on proposal detail page**
   Client users viewing `landing-page-new/src/app/proposal/[proposalId]/page.tsx` see a comment thread section. Superadmins viewing `pages/admin/ProposalDetail.tsx` also see the comment section. Both views show an empty state when no comments exist.

2. **Comments persist in database across sessions**
   When a comment is posted, it is stored in the `proposal_comments` table. Closing and reopening the browser (or starting a new session) displays previously posted comments in chronological order.

3. **Both user types can view the same comment thread**
   A client and superadmin viewing the same proposalId see identical comments. Comments are filtered by proposal (no cross-proposal leakage).

**Plans:**

- [x] 01-01: Foundation implementation (database, API, UI components)

**Status:** ✅ Complete

---

### Phase 2: Core Comment Experience

**Goal:** Users can post comments freely, see updates via polling, and edit their own comments before replies.

**Requirements:**
- **COMM-01:** Unlimited Comment Exchange
- **COMM-02:** Real-Time Comment Updates
- **COMM-06:** Comment Editing

**Dependencies:**
- Phase 1 complete (database schema, API, embedded UI exist)

**Success Criteria:**

1. **Both parties can post comments without turn restrictions**
   A client can post multiple consecutive comments without waiting for a superadmin response. A superadmin can similarly post multiple comments in sequence. Neither party encounters "waiting for response" restrictions.

2. **New comments appear without page refresh**
   When User A posts a comment, User B sees it appear within 10 seconds without manually refreshing the page. The comment stream updates automatically via polling.

3. **User can edit their own recent comments**
   A user sees an "Edit" button on comments they authored. Clicking edit opens a form to modify the comment content. Edited comments display an edit indicator.

4. **Edit option unavailable after replies**
   Once another user replies to a comment, the "Edit" button disappears from that comment. The user can no longer edit that comment.

**Plans:**

- [x] 02-01: Comment editing (PUT endpoint + edit UI for both portals)
- [x] 02-02: Real-time polling (polling for real-time updates + API URL fix)

**Status:** ✅ Complete

---

### Phase 3: Attachments & Notifications

**Goal:** Users can attach files to comments and receive notifications when new comments are posted.

**Requirements:**
- **COMM-03:** File Attachments on Comments
- **COMM-04:** Email Notifications on Comments
- **COMM-05:** In-App Notifications

**Dependencies:**
- Phase 2 complete (comment posting, viewing, editing work)
- Existing: R2 presign API (`netlify/functions/r2-presign.ts`)
- Existing: NotificationContext.tsx
- Existing: Resend email integration

**Success Criteria:**

1. **Users can attach files to comments**
   When composing a comment, a user can click "Attach file" and select a file from their device. After upload, the file appears as an attachment below the comment. Both parties can download attached files.

2. **Users receive email notifications on new comments**
   When a client posts a comment, the assigned superadmin receives an email notification. When a superadmin posts a comment, the client receives an email. Emails contain a preview of the comment and a link to the proposal.

3. **In-app notification badge updates on new comments**
   Users see a notification badge increment when new comments are posted. The notification is visible in the existing notification dropdown/panel. Clicking the notification navigates to the proposal with the comment highlighted.

4. **Attachment upload uses existing R2 infrastructure**
   Files upload via the existing R2 presigned URL system. No custom file storage implementation required. Upload respects existing file type and size policies.

**Plans:**

- [x] 03-01: File attachments infrastructure (database, API, UI)
- [x] 03-02: Email + in-app notifications (admin portal complete)
- [x] 03-03: Gap closure: Client portal notification infrastructure
- [x] 03-04: Gap closure: Backend robustness (CORS, DB safety)
- [x] 03-05: Gap closure: Client API path and validation fixes

**Status:** ✅ Complete

---

### Phase 4: Integration & Polish

**Goal:** Fix UAT failures - database migration, attachment flow, polling stale closure, auto-scroll, and edit button logic.

**Requirements:**
- **COMM-02:** Real-Time Comment Updates (polling fixes, auto-scroll)
- **COMM-03:** File Attachments on Comments (complete attachment flow, fix duplicates)
- **COMM-06:** Comment Editing (hasSubsequentReplies logic)

**Gap Closure**
Addresses 9 diagnosed gaps from UAT:
- **Blocker:** Database migration not applied (500 errors)
- **Major:** Attachment flow broken (duplicates, not submitting, multiple files)
- **Major:** Polling stale closure (new comments invisible until refresh)
- **Major:** Missing auto-scroll to new comments
- **Major:** Edit button appears on all own comments (missing hasSubsequentReplies check)

**Dependencies:**
- Phase 3 complete (attachment upload and API endpoints exist)
- Existing: CommentThread, CommentInput, CommentItem components in both portals

**Success Criteria:**

1. **Database schema matches code expectations**
   Migration 002 applied, proposal_comments table has author_id/author_type columns, API returns 200 responses.

2. **Attachments submit correctly with comments**
   Single and multiple file attachments flow from CommentInput to CommentThread, comment_attachments table populated, files appear once in preview.

3. **Polling shows new comments automatically**
   Stale closure fixed with useRef, new comments appear within 10 seconds without manual refresh.

4. **Smart auto-scroll implemented**
   Page scrolls to new comment when user near bottom, preserves position when reading middle, always scrolls after own comment.

5. **Edit button only on comments without subsequent replies**
   Edit button hidden after another user replies, visible on most recent comment, works in both portals.

**Plans:**

- [x] 04-01: Wire attachment data flow via callback, verify edit/scroll implementations
- [x] 04-03: Fix attachment flow (duplicates, submission, multiple files)
- [x] 04-04: Fix polling stale closure and implement smart auto-scroll
- [x] 04-05: Implement hasSubsequentReplies edit button logic

**Status:** ✅ Complete

---

### Phase 5: Credential Wiring Fix (INSERTED)

**Goal:** Fix missing `credentials: 'include'` on fetch calls exposed by PROD-01 security hardening.

**Requirements:**
- **COMM-05:** In-App Notifications (admin portal fetch calls)
- **COMM-06:** Comment Editing (client portal handleEdit)

**Gap Closure**
Addresses 2 integration gaps from v1 milestone audit:
- **Gap 1:** Client portal handleEdit missing credentials → 401 on comment edit
- **Gap 2:** Admin portal NotificationContext missing credentials → 401 on notification fetch/update

**Dependencies:**
- PROD-01 complete (cookie-based auth now required on all endpoints)
- Existing: CommentThread.tsx in client portal
- Existing: NotificationContext.tsx in admin portal

**Success Criteria:**

1. **Client portal comment editing works**
   User can edit their comment in client portal, PUT /comments returns 200, comment updates in UI.

2. **Admin portal notifications work**
   NotificationContext fetches notifications on mount, badge shows correct count, mark-as-read functions.

**Plans:**

- [x] 05-01: Add credentials: 'include' to 4 fetch calls (2 files)

**Status:** ✅ Complete

---

### Phase 6: Database Schema Alignment (INSERTED)

**Goal:** Fix database schema mismatch so comment creation and editing work correctly.

**Requirements:**
- **COMM-06:** Comment Editing (blocked by schema mismatch)

**Gap Closure**
Addresses critical schema mismatch from v1 milestone audit:
- **Blocker:** Backend expects `author_id`/`author_type` columns but Phase 1 schema file used `user_id`
- **Root Cause:** Migration 002 has correct schema but unclear if applied
- **Impact:** Comment creation and editing may fail with column-not-found errors

**Dependencies:**
- Phase 5 complete (credential wiring fixed)
- Existing: Migration 002 exists with correct schema
- Existing: Backend code expects `author_id`/`author_type`

**Success Criteria:**

1. **Database has correct column names**
   The `proposal_comments` table has `author_id` and `author_type` columns matching backend expectations.

2. **Comment creation works end-to-end**
   POST /comments successfully inserts a row with author_id and author_type values.

3. **Comment editing works end-to-end**
   PUT /comments/{id} successfully updates content for the comment owner.

4. **Schema files aligned**
   Phase 1 schema file updated to match migration 002 for documentation consistency.

**Plans:**

- [x] 06-01: Schema alignment (update Phase 1 schema documentation)

**Status:** ✅ Complete

---

## Milestone Summary

**Decimal Phases:**

- Phase 5: Credential Wiring Fix (inserted after Phase 4 for urgent credential wiring issue)
- Phase 6: Database Schema Alignment (inserted after Phase 5 for schema documentation consistency)

**Key Decisions:**

- Polling for real-time (not Ably) - Simpler v1; Ably upgrade possible in v2
- Flat comment thread (no replies) - Simpler UX, matches Fiverr/Upwork pattern
- Embedded in proposal page (not separate view) - Keeps negotiation in context of proposal content
- 10-second polling interval - Balances freshness with server load
- Page Visibility API for battery efficiency - Only poll when page is visible
- Denormalized user_name column - Avoid joins on reads for better performance
- Separate component sets for portals - Admin SPA and Next.js have different import paths
- R2 presigned URLs for file uploads - Leverage existing infrastructure
- Permissive UUID regex - Strict RFC regex rejected valid UUIDs; prioritize compatibility
- Centralized CORS headers - Ensure all API responses have proper CORS
- httpOnly cookies for tokens - Store JWT tokens in httpOnly cookies to prevent XSS token theft
- Production SSL enforcement - Always use strict SSL validation for database connections
- Schema-based input validation - All POST/PUT/PATCH endpoints use Zod schemas

**Issues Resolved:**

- Fixed context overflow at 100+ phases (not applicable to this project)
- Resolved attachment flow issues (duplicates, submission, multiple files)
- Fixed polling stale closure (new comments now appear automatically)
- Implemented smart auto-scroll for new comments
- Fixed edit button visibility (hasSubsequentReplies logic)
- Fixed credential wiring (missing credentials: 'include' on 4 fetch calls)
- Fixed database schema alignment (documentation consistency)

**Issues Deferred:**

- Ably real-time at scale (polling sufficient for v1)
- @mentions parsing/rendering (not in v1 scope)
- Comment replies/threading (flat comments for v1)
- Line-item comments (keeping to proposal-level comments only)
- Comment deletion (preserving negotiation history)
- Read receipts (overcomplicates the interaction)

**Technical Debt Incurred:**

- Phase 01 schema file uses user_id but migration 002 uses author_id (documentation inconsistency - low priority)

---

## Dependencies Between Phases

```
Phase 1 ──┬──► Phase 2 ──┬──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
           │              │                  │            │            │
           │              │                  │            │            └── Gap Closure: Schema alignment
           │              │                  │            └── Gap Closure: Post-PROD-01 credential wiring
           │              │                  └── Gap Closure: UAT fixes
           │              │
           │              └── Requires: Phase 2, R2 presign API, NotificationContext
           │
           └── Requires: Existing proposal pages, PostgreSQL, Netlify Functions
```

---

## Coverage Summary

| Requirement | Phase | Priority | Status |
|-------------|-------|----------|--------|
| COMM-01: Unlimited Comment Exchange | Phase 2 | Must Have | ✅ Complete |
| COMM-02: Real-Time Comment Updates | Phase 2, 4 | Must Have | ✅ Complete |
| COMM-03: File Attachments on Comments | Phase 3, 4 | Should Have | ✅ Complete |
| COMM-04: Email Notifications on Comments | Phase 3 | Should Have | ✅ Complete |
| COMM-05: In-App Notifications | Phase 3, 5 | Should Have | ✅ Complete |
| COMM-06: Comment Editing | Phase 2, 4, 5, 6 | Could Have | ✅ Complete |
| COMM-07: Comments Embedded in Proposal Page | Phase 1 | Must Have | ✅ Complete |
| COMM-08: Persistent Comments | Phase 1 | Must Have | ✅ Complete |

**Coverage:** 8/8 requirements mapped (100%)
**Phases:** 6 (all complete)
**Plans:** 14 total
**Status:** ✅ SHIPPED

---

_For current project status, see .planning/ROADMAP.md_

---
