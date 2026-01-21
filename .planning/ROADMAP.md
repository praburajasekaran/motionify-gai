# Roadmap: Proposal Comments Feature

**Project:** Motionify Comment Thread System
**Depth:** Quick (3-4 phases)
**Mode:** YOLO
**Created:** 2026-01-20

## Overview

Implementation roadmap for Fiverr/Upwork-style comment threads enabling real-time proposal negotiation between clients and superadmins. Structured for rapid delivery with minimal phases while maintaining full requirement coverage.

---

## Phase Map

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| **1** | Foundation (Database, API, Embedded UI) | COMM-07, COMM-08 | ✅ Complete |
| **2** | Core Comment Experience (Posting, Real-time) | COMM-01, COMM-02, COMM-06 | ✅ Complete |
| **3** | Attachments & Notifications | COMM-03, COMM-04, COMM-05 | ✅ Complete |
| **4** | Integration & Polish (Gap Closure) | COMM-02, COMM-03, COMM-06 | 🔄 Planning |

---

## Phase 1: Foundation

**Goal:** Users can view and persist comments in the proposal detail page with a working database and API layer.

### Requirements
- **COMM-07:** Comments Embedded in Proposal Page
- **COMM-08:** Persistent Comments

### Dependencies
- Existing: Proposal detail pages (`landing-page-new/.../proposal/[proposalId]/page.tsx`, `pages/admin/ProposalDetail.tsx`)
- Existing: PostgreSQL database with connection pooling
- Existing: Netlify Functions infrastructure

### Success Criteria

1. **Users see comment section on proposal detail page**
   Client users viewing `landing-page-new/src/app/proposal/[proposalId]/page.tsx` see a comment thread section. Superadmins viewing `pages/admin/ProposalDetail.tsx` also see the comment section. Both views show an empty state when no comments exist.

2. **Comments persist in database across sessions**
   When a comment is posted, it is stored in the `proposal_comments` table. Closing and reopening the browser (or starting a new session) displays previously posted comments in chronological order.

3. **Both user types can view the same comment thread**
   A client and superadmin viewing the same proposalId see identical comments. Comments are filtered by proposal (no cross-proposal leakage).

---

## Phase 2: Core Comment Experience

**Goal:** Users can post comments freely, see updates via polling, and edit their own comments before replies.

### Requirements
- **COMM-01:** Unlimited Comment Exchange
- **COMM-02:** Real-Time Comment Updates
- **COMM-06:** Comment Editing

### Dependencies
- Phase 1 complete (database schema, API, embedded UI exist)

### Success Criteria

1. **Both parties can post comments without turn restrictions**
   A client can post multiple consecutive comments without waiting for a superadmin response. A superadmin can similarly post multiple comments in sequence. Neither party encounters "waiting for response" restrictions.

2. **New comments appear without page refresh**
   When User A posts a comment, User B sees it appear within 10 seconds without manually refreshing the page. The comment stream updates automatically via polling.

3. **User can edit their own recent comments**
   A user sees an "Edit" button on comments they authored. Clicking edit opens a form to modify the comment content. Edited comments display an edit indicator.

4. **Edit option unavailable after replies**
   Once another user replies to a comment, the "Edit" button disappears from that comment. The user can no longer edit that comment.

### Plans
- [x] `02-01-comment-editing-PLAN.md` — PUT endpoint + edit UI for both portals
- [x] `02-02-realtime-polling-PLAN.md` — Polling for real-time updates + API URL fix

---

## Phase 3: Attachments & Notifications

**Goal:** Users can attach files to comments and receive notifications when new comments are posted.

### Requirements
- **COMM-03:** File Attachments on Comments
- **COMM-04:** Email Notifications on Comments
- **COMM-05:** In-App Notifications

### Dependencies
- Phase 2 complete (comment posting, viewing, editing work)
- Existing: R2 presign API (`netlify/functions/r2-presign.ts`)
- Existing: NotificationContext.tsx
- Existing: Resend email integration

### Success Criteria

1. **Users can attach files to comments**
   When composing a comment, a user can click "Attach file" and select a file from their device. After upload, the file appears as an attachment below the comment. Both parties can download attached files.

2. **Users receive email notifications on new comments**
   When a client posts a comment, the assigned superadmin receives an email notification. When a superadmin posts a comment, the client receives an email. Emails contain a preview of the comment and a link to the proposal.

