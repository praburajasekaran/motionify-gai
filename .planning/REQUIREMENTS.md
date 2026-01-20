# Proposal Comments Feature Requirements

## Overview

Requirements for the Fiverr/Upwork-style comment thread feature enabling real-time negotiation conversations between clients and superadmins.

## Requirements

### COMM-01: Unlimited Comment Exchange
**Priority:** Must Have  
**Category:** Comments

Both clients and superadmins can post comments without turn-based restrictions. Either party can initiate or respond to comments at any time during the proposal lifecycle.

**Acceptance Criteria:**
- Client can post multiple comments without waiting for superadmin response
- Superadmin can post multiple comments without waiting for client response
- No artificial delays or restrictions between comment submissions
- Comment count is unlimited per conversation thread

---

### COMM-02: Real-Time Comment Updates
**Priority:** Must Have  
**Category:** Real-time

New comments appear immediately without page refresh, providing a chat-like experience for both parties.

**Acceptance Criteria:**
- New comments appear instantly when posted by either party
- UI updates automatically without page reload
- User sees visual indicator when new comments arrive
- Comment stream maintains scroll position during updates

---

### COMM-03: File Attachments on Comments
**Priority:** Should Have  
**Category:** Attachments

Users can attach files to comments using the existing R2 presigned URL infrastructure.

**Acceptance Criteria:**
- User can upload files when composing a comment
- Uploaded files display as attachments in comment thread
- Files are stored via existing R2 presign infrastructure
- Attachment download works for both parties
- Supported file types follow existing upload policies

---

### COMM-04: Email Notifications on Comments
**Priority:** Should Have  
**Category:** Notifications

Users receive email notifications when new comments are posted in their proposal conversation.

**Acceptance Criteria:**
- Superadmin receives email notification when client posts comment
- Client receives email notification when superadmin posts comment
- Email contains comment preview and link to proposal
- Email notifications respect user preferences (if any exist)
- Uses existing Resend email infrastructure

---

### COMM-05: In-App Notifications
**Priority:** Should Have  
**Category:** Notifications

Users receive in-app notifications when new comments are posted, visible in the existing notification system.

**Acceptance Criteria:**
- New comment triggers notification in NotificationContext
- Notification badge updates on proposal detail page
- User can see notification in notification dropdown/panel
- Clicking notification navigates to proposal with comment highlighted
- Uses existing `contexts/NotificationContext.tsx`

---

### COMM-06: Comment Editing
**Priority:** Could Have  
**Category:** Comments

Users can edit their own comments, but only before other parties reply to maintain conversation clarity.

**Acceptance Criteria:**
- User can edit their own comments within a time window
- Edit option available on user's own comments only
- Editing disabled once another user replies to that comment
- Edited comments show edit indicator/timestamp
- Original edit history preserved (if needed)

---

### COMM-07: Comments Embedded in Proposal Page
**Priority:** Must Have  
**Category:** UI Integration

Comment thread displays within the existing proposal detail page, keeping conversation in context of proposal content.

**Acceptance Criteria:**
- Comment section visible on proposal detail page for both client and superadmin views
- Accessible via `landing-page-new/src/app/proposal/[proposalId]/page.tsx` (client)
- Accessible via `pages/admin/ProposalDetail.tsx` (superadmin)
- Comment section positioned appropriately relative to proposal content
- Comment input form available on page without navigation

---

### COMM-08: Persistent Comments
**Priority:** Must Have  
**Category:** Data Persistence

Comments persist in the database and remain viewable after proposal is accepted or rejected.

**Acceptance Criteria:**
- Comments stored in new `proposal_comments` table
- Comments remain accessible after proposal status changes to accepted
- Comments remain accessible after proposal status changes to rejected
- Historical comments visible in proposal detail post-completion
- No comment data loss on status transitions

---

## Dependencies (Existing)

These are validated existing features that the comments feature depends on:

| Feature | Location | Status |
|---------|----------|--------|
| Proposal viewing for clients | `landing-page-new/src/app/proposal/[proposalId]/page.tsx` | Existing |
| Proposal management for superadmins | `pages/admin/ProposalDetail.tsx` | Existing |
| Magic link authentication | Existing auth system | Existing |
| Email notification system | Resend integration | Existing |
| File upload infrastructure | `netlify/functions/r2-presign.ts` | Existing |

---

## Out of Scope

The following are explicitly excluded from v1:

- Line-item comments (keeping to proposal-level comments only)
- Comment deletion (preserving negotiation history)
- Reply threading (flat comment list, like Fiverr order page)
- @mentions (1:1 conversation doesn't require it)
- Read receipts (overcomplicates interaction)

---

## Traceability

| Requirement | Phase | Priority | Status |
|-------------|-------|----------|--------|
| COMM-01: Unlimited Comment Exchange | Phase 2 | Must Have | Pending |
| COMM-02: Real-Time Comment Updates | Phase 2 | Must Have | Pending |
| COMM-03: File Attachments on Comments | Phase 3 | Should Have | Pending |
| COMM-04: Email Notifications on Comments | Phase 3 | Should Have | Pending |
| COMM-05: In-App Notifications | Phase 3 | Should Have | Pending |
| COMM-06: Comment Editing | Phase 2 | Could Have | Pending |
| COMM-07: Comments Embedded in Proposal Page | Phase 1 | Must Have | ✅ Complete |
| COMM-08: Persistent Comments | Phase 1 | Must Have | ✅ Complete |

**Coverage:** 8/8 requirements mapped (100%)

---

*Last updated: 2026-01-20*
