# Phase 3: Attachments & Notifications - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can attach files to comments and receive notifications when new comments are posted. This phase covers:
- File attachments on comments (COMM-03)
- Email notifications on comments (COMM-04)
- In-app notifications on comments (COMM-05)

Uses existing R2 presign API, NotificationContext.tsx, and Resend email integration.

</domain>

<decisions>
## Implementation Decisions

### Attachment handling
- File types: PNG, JPG, WebP, PDF, DOCX, DOC, TXT
- Max file size: 10MB per file (OpenCode's discretion)
- Multiple files: Yes, up to 5 files per comment
- Upload UI: Both button picker and drag-and-drop
- Visual display: Files appear as attachments below the comment with download links

### Email notification design
- Subject line: "[Client/Admin] commented on your proposal"
- Preview: First 100 characters of comment content
- CTA: "Reply on Portal" button (users must login to reply, no reply-to-email)
- Sender: notifications@motionify.studio
- Unsubscribe: No (essential notifications only)

### In-app notification UX
- Location: Existing NotificationContext dropdown/panel
- Badge: Exact count of unread notifications
- Click behavior: Auto-navigate to proposal with comment highlighted
- On-page indicator: When viewing the proposal, new comments are highlighted briefly

### Notification scope
- Both parties notified, but sender does NOT receive notification of their own comment
- Immediate email for every comment (no batching)
- Both new comments and edited comments trigger notifications
- Only the other party is notified on edits (not the editor themselves)

</decisions>

<specifics>
## Specific Ideas

- Users must login to the portal to reply to comments (reply-to-email disabled to drive portal engagement)
- Comment edits trigger notifications with same behavior as new comments
- Highlighting new comments briefly on the page helps users identify what just arrived

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-attachments-and-notifications*
*Context gathered: 2026-01-20*