3. **In-app notification badge updates on new comments**
   Users see a notification badge increment when new comments are posted. The notification is visible in the existing notification dropdown/panel. Clicking the notification navigates to the proposal with the comment highlighted.

4. **Attachment upload uses existing R2 infrastructure**
    Files upload via the existing R2 presigned URL system. No custom file storage implementation required. Upload respects existing file type and size policies.

### Plans
- [x] `03-01-PLAN.md` — File attachments infrastructure (database, API, UI)
- [x] `03-02-PLAN.md` — Email + in-app notifications (admin portal complete)
- [x] `03-03-PLAN.md` — Gap closure: Client portal notification infrastructure
- [x] `03-04-PLAN.md` — Gap closure: Backend robustness (CORS, DB safety)
- [x] `03-05-PLAN.md` — Gap closure: Client API path and validation fixes
- [ ] `03-06-gap-closure-fix-PLAN.md` — Gap closure: Re-apply backend fixes (DB tables, R2 function)

---

## Phase 4: Integration & Polish

**Goal:** Fix component wiring issues identified in milestone audit to restore editing and attachments functionality.

### Requirements
- **COMM-02:** Real-Time Comment Updates (scroll preservation)
- **COMM-03:** File Attachments on Comments (wire metadata through submit flow)
- **COMM-06:** Comment Editing (connect handler)

### Gap Closure
Addresses critical gaps from v1 milestone audit:
- **Integration gap:** CommentInput → CommentThread data flow (attachment metadata)
- **Flow gap:** "Post Comment with Attachment" (data loss at submit)
- **Flow gap:** "Edit Comment" (handler disconnected)
- **UX gap:** Scroll jumping during polling updates

### Dependencies
- Phase 3 complete (attachment upload and API endpoints exist)
- Existing: CommentThread, CommentInput, CommentItem components in both portals

### Success Criteria

1. **Edit button works in both portals**
   Clicking "Edit" on a user's own comment opens an inline editor. Submitting the edit updates the comment via PUT endpoint. Edit indicator appears on edited comments.

2. **Attachments link to comments on submit**
   When a user uploads a file and submits a comment, the attachment metadata flows from CommentInput to CommentThread. The comment_attachments table is populated with the correct comment_id.

3. **Scroll position preserved during updates**
   When polling fetches new comments, the user's scroll position in the thread is maintained. Reading older comments is not interrupted by new arrivals.

4. **Both portals handle attachment flow**
   Admin portal (Vite SPA) and client portal (Next.js) both correctly wire attachment data through onSubmit signature.

### Plans
- [ ] `04-01-PLAN.md` — Wire edit handlers and fix attachment data flow

---

## Dependencies Between Phases

```
Phase 1 ──┬──► Phase 2 ──┬──► Phase 3 ──► Phase 4
          │              │                  │
          │              │                  └── Gap Closure: Fix component wiring
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
| COMM-02: Real-Time Comment Updates | Phase 2, 4 | Must Have | ⚠️ Needs Polish |
| COMM-03: File Attachments on Comments | Phase 3, 4 | Should Have | ⚠️ Needs Wiring |
| COMM-04: Email Notifications on Comments | Phase 3 | Should Have | ✅ Complete |
| COMM-05: In-App Notifications | Phase 3 | Should Have | ✅ Complete |
| COMM-06: Comment Editing | Phase 2, 4 | Could Have | ⚠️ Needs Wiring |
| COMM-07: Comments Embedded in Proposal Page | Phase 1 | Must Have | ✅ Complete |
| COMM-08: Persistent Comments | Phase 1 | Must Have | ✅ Complete |

**Coverage:** 8/8 requirements mapped (100%)
**Phases:** 4 (3 complete + 1 gap closure)
**Phase 3:** Complete (backend solid)
**Phase 4:** Planning (frontend wiring fixes)

---

## Research Flags (Deferred Implementation)

The following require additional research before planning but are covered in current phase structure:

| Item | Phase | Notes |
|------|-------|-------|
| Ably real-time (vs polling) | Phase 2 | Polling used for v1. Ably upgrade possible in v2. |
| R2 presign CORS configuration | Phase 3 | Confirm existing API supports direct uploads |
| File type allowlist validation | Phase 3 | Define allowed types; existing validation may apply |

---

*Last updated: 2026-01-21*
