# Phase PROD-10: UX Polish - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve client-facing status labels with professional translations, add status timeline view, implement proposal edit restrictions based on client response state, and add status change notifications. This phase does NOT add new proposal workflows or change the underlying status state machine.

</domain>

<decisions>
## Implementation Decisions

### Status Label Translation
- Professional/formal tone for all client-facing labels ("Pending Review", "Awaiting Approval", "Payment Required")
- Labels should indicate who needs to act ("Awaiting Your Approval", "Pending Admin Review")
- Hide status badge entirely for internal-only statuses that have no client-friendly mapping
- Show timeline view of status progression (not just current status)
- Timeline shows: status name + who changed it + timestamp (e.g., "Approved by Sarah - Jan 25, 3:42 PM")
- Timeline filtering: Clients see only client-relevant transitions; admins/team see all transitions
- Timeline is view-only, no interactive elements

### Status Visual Treatment
- Traffic light color scheme: Green (positive), Yellow (pending), Red (attention needed), Gray (neutral)
- Lucide icons + text labels on all status badges
- Highly visible badges: large badge, strong color background, top of card
- No animation or pulsing effects

### Proposal Edit Restriction
- Editing blocked after client responds (approves/rejects/requests changes)
- Revision request re-enables editing so admin can update and resend
- Status stays at "Revision Requested" while admin is editing (no status change)
- Show banner message when editing is locked: "Editing locked - client has responded"
- Super admins have "Force Edit" override with confirmation warning dialog
- Explicit "Resend" button after editing (Save and Resend are separate actions)
- All resend actions logged to activity
- No limit on revision cycles
- Show revision version numbers (e.g., "Revision 3") but not field-level diffs

### Status Change Feedback
- Notify clients via both email AND in-app notifications for all status changes
- Email includes: new status, proposal title, and link to view (summary format)
- In-app: both toast popup AND bell badge (toast appears immediately, badge persists)
- Admins receive both email + in-app when clients respond to proposals

### Claude's Discretion
- Timeline placement in the proposal view layout
- Exact icon selection for each status from Lucide library
- Specific wording for the edit-locked banner message
- Toast notification duration and positioning
- Email subject line wording

</decisions>

<specifics>
## Specific Ideas

- Timeline should feel like a professional audit trail - clear progression of proposal lifecycle
- "Force Edit" warning should make admin pause and consider implications
- Resend button should be visually distinct from regular Save

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: PROD-10-ux-polish*
*Context gathered: 2026-01-28*
