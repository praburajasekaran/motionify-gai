# ASCII Wireframes: Project Terms & Acceptance

This document contains all user interface wireframes for the feature.

## 📋 UI Standards & Conventions

**Routing:** All routes use `portal.motionify.studio` subdomain pattern  
**Parameters:** `:projectId` (consistent naming)  
**Modal Close:** `[×]` (disabled) for blocking modals  
**Buttons:** Right-aligned with `[Cancel] [Primary]` order  
**Loading States:** `[Spinner]` notation  
**Note:** Terms acceptance is blocking - user cannot access project until accepted

_Note: See WIREFRAME_CONFLICT_ANALYSIS.md for complete standardization details_

---

## Table of Contents

### Client-Facing Screens
1. [Terms Review Modal (Blocking)](#screen-1-terms-review-modal-blocking)
2. [Accept Confirmation Dialog](#screen-2-accept-confirmation-dialog)
3. [Request Changes Form](#screen-3-request-changes-form)
4. [Re-acceptance Required Modal](#screen-4-re-acceptance-required-modal)

### Admin Screens
5. [Terms Editor & Management](#screen-5-admin-terms-editor--management)

---

## Client-Facing Screens

### SCREEN 1: Terms Review Modal (Blocking)

**Purpose:** Display project terms to client primary contact on first login, blocking all project access until accepted or change requested

**Route:** Triggered on `portal.motionify.studio/projects/:projectId` (any project route)
**Authentication:** Required (client primary contact only)
**Trigger:** Shown automatically when `terms.status !== 'accepted'`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ╳                                                                           │
│                      PROJECT TERMS & AGREEMENT                               │
│                                                                              │
│  Before you can access this project, please review and accept the           │
│  project terms below.                                                        │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │                                                                       │ ▲ │
│ │  PROJECT OVERVIEW                                                     │ █ │
│ │  Project Name: "Brand Video Campaign Q1 2025"                        │ █ │
│ │  Client: Acme Corp                                                    │ █ │
│ │  Start Date: January 15, 2025                                         │ ▼ │
│ │  End Date: March 30, 2025                                             │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  PROJECT SCOPE                                                        │   │
│ │                                                                       │   │
│ │  Inclusions:                                                          │   │
│ │  • 3 promotional videos (30 seconds each)                             │   │
│ │  • Professional voiceover recording                                   │   │
│ │  • Background music licensing                                         │   │
│ │  • Motion graphics and animations                                     │   │
│ │  • Color grading and final polish                                     │   │
│ │                                                                       │   │
│ │  Exclusions:                                                          │   │
│ │  • On-location filming (stock footage only)                           │   │
│ │  • Multiple voiceover takes (1 revision included)                     │   │
│ │  • Custom music composition                                           │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  DELIVERABLES                                                         │   │
│ │                                                                       │   │
│ │  1. Promotional Video #1 - Product Showcase                           │   │
│ │     Format: MP4, 1080p, 30fps                                         │   │
│ │     Due: February 15, 2025                                            │   │
│ │                                                                       │   │
│ │  2. Promotional Video #2 - Customer Testimonials                      │   │
│ │     Format: MP4, 1080p, 30fps                                         │   │
│ │     Due: March 1, 2025                                                │   │
│ │                                                                       │   │
│ │  3. Promotional Video #3 - Behind the Scenes                          │   │
│ │     Format: MP4, 1080p, 30fps                                         │   │
│ │     Due: March 15, 2025                                               │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  REVISION POLICY                                                      │   │
│ │                                                                       │   │
│ │  Total Revisions Included: 3                                          │   │
│ │                                                                       │   │
│ │  Each deliverable may be revised up to the total revision count.      │   │
│ │  Revisions are shared across all deliverables. Additional revisions   │   │
│ │  can be requested and require approval.                               │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  TIMELINE                                                             │   │
│ │                                                                       │   │
│ │  Project Duration: 11 weeks                                           │   │
│ │  Weekly Check-ins: Tuesdays at 2:00 PM EST                            │   │
│ │  Final Deadline: March 30, 2025                                       │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  PRICING                                                              │   │
│ │                                                                       │   │
│ │  Project Total: $15,000 USD                                           │   │
│ │  Payment Schedule:                                                    │   │
│ │    • 50% deposit ($7,500) - Due upon acceptance of terms              │   │
│ │    • 50% final payment ($7,500) - Due upon project completion         │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ I have read and agree to the project terms above                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                    ┌────────────────────┐    ┌──────────────────┐          │
│                    │  Accept Terms  →   │    │ Request Changes  │          │
│                    └────────────────────┘    └──────────────────┘          │
│                                                                              │
│  Note: You must accept these terms before you can access the project.       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Modal cannot be closed (no ╳ close button is functional)
- Checkbox must be checked to enable "Accept Terms" button
- "Accept Terms" button disabled until checkbox checked

**User Actions:**
- **Check agreement checkbox** → Enables "Accept Terms" button
- **Click "Accept Terms"** → Shows confirmation dialog (Screen 2)
- **Click "Request Changes"** → Shows change request form (Screen 3)

**API Call:**
```
GET /api/projects/:id/terms
→ Returns current terms, version, status
```

---

### SCREEN 2: Accept Confirmation Dialog

**Purpose:** Confirm client's intent to accept project terms

**Route:** Overlay on top of Screen 1
**Authentication:** Required (client primary contact)
**Trigger:** User clicks "Accept Terms" button

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Background darkened - Terms modal still visible behind]                    │
│                                                                              │
│                                                                              │
│         ┌─────────────────────────────────────────────────────┐            │
│         │  ╳                                                   │            │
│         │                                                      │            │
│         │          CONFIRM TERMS ACCEPTANCE                    │            │
│         │                                                      │            │
│         │  By clicking "Confirm", you agree to:                │            │
│         │                                                      │            │
│         │  • All project scope, deliverables, and timeline     │            │
│         │    as outlined in the terms document                │            │
│         │  • The revision policy (3 revisions included)        │            │
│         │  • The payment schedule and project total            │            │
│         │                                                      │            │
│         │  This acceptance will be recorded with a timestamp   │            │
│         │  for audit purposes.                                 │            │
│         │                                                      │            │
│         │  Are you ready to proceed?                           │            │
│         │                                                      │            │
│         │                                                      │            │
│         │     ┌──────────────┐       ┌───────────────────┐    │            │
│         │     │   Cancel     │       │  Confirm Accept   │    │            │
│         │     └──────────────┘       └───────────────────┘    │            │
│         │                                                      │            │
│         └─────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**User Actions:**
- **Click "Cancel"** → Close dialog, return to terms review modal
- **Click "Confirm Accept"** → Submit acceptance, show success message, redirect to project dashboard

**API Call:**
```
POST /api/projects/:id/terms/accept
{
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "termsVersion": 1
}
→ Returns: { success: true, projectUnlocked: true }
```

**Success Behavior:**
- Show toast: "✓ Terms accepted! You now have full access to the project."
- Redirect to `portal.motionify.studio/projects/:projectId` (project dashboard)
- Close modal
- Enable all project features

---

### SCREEN 3: Request Changes Form

**Purpose:** Allow client to request modifications to project terms

**Route:** Replaces Screen 1 content
**Authentication:** Required (client primary contact)
**Trigger:** User clicks "Request Changes" link

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Terms                                                             │
│                                                                              │
│                      REQUEST CHANGES TO PROJECT TERMS                        │
│                                                                              │
│  If you have concerns or need adjustments to the project terms, please       │
│  describe them below. Our team will review your request and respond within   │
│  24 hours.                                                                   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  What would you like to change?  *                                    │   │
│ │ ┌────────────────────────────────────────────────────────────────────┐│  │
│ ││                                                                      ││  │
│ ││  Example: I'd like to extend the timeline for Deliverable 2 by      ││  │
│ ││  two weeks due to upcoming holidays.                                ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ │└────────────────────────────────────────────────────────────────────┘│  │
│ │  0 / 1000 characters                                                  │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  Additional context (optional)                                        │   │
│ │ ┌────────────────────────────────────────────────────────────────────┐│  │
│ ││                                                                      ││  │
│ ││  Any additional information that might help us understand your      ││  │
│ ││  request...                                                          ││  │
│ ││                                                                      ││  │
│ ││                                                                      ││  │
│ │└────────────────────────────────────────────────────────────────────┘│  │
│ │  0 / 500 characters                                                   │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ℹ️  Note: Project access will remain locked until terms are accepted.      │
│     We aim to respond to all change requests within 1 business day.          │
│                                                                              │
│                                                                              │
│                    ┌────────────────────┐    ┌──────────────────┐          │
│                    │  Submit Request →  │    │     Cancel       │          │
│                    └────────────────────┘    └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- "What would you like to change?" is required (minimum 10 characters)
- "Additional context" is optional (maximum 500 characters)
- Character counter updates as user types
- "Submit Request" button disabled until required field filled

**User Actions:**
- **Click "← Back to Terms"** → Return to Screen 1
- **Fill in requested changes** → Enable submit button
- **Click "Submit Request"** → Submit change request, show success message
- **Click "Cancel"** → Return to Screen 1

**API Call:**
```
POST /api/projects/:id/terms/request-revision
{
  "requestedChanges": "I'd like to extend the timeline...",
  "additionalContext": "Due to upcoming holidays",
  "termsVersion": 1
}
→ Returns: { success: true, requestId: "uuid" }
```

**Success Behavior:**
- Show success message: "✓ Change request submitted. We'll review and respond within 24 hours."
- Return to login screen with message: "Your change request has been sent to the Motionify Studio team. You'll receive an email when we respond. Project access will be granted once terms are accepted."
- Send email to admin with change request details

---

### SCREEN 4: Re-acceptance Required Modal

**Purpose:** When admin updates terms, client must review and accept the new version

**Route:** Triggered on `portal.motionify.studio/projects/:projectId` (any project route)
**Authentication:** Required (client primary contact)
**Trigger:** Terms version changed, previous acceptance invalidated

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ╳                                                                           │
│                                                                              │
│                      ⚠️  UPDATED PROJECT TERMS                               │
│                                                                              │
│  The project terms have been updated based on your request. Please review    │
│  the changes below and re-accept to continue.                                │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  📋 Version 2 - Updated January 16, 2025                               │   │
│ │                                                                       │   │
│ │  ✨ WHAT CHANGED:                                                     │   │
│ │                                                                       │   │
│ │  ▸ Deliverable 2 timeline extended from March 1 to March 15           │   │
│ │  ▸ Final project deadline extended to April 5, 2025                   │   │
│ │                                                                       │   │
│ │  All other terms remain the same.                                     │   │
│ │                                                                       │   │
│ │  ─────────────────────────────────────────────────────────────────   │   │
│ │                                                                       │   │
│ │  UPDATED TIMELINE                                                     │ ▲ │
│ │                                                                       │ █ │
│ │  Project Duration: 12 weeks (extended from 11 weeks)                  │ █ │
│ │  Weekly Check-ins: Tuesdays at 2:00 PM EST                            │ ▼ │
│ │  Final Deadline: April 5, 2025 (extended from March 30)               │   │
│ │                                                                       │   │
│ │  [Rest of terms document shown below, scrollable...]                  │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ I have reviewed the updated terms and agree to version 2          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│                    ┌────────────────────┐    ┌──────────────────┐          │
│                    │  Accept Terms  →   │    │ Request Changes  │          │
│                    └────────────────────┘    └──────────────────┘          │
│                                                                              │
│  Note: Your previous acceptance (version 1) is no longer valid.              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- Same as Screen 1
- Highlights changes at the top of modal
- Checkbox text includes version number

**User Actions:**
- Same as Screen 1 (accept or request more changes)

**API Call:**
```
GET /api/projects/:id/terms
→ Returns: { version: 2, status: 'pending_review', changesSummary: [...] }
```

---

## Admin Screens

### SCREEN 5: Admin Terms Editor & Management

**Purpose:** Allow admins to create, update, and manage project terms

**Route:** `portal.motionify.studio/admin/projects/:projectId/terms`
**Authentication:** Required (super_admin only)
**Trigger:** Admin clicks "Manage Terms" from project settings

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MOTIONIFY ADMIN                                    [Admin Name] ▾   Logout  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ← Back to Project                                                           │
│                                                                              │
│  PROJECT TERMS EDITOR                                                        │
│  Project: Brand Video Campaign Q1 2025                                       │
│  Client Primary Contact: Jane Doe (jane.doe@acmecorp.com)                   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  Current Status                                                       │   │
│ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│ │                                                                       │   │
│ │  Terms Version: 1                                                     │   │
│ │  Status: ⏳ Pending Review                                            │   │
│ │  Created: January 15, 2025 9:00 AM                                    │   │
│ │  Last Updated: January 15, 2025 9:00 AM                               │   │
│ │  Accepted: Not yet accepted                                           │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  📋 Change Requests (1 pending)                                       │   │
│ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│ │                                                                       │   │
│ │  ┌────────────────────────────────────────────────────────────────┐ │   │
│ │  │ ⚠️  Request #1 - January 15, 2025 2:15 PM                       │ │   │
│ │  │                                                                  │ │   │
│ │  │ From: Jane Doe (jane.doe@acmecorp.com)                          │ │   │
│ │  │                                                                  │ │   │
│ │  │ Requested Changes:                                               │ │   │
│ │  │ "I'd like to extend the timeline for Deliverable 2 by two       │ │   │
│ │  │  weeks due to upcoming holidays."                                │ │   │
│ │  │                                                                  │ │   │
│ │  │ Additional Context:                                              │ │   │
│ │  │ "Our team will be out of office December 24 - January 2."       │ │   │
│ │  │                                                                  │ │   │
│ │  │  [Mark as Resolved]    [Send Message to Client]                 │ │   │
│ │  └────────────────────────────────────────────────────────────────┘ │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  📝 Edit Terms                                                        │   │
│ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ ▲ │
│ │                                                                       │ █ │
│ │  Project Name                                                         │ █ │
│ │  ┌──────────────────────────────────────────────────────────────┐   │ █ │
│ ││  Brand Video Campaign Q1 2025                                    │   │ ▼ │
│ │  └──────────────────────────────────────────────────────────────┘   │   │
│ │                                                                       │   │
│ │  Project Scope - Inclusions                                           │   │
│ │  ┌──────────────────────────────────────────────────────────────┐   │   │
│ ││  • 3 promotional videos (30 seconds each)                        │   │   │
│ ││  • Professional voiceover recording                               │   │   │
│ ││  • Background music licensing                                     │   │   │
│ │  └──────────────────────────────────────────────────────────────┘   │   │
│ │                                                                       │   │
│ │  Project Scope - Exclusions                                           │   │
│ │  ┌──────────────────────────────────────────────────────────────┐   │   │
│ ││  • On-location filming (stock footage only)                      │   │   │
│ ││  • Multiple voiceover takes (1 revision included)                 │   │   │
│ │  └──────────────────────────────────────────────────────────────┘   │   │
│ │                                                                       │   │
│ │  [More editable fields for Deliverables, Timeline, Pricing...]       │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ⚠️  Warning: Updating terms will increment the version number and require   │
│     the client to re-accept before they can access the project.              │
│                                                                              │
│                    ┌────────────────────┐    ┌──────────────────┐          │
│                    │   Save Changes     │    │     Cancel       │          │
│                    └────────────────────┘    └──────────────────┘          │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │  📜 Version History                                                   │   │
│ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│ │                                                                       │   │
│ │  Version 1 - January 15, 2025 9:00 AM - Current                      │   │
│ │  Created by: Admin User                                               │   │
│ │  Status: Pending client acceptance                                    │   │
│ │  [View Version]                                                       │   │
│ │                                                                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Validation Rules:**
- All text fields support markdown
- Project name required (max 255 chars)
- At least one deliverable required
- Total revisions must be ≥ 0
- Pricing must be valid number

**User Actions:**
- **Edit any term field** → Enable "Save Changes" button
- **Click "Save Changes"** → Increment version, update terms, notify client
- **Click "Mark as Resolved"** → Mark change request as addressed
- **Click "Send Message to Client"** → Send email response without updating terms
- **Click "View Version"** → Show read-only view of previous version

**API Calls:**
```
GET /api/projects/:id/terms/revisions
→ Returns all change requests

PATCH /api/projects/:id/terms
{
  "projectName": "...",
  "scope": {...},
  "deliverables": [...],
  "revisionCount": 3,
  "timeline": {...},
  "pricing": {...}
}
→ Returns: { success: true, newVersion: 2, clientNotified: true }
```

---

## Design Notes

### Responsive Behavior

**Mobile (< 768px):**
- Terms modal becomes full-screen
- Font size slightly smaller (14px → 12px)
- Padding reduced for better content fit
- Scroll terms content independently
- Stack buttons vertically

**Tablet (768px - 1024px):**
- Modal width: 90% of screen
- Standard font sizes
- Side-by-side buttons maintained

**Desktop (> 1024px):**
- Modal width: 800px maximum
- Standard spacing and fonts
- Optimal reading experience

### Accessibility

- All form fields have associated labels
- Checkbox has proper ARIA labels
- Modal trap focus (cannot tab outside)
- Esc key disabled (blocking modal)
- Screen reader announces modal on open
- High contrast between text and background
- All interactive elements keyboard-navigable

### Loading States

- Show skeleton loader while fetching terms
- Disable buttons during API calls
- Show spinner on "Accept Terms" button during submission
- Gray out terms content during processing

### Error Handling

- **Network error:** "Unable to load terms. Please refresh the page."
- **Version conflict:** "Terms have been updated. Reloading latest version..."
- **Permission denied:** "Only the project primary contact can accept terms."
- **Already accepted:** Redirect to project dashboard (no modal shown)

### Animation & Transitions

- Modal fades in over 200ms
- Confirmation dialog slides down over 150ms
- Success toast slides in from top
- Terms content smooth scroll
- Button hover states (slight darken)

### Copy Guidelines

- Professional, friendly tone
- Active voice ("You must accept" not "Terms must be accepted")
- Clear calls-to-action
- Specific timelines ("within 24 hours" not "soon")
- Avoid legal jargon where possible
