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
| **4** | Integration & Polish (Gap Closure) | COMM-02, COMM-03, COMM-06 | 🔧 In Progress |

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

---

## Phase 4: Integration & Polish

**Goal:** Fix UAT failures - database migration, attachment flow, polling stale closure, auto-scroll, and edit button logic.

### Requirements
- **COMM-02:** Real-Time Comment Updates (polling fixes, auto-scroll)
- **COMM-03:** File Attachments on Comments (complete attachment flow, fix duplicates)
- **COMM-06:** Comment Editing (hasSubsequentReplies logic)

### Gap Closure
Addresses 9 diagnosed gaps from UAT:
- **Blocker:** Database migration not applied (500 errors)
- **Major:** Attachment flow broken (duplicates, not submitting, multiple files)
- **Major:** Polling stale closure (new comments invisible until refresh)
- **Major:** Missing auto-scroll to new comments
- **Major:** Edit button appears on all own comments (missing hasSubsequentReplies check)

### Dependencies
- Phase 3 complete (attachment upload and API endpoints exist)
- Existing: CommentThread, CommentInput, CommentItem components in both portals

### Success Criteria

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

### Plans
- [x] `04-01-PLAN.md` — Wire attachment data flow via callback, verify edit/scroll implementations
- [ ] `04-02-PLAN.md` — Apply database migration 002 (blocker)
- [ ] `04-03-PLAN.md` — Fix attachment flow (duplicates, submission, multiple files)
- [ ] `04-04-PLAN.md` — Fix polling stale closure and implement smart auto-scroll
- [ ] `04-05-PLAN.md` — Implement hasSubsequentReplies edit button logic

**Plan Count:** 5 plans in 2 waves (02 in wave 1, 03-05 in wave 2)

---

## Dependencies Between Phases

```
Phase 1 ──┬──► Phase 2 ──┬──► Phase 3 ──► Phase 4
          │              │                  │
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
| COMM-02: Real-Time Comment Updates | Phase 2, 4 | Must Have | 🔧 Fixing |
| COMM-03: File Attachments on Comments | Phase 3, 4 | Should Have | 🔧 Fixing |
| COMM-04: Email Notifications on Comments | Phase 3 | Should Have | ✅ Complete |
| COMM-05: In-App Notifications | Phase 3 | Should Have | ✅ Complete |
| COMM-06: Comment Editing | Phase 2, 4 | Could Have | 🔧 Fixing |
| COMM-07: Comments Embedded in Proposal Page | Phase 1 | Must Have | ✅ Complete |
| COMM-08: Persistent Comments | Phase 1 | Must Have | ✅ Complete |

**Coverage:** 8/8 requirements mapped (100%)
**Phases:** 4 (3 complete + 1 gap closure in progress)
**Phase 4:** 5 plans (1 complete, 4 pending)
**Status:** Fixing UAT failures

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
